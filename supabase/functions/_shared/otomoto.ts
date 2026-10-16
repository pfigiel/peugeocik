import type { Criteria, Offer } from "./types.ts";

const BASE = "https://www.otomoto.pl/osobowe";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const MAX_PAGES = 5;
const PAGE_DELAY_MS = 1200;

const FUEL_MAP: Record<string, string> = {
  petrol: "petrol",
  diesel: "diesel",
  hybrid: "hybrid",
  "petrol-lpg": "petrol-lpg",
  electric: "electric",
};
const GEARBOX_MAP: Record<string, string> = { manual: "manual", automatic: "automatic" };
const BODY_MAP: Record<string, string> = {
  "city-cars": "city-cars",
  compact: "compact",
  "small-cars": "small-cars",
  sedan: "sedan",
  "station-wagon": "station-wagon",
  suv: "suv",
  coupe: "coupe",
  minivan: "minivan",
  cabriolet: "cabriolet",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function citySlug(city: string): string {
  return city.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-");
}

function buildSearchUrl(criteria: Criteria, page: number): string {
  const path = [BASE, criteria.make, criteria.model, criteria.location?.city ? citySlug(criteria.location.city) : undefined]
    .filter(Boolean)
    .join("/");

  const params = new URLSearchParams();
  const set = (k: string, v: string | number | undefined) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  };

  set("search[filter_float_price:from]", criteria.priceMin);
  set("search[filter_float_price:to]", criteria.priceMax);
  set("search[filter_float_year:from]", criteria.yearMin);
  set("search[filter_float_year:to]", criteria.yearMax);
  set("search[filter_float_mileage:to]", criteria.mileageMax);
  set("search[filter_float_engine_capacity:from]", criteria.engineCapacityMin);
  set("search[filter_float_engine_power:from]", criteria.enginePowerMin);

  (criteria.fuelTypes ?? []).forEach((f, i) => FUEL_MAP[f] && set(`search[filter_enum_fuel_type][${i}]`, FUEL_MAP[f]));
  (criteria.gearbox ?? []).forEach((g, i) => GEARBOX_MAP[g] && set(`search[filter_enum_gearbox][${i}]`, GEARBOX_MAP[g]));
  (criteria.bodyTypes ?? []).forEach((b, i) => BODY_MAP[b] && set(`search[filter_enum_body_type][${i}]`, BODY_MAP[b]));

  if (criteria.excludeDamaged) set("search[filter_enum_damaged]", 0);
  if (criteria.registeredInPL) set("search[filter_enum_registered]", 1);
  if (criteria.location) set("search[dist]", criteria.location.radiusKm);
  if (page > 1) set("page", page);

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

interface RawParam { key: string; value: string }
interface RawNode {
  id: string;
  title: string;
  url: string;
  createdAt?: string | null;
  price?: { amount?: { value?: string; currencyCode?: string } };
  location?: { city?: { name?: string } };
  parameters?: RawParam[];
  thumbnail?: { x1?: string; x2?: string } | null;
}

function toInt(v: string | undefined): number | null {
  if (v === undefined) return null;
  const n = Number.parseInt(v.replace(/[^\d]/g, ""), 10);
  return Number.isNaN(n) ? null : n;
}

function nodeToOffer(n: RawNode): Offer {
  const params = n.parameters ?? [];
  const pv = (key: string) => params.find((p) => p.key === key)?.value;
  return {
    uid: `otomoto:${n.id}`,
    portal: "otomoto",
    portalOfferId: n.id,
    title: n.title,
    url: n.url,
    price: toInt(n.price?.amount?.value),
    currency: n.price?.amount?.currencyCode ?? null,
    year: toInt(pv("year")),
    mileageKm: toInt(pv("mileage")),
    fuelType: pv("fuel_type") ?? null,
    gearbox: pv("gearbox") ?? null,
    enginePowerHp: toInt(pv("engine_power")),
    engineCapacityCm3: toInt(pv("engine_capacity")),
    location: n.location?.city?.name ?? null,
    thumbnailUrl: n.thumbnail?.x2 ?? n.thumbnail?.x1 ?? null,
    createdAt: n.createdAt ?? null,
  };
}

interface ParsedPage { offers: Offer[]; totalCount: number; pageSize: number }

function parseListingHtml(html: string): ParsedPage {
  const i = html.indexOf('<script id="__NEXT_DATA__"');
  if (i === -1) throw new Error("otomoto: __NEXT_DATA__ not found (blocked or layout changed)");
  const start = html.indexOf(">", i) + 1;
  const end = html.indexOf("</script>", start);
  const data = JSON.parse(html.slice(start, end));

  const urql = data?.props?.pageProps?.urqlState ?? {};
  for (const key of Object.keys(urql)) {
    let payload = urql[key]?.data;
    if (typeof payload === "string") {
      try { payload = JSON.parse(payload); } catch { continue; }
    }
    const search = payload?.advertSearch;
    if (!search?.edges) continue;
    const offers = (search.edges as { node: RawNode }[]).map((e) => e.node).filter((n) => n?.id).map(nodeToOffer);
    return { offers, totalCount: search.totalCount ?? offers.length, pageSize: search.pageInfo?.pageSize ?? offers.length };
  }
  throw new Error("otomoto: advertSearch not found in __NEXT_DATA__");
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.8", Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`otomoto: HTTP ${res.status} for ${url}`);
  return res.text();
}

/** Scrape otomoto for offers matching criteria (paginated, capped, polite). */
export async function searchOtomoto(criteria: Criteria): Promise<Offer[]> {
  const all: Offer[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const html = await fetchHtml(buildSearchUrl(criteria, page));
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
