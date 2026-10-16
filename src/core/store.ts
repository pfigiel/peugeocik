import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { Offer } from "./types.js";

/** A persisted match: the offer plus when/where we first saw it. */
export interface MatchRecord {
  offer: Offer;
  searchName: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

/** Persists full match records keyed by offer uid, so each offer notifies once
 *  and the web UI can list everything found. JSON-file backed for the PoC; swap
 *  for SQLite later behind this same API. */
export class MatchStore {
  private records = new Map<string, MatchRecord>();

  constructor(private readonly path: string) {}

  async load(): Promise<void> {
    try {
      const txt = await readFile(this.path, "utf8");
      const arr = JSON.parse(txt) as MatchRecord[];
      this.records = new Map(arr.map((r) => [r.offer.uid, r]));
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      this.records = new Map();
    }
  }

  has(uid: string): boolean {
    return this.records.has(uid);
  }

  /** Record a newly found offer. */
  add(offer: Offer, searchName: string): void {
    const now = new Date().toISOString();
    this.records.set(offer.uid, {
      offer,
      searchName,
      firstSeenAt: now,
      lastSeenAt: now,
    });
  }

  /** Mark an already-known offer as seen again in this pass. */
  touch(uid: string): void {
    const r = this.records.get(uid);
    if (r) r.lastSeenAt = new Date().toISOString();
  }

  getAll(): MatchRecord[] {
    return [...this.records.values()];
  }

  async save(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(this.getAll(), null, 2), "utf8");
  }
}
