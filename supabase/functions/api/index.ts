import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { configSchema } from "../_shared/schema.ts";
import { filterOffers, matches } from "../_shared/matcher.ts";
import { searchOtomoto } from "../_shared/otomoto.ts";
import { searchOlx } from "../_shared/olx.ts";
import { type NewOffersBySearch, sendNewOffersEmail } from "../_shared/email.ts";
import { BODY_TYPE_OPTIONS, FUEL_OPTIONS, GEARBOX_OPTIONS } from "../_shared/options.ts";
import type { Config, Criteria, Offer, ScanResult } from "../_shared/types.ts";

/** Registered portals. Add a provider by implementing its search() and listing it here. */
const PORTALS: Record<string, (c: Criteria) => Promise<Offer[]>> = {
  otomoto: searchOtomoto,
  olx: searchOlx,
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

/** Resolve the logged-in Supabase user from the request's bearer token, or null
 *  (the anon key is a valid JWT but carries no user). */
async function getUser(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user ?? null;
}

async function readConfig(db: SupabaseClient): Promise<Config> {
  const { data, error } = await db.from("app_config").select("config").eq("id", 1).single();
  if (error) throw new Error(error.message);
  return data.config as Config;
}

/** True if the offer satisfies at least one current search. Stored matches that
 *  no longer do stay in the DB (so a later scan won't re-notify), just hidden. */
function matchesConfig(offer: Offer, config: Config): boolean {
  return config.searches.some((s) => s.portals.includes(offer.portal) && matches(offer, s.criteria));
}

/** Insert freshly-seen offers and bump last_seen_at on known ones.
 *  `notify` decides whether fresh rows are emailable: a cron scan (notify=true)
 *  inserts them with notified_at=null so the cron picks them up and emails them;
 *  a manual / criteria-change scan (notify=false) stamps notified_at=now on
 *  insert, so those offers refresh the view but are never emailed. */
async function persistMatches(
  db: SupabaseClient,
  offers: Offer[],
  searchName: string,
  notify: boolean,
): Promise<Offer[]> {
  if (offers.length === 0) return [];
  const uids = offers.map((o) => o.uid);
  const { data: existing } = await db.from("matches").select("uid").in("uid", uids);
  const known = new Set((existing ?? []).map((r) => r.uid as string));

  const now = new Date().toISOString();
  const fresh = offers.filter((o) => !known.has(o.uid));

  if (fresh.length > 0) {
    const rows = fresh.map((offer) => ({
      uid: offer.uid,
      portal: offer.portal,
      search_name: searchName,
      offer,
      first_seen_at: now,
      last_seen_at: now,
      notified_at: notify ? null : now,
    }));
    const { error } = await db.from("matches").insert(rows);
    if (error) throw new Error(error.message);
  }
  const knownUids = uids.filter((u) => known.has(u));
  if (knownUids.length > 0) {
    await db.from("matches").update({ last_seen_at: now }).in("uid", knownUids);
  }
  return fresh;
}

/** Email every pending (notified_at IS NULL) match that still fits the current
 *  criteria and isn't archived, then stamp them notified_at=now. Only the cron
 *  scan calls this, so manual/criteria-change scans never trigger emails. A
 *  failed send leaves notified_at NULL, so the next cron retries it. */
async function notifyPending(db: SupabaseClient, config: Config): Promise<void> {
  const { data, error } = await db
    .from("matches")
    .select("uid, search_name, offer")
    .is("notified_at", null)
    .eq("archived", false);
  if (error) throw new Error(error.message);

  const pending = (data ?? []).filter((r) => matchesConfig(r.offer as Offer, config));
  if (pending.length === 0) return;

  const bySearch: NewOffersBySearch = new Map();
  for (const r of pending) {
    bySearch.set(r.search_name, [...(bySearch.get(r.search_name) ?? []), r.offer as Offer]);
  }
  await sendNewOffersEmail(bySearch);

  const now = new Date().toISOString();
  const uids = pending.map((r) => r.uid as string);
  const { error: updErr } = await db.from("matches").update({ notified_at: now }).in("uid", uids);
  if (updErr) throw new Error(updErr.message);
}

/** Scan all searches and persist matches. When `notify` (cron only), emails the
 *  pending matches afterwards; manual/criteria-change scans pass notify=false. */
async function runScan(db: SupabaseClient, notify: boolean): Promise<ScanResult[]> {
  const config = await readConfig(db);
  const results: ScanResult[] = [];
  for (const search of config.searches) {
    for (const portal of search.portals) {
      const searchFn = PORTALS[portal];
      if (!searchFn) {
        results.push({ searchName: search.name, portal, scraped: 0, matched: 0, new: 0, error: "nieznany portal" });
        continue;
      }
      try {
        const offers = await searchFn(search.criteria);
        const matched = filterOffers(offers, search.criteria);
        const added = await persistMatches(db, matched, search.name, notify);
        results.push({ searchName: search.name, portal, scraped: offers.length, matched: matched.length, new: added.length });
      } catch (err) {
        results.push({ searchName: search.name, portal, scraped: 0, matched: 0, new: 0, error: (err as Error).message });
      }
    }
  }
  // Offers are already persisted, so a failed send is logged, not retried here.
  if (notify) {
    try {
      await notifyPending(db, config);
    } catch (err) {
      console.error("email notify failed:", (err as Error).message);
    }
  }
  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const path = new URL(req.url).pathname.replace(/^\/api/, "") || "/";
  const method = req.method;
  const cron = req.headers.get("x-cron-secret");
  const isCron = CRON_SECRET !== "" && cron === CRON_SECRET;

  try {
    if (path === "/meta" && method === "GET") {
      return json(200, {
        fuelTypes: FUEL_OPTIONS,
        gearbox: GEARBOX_OPTIONS,
        bodyTypes: BODY_TYPE_OPTIONS,
        portals: Object.keys(PORTALS),
      });
    }

    // Cron may trigger a scan without a user, using the shared secret.
    if (path === "/scan" && method === "POST" && isCron) {
      const config = await readConfig(admin);
      if (config.paused) return json(200, { results: [], paused: true });
      return json(200, { results: await runScan(admin, true) });
    }

    // Everything else requires a logged-in friend.
    const user = await getUser(req);
    if (!user) return json(401, { error: "Brak autoryzacji — zaloguj się ponownie" });

    if (path === "/config" && method === "GET") {
      return json(200, await readConfig(admin));
    }

    if (path === "/config" && method === "PUT") {
      const body = await req.json().catch(() => ({}));
      const parsed = configSchema.safeParse(body);
      if (!parsed.success) return json(400, { error: "Nieprawidłowa konfiguracja", details: parsed.error.format() });
      const { error } = await admin
        .from("app_config")
        .upsert({ id: 1, config: parsed.data, updated_at: new Date().toISOString() });
      if (error) return json(500, { error: error.message });
      return json(200, parsed.data);
    }

    if (path === "/matches" && method === "GET") {
      const config = await readConfig(admin);
      const { data, error } = await admin
        .from("matches")
        .select("offer, search_name, first_seen_at, last_seen_at, archived")
        .order("first_seen_at", { ascending: false });
      if (error) return json(500, { error: error.message });
      const records = (data ?? []).filter((r) => matchesConfig(r.offer as Offer, config)).map((r) => ({
        offer: r.offer,
        searchName: r.search_name,
        firstSeenAt: r.first_seen_at,
        lastSeenAt: r.last_seen_at,
        archived: r.archived ?? false,
      }));
      return json(200, records);
    }

    // Wipe every stored match. Used on a criteria change so the next scan
    // repopulates from a clean slate instead of carrying stale offers.
    if (path === "/matches" && method === "DELETE") {
      const { error } = await admin.from("matches").delete().not("uid", "is", null);
      if (error) return json(500, { error: error.message });
      return json(200, { ok: true });
    }

    if (path === "/archive" && method === "POST") {
      const body = await req.json().catch(() => ({})) as { uid?: string; archived?: boolean };
      if (!body.uid || typeof body.archived !== "boolean") return json(400, { error: "Wymagane pola uid i archived" });
      const { error } = await admin.from("matches").update({ archived: body.archived }).eq("uid", body.uid);
      if (error) return json(500, { error: error.message });
      return json(200, { uid: body.uid, archived: body.archived });
    }

    // Manual scan from the app: refresh matches without sending emails.
    if (path === "/scan" && method === "POST") {
      return json(200, { results: await runScan(admin, false) });
    }

    return json(404, { error: "Nieznany endpoint" });
  } catch (err) {
    return json(500, { error: (err as Error).message });
  }
});
