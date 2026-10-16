import type { Config } from "../config/schema.js";
import type { Portal } from "../portals/portal.js";
import type { Notifier } from "../notifiers/notifier.js";
import { filterOffers } from "./matcher.js";
import { MatchStore } from "./store.js";

/** Per-(search, portal) outcome of a scan pass. */
export interface ScanResult {
  searchName: string;
  portal: string;
  scraped: number;
  matched: number;
  new: number;
  error?: string;
}

/** Orchestrates one monitoring pass: for each search, scrape its portals,
 *  filter by criteria, drop already-seen offers, notify on the rest. */
export class Monitor {
  constructor(
    private readonly config: Config,
    private readonly portals: Map<string, Portal>,
    private readonly notifiers: Notifier[],
    private readonly store: MatchStore,
  ) {}

  async runOnce(): Promise<ScanResult[]> {
    const results: ScanResult[] = [];

    for (const search of this.config.searches) {
      for (const portalName of search.portals) {
        const portal = this.portals.get(portalName);
        if (!portal) {
          console.warn(`[${search.name}] unknown portal "${portalName}", skipping`);
          results.push({ searchName: search.name, portal: portalName, scraped: 0, matched: 0, new: 0, error: "nieznany portal" });
          continue;
        }

        let offers;
        try {
          offers = await portal.search(search.criteria);
        } catch (err) {
          const msg = (err as Error).message;
          console.error(`[${search.name}] ${portalName} scrape failed:`, msg);
          results.push({ searchName: search.name, portal: portalName, scraped: 0, matched: 0, new: 0, error: msg });
          continue;
        }

        const matched = filterOffers(offers, search.criteria);
        const fresh = matched.filter((o) => !this.store.has(o.uid));

        console.log(
          `[${search.name}] ${portalName}: ${offers.length} scraped, ` +
            `${matched.length} match, ${fresh.length} new`,
        );
        results.push({
          searchName: search.name,
          portal: portalName,
          scraped: offers.length,
          matched: matched.length,
          new: fresh.length,
        });

        // Refresh lastSeen for matches we already knew about.
        for (const o of matched) this.store.touch(o.uid);

        if (fresh.length > 0) {
          for (const n of this.notifiers) {
            try {
              await n.notify(fresh, { searchName: search.name });
            } catch (err) {
              console.error(`notifier ${n.type} failed:`, (err as Error).message);
            }
          }
          // Record only after notifying, so a notifier crash retries next pass.
          for (const o of fresh) this.store.add(o, search.name);
        }

        await this.store.save();
      }
    }

    return results;
  }
}
