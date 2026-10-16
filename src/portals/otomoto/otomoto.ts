import type { Criteria, Offer } from "../../core/types.js";
import type { Portal } from "../portal.js";
import { parseListingHtml } from "./parse.js";
import { buildSearchUrl } from "./url.js";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Safety cap so a broad search can't crawl hundreds of pages. */
const MAX_PAGES = 5;
/** Politeness delay between page requests, ms. */
const PAGE_DELAY_MS = 1500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class OtomotoPortal implements Portal {
  readonly name = "otomoto";

  async search(criteria: Criteria): Promise<Offer[]> {
    const all: Offer[] = [];
    const seen = new Set<string>();

    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = buildSearchUrl(criteria, page);
      const html = await this.fetchHtml(url);
      const { offers, totalCount, pageSize } = parseListingHtml(html);

      if (offers.length === 0) break;
      for (const o of offers) {
        if (seen.has(o.uid)) continue;
        seen.add(o.uid);
        all.push(o);
      }

      const pages = Math.ceil(totalCount / Math.max(pageSize, 1));
      if (page >= pages) break;
      await sleep(PAGE_DELAY_MS);
    }

    return all;
  }

  private async fetchHtml(url: string): Promise<string> {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) {
      throw new Error(`otomoto: HTTP ${res.status} for ${url}`);
    }
    return res.text();
  }
}
