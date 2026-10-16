import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { loadConfig } from "../config/load.js";
import { saveConfig } from "../config/save.js";
import type { Config } from "../config/schema.js";
import { matches } from "../core/matcher.js";
import { Monitor, type ScanResult } from "../core/monitor.js";
import { MatchStore } from "../core/store.js";
import { BODY_TYPE_OPTIONS, FUEL_OPTIONS, GEARBOX_OPTIONS } from "../core/options.js";
import { buildNotifiers } from "../notifiers/registry.js";
import { buildPortals } from "../portals/registry.js";
import type { Portal } from "../portals/portal.js";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

interface AppState {
  config: Config;
  store: MatchStore;
  portals: Map<string, Portal>;
  scanning: boolean;
}

function send(res: http.ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(json);
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function runScan(state: AppState): Promise<ScanResult[]> {
  const notifiers = buildNotifiers(state.config.notifiers);
  const monitor = new Monitor(state.config, state.portals, notifiers, state.store);
  return monitor.runOnce();
}

/** Serve a file from the built frontend (web/dist), SPA-fallback to index.html. */
async function serveStatic(res: http.ServerResponse, webDir: string, urlPath: string): Promise<void> {
  const rel = normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = join(webDir, rel === "/" ? "index.html" : rel);
  try {
    if ((await stat(filePath)).isDirectory()) filePath = join(filePath, "index.html");
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    try {
      const data = await readFile(join(webDir, "index.html"));
      res.writeHead(200, { "Content-Type": MIME[".html"] });
      res.end(data);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found. Build the frontend (web/) or use the Vite dev server.");
    }
  }
}

export async function createApp(configPath: string, webDir: string): Promise<http.Server> {
  const config = await loadConfig(configPath);
  const store = new MatchStore(config.matchStorePath);
  await store.load();
  const state: AppState = { config, store, portals: buildPortals(), scanning: false };

  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;
    const method = req.method ?? "GET";

    try {
      if (path === "/api/meta" && method === "GET") {
        return send(res, 200, {
          fuelTypes: FUEL_OPTIONS,
          gearbox: GEARBOX_OPTIONS,
          bodyTypes: BODY_TYPE_OPTIONS,
          portals: [...state.portals.keys()],
        });
      }

      if (path === "/api/config" && method === "GET") {
        return send(res, 200, state.config);
      }

      if (path === "/api/config" && method === "PUT") {
        const body = await readBody(req);
        try {
          const saved = await saveConfig(configPath, body);
          const storePathChanged = saved.matchStorePath !== state.config.matchStorePath;
          state.config = saved;
          if (storePathChanged) {
            state.store = new MatchStore(saved.matchStorePath);
            await state.store.load();
          }
          return send(res, 200, saved);
        } catch (err) {
          return send(res, 400, { error: (err as Error).message, details: (err as Error & { details?: unknown }).details });
        }
      }

      if (path === "/api/matches" && method === "GET") {
        // Hide stored matches no current search accepts; keep them in the store so
        // a later scan still treats them as seen and won't re-notify.
        const visible = state.store.getAll().filter((r) =>
          state.config.searches.some((s) => s.portals.includes(r.offer.portal) && matches(r.offer, s.criteria)),
        );
        return send(res, 200, visible);
      }

      if (path === "/api/scan" && method === "POST") {
        if (state.scanning) return send(res, 409, { error: "Skanowanie już trwa" });
        state.scanning = true;
        try {
          const results = await runScan(state);
          return send(res, 200, { results, matches: state.store.getAll().length });
        } finally {
          state.scanning = false;
        }
      }

      if (path.startsWith("/api/")) {
        return send(res, 404, { error: "Nieznany endpoint" });
      }

      // Everything else: static frontend.
      return serveStatic(res, webDir, path);
    } catch (err) {
      return send(res, 500, { error: (err as Error).message });
    }
  });
}
