import type { Criteria, Offer } from "../core/types.js";

/** A source of car offers. Add a new portal by implementing this and
 *  registering it in ./registry.ts. */
export interface Portal {
  /** Stable key used in config `portals: [...]`. */
  readonly name: string;
  /** Fetch offers matching criteria. Should push what filters it can to the
   *  remote query; returning a superset is fine — the matcher filters again. */
  search(criteria: Criteria): Promise<Offer[]>;
}
