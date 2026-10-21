import { supabase } from "./supabase";
import type { Config, MatchRecord, Meta, ScanResult } from "./types";

const BASE = import.meta.env.VITE_API_BASE;

/** Fetch against the edge function with the current user's JWT attached. */
async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  }).catch(() => {
    throw new Error("Nie udało się połączyć z serwerem");
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Stale/invalid session: the backend rejected our token. Clear local auth
    // so the SIGNED_OUT listener drops the app to the login screen instead of
    // bricking on the dead session. We also hard-remove the persisted token so
    // a subsequent getSession() can't resurrect the expired session.
    if (res.status === 401) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      try {
        for (const k of Object.keys(localStorage)) {
          if (k.startsWith("sb-") && k.endsWith("-auth-token")) localStorage.removeItem(k);
        }
      } catch { /* storage unavailable */ }
      // Don't rely on supabase emitting SIGNED_OUT: tell the app root directly.
      window.dispatchEvent(new Event("peugeocik:signout"));
    }
    throw new Error(body.error ?? `Błąd serwera (HTTP ${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getMeta: () => call<Meta>("/meta"),
  getConfig: () => call<Config>("/config"),
  saveConfig: (config: Config) => call<Config>("/config", { method: "PUT", body: JSON.stringify(config) }),
  getMatches: () => call<MatchRecord[]>("/matches"),
  resetMatches: () => call<{ ok: boolean }>("/matches", { method: "DELETE" }),
  scan: () => call<{ results: ScanResult[] }>("/scan", { method: "POST" }),
  archive: (uid: string, archived: boolean) =>
    call<{ uid: string; archived: boolean }>("/archive", { method: "POST", body: JSON.stringify({ uid, archived }) }),
};
