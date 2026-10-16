import type { Criteria, Offer } from "./types.ts";

const API = "https://www.olx.pl/api/v1/offers/";
const CARS_CATEGORY = 199;
const LIMIT = 40;
const MAX_PAGES = 5;
const PAGE_DELAY_MS = 800;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Our normalized fuel -> OLX enum values (several OLX values can map to one of ours).
const FUEL_TO_OLX: Record<string, string[]> = {
  petrol: ["petrol"],
  diesel: ["diesel"],
  hybrid: ["hybrid", "plugin-hybrid"],
  "petrol-lpg": ["lpg"],
  electric: ["electric"],
};
// OLX fuel value -> our normalized value (so the matcher works cross-portal).
const OLX_FUEL_NORMALIZE: Record<string, string> = {
  petrol: "petrol",
  diesel: "diesel",
  hybrid: "hybrid",
  "plugin-hybrid": "hybrid",
  lpg: "petrol-lpg",
  electric: "electric",
};
const GEARBOX_TO_OLX: Record<string, string> = { manual: "manual", automatic: "automatic" };
// Our body slugs (otomoto-flavoured) -> OLX car_body values.
const BODY_TO_OLX: Record<string, string> = {
  "city-cars": "hatchback",
  "small-cars": "hatchback",
  compact: "hatchback",
  sedan: "sedan",
  "station-wagon": "estate-car",
  suv: "suv",
  coupe: "coupe",
  minivan: "mvp",
};
// City name -> OLX city_id (for location + distance). Extend as needed.
const CITY_IDS: Record<string, number> = { gliwice: 6091 };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function citySlug(city: string): string {
  return city.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function buildParams(criteria: Criteria, offset: number): URLSearchParams {
  const p = new URLSearchParams();
  p.set("category_id", String(CARS_CATEGORY));
  p.set("limit", String(LIMIT));
  p.set("offset", String(offset));

  const q = [criteria.make, criteria.model].filter(Boolean).join(" ").trim();
  if (q) p.set("query", q);

  const setNum = (k: string, v: number | undefined) => v !== undefined && p.set(k, String(v));
  setNum("filter_float_price:from", criteria.priceMin);
  setNum("filter_float_price:to", criteria.priceMax);
  setNum("filter_float_year:from", criteria.yearMin);
  setNum("filter_float_year:to", criteria.yearMax);
  setNum("filter_float_milage:to", criteria.mileageMax);
  setNum("filter_float_enginesize:from", criteria.engineCapacityMin);
  setNum("filter_float_enginepower:from", criteria.enginePowerMin);

  const addEnum = (name: string, values: string[]) =>
    values.forEach((v, i) => p.set(`filter_enum_${name}[${i}]`, v));

  const fuels = [...new Set((criteria.fuelTypes ?? []).flatMap((f) => FUEL_TO_OLX[f] ?? []))];
  if (fuels.length) addEnum("petrol", fuels);

  const gears = (criteria.gearbox ?? []).map((g) => GEARBOX_TO_OLX[g]).filter(Boolean);
  if (gears.length) addEnum("transmission", gears);

  const bodies = [...new Set((criteria.bodyTypes ?? []).map((b) => BODY_TO_OLX[b]).filter(Boolean))];
  if (bodies.length) addEnum("car_body", bodies);

  if (criteria.excludeDamaged) addEnum("condition", ["notdamaged"]);

  if (criteria.location) {
    const id = CITY_IDS[citySlug(criteria.location.city)];
    if (id) {
      p.set("city_id", String(id));
      p.set("distance", String(criteria.location.radiusKm));
    }
  }
  return p;
}

interface RawOlxParam { key: string; value?: { key?: string; value?: unknown; currency?: string } | string | number }
interface RawOlxOffer {
  id: number | string;
  url: string;
  title: string;
  created_time?: string;
  params?: RawOlxParam[];
  location?: { city?: { name?: string } };
  photos?: { link?: string }[];
}

function toInt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number.parseInt(String(v).replace(/[^\d]/g, ""), 10);
  return Number.isNaN(n) ? null : n;
}

function offerFromOlx(o: RawOlxOffer): Offer {
  const params = o.params ?? [];
  const find = (k: string) => params.find((p) => p.key === k);
  const strVal = (k: string): string | null => {
    const p = find(k);
    if (!p) return null;
    const v = p.value;
    if (v && typeof v === "object") return (v.key ?? (v.value as string) ?? null) as string | null;
    return (v as string) ?? null;
  };
  const priceP = find("price")?.value as { value?: number; currency?: string } | undefined;
  const rawFuel = strVal("petrol"); // OLX keys the fuel param "petrol"; its value is the fuel
  const photo = o.photos?.[0]?.link
    ? o.photos[0].link!.replace("{width}", "640").replace("{height}", "480")
    : null;

  return {
    uid: `olx:${o.id}`,
    portal: "olx",
    portalOfferId: String(o.id),
    title: o.title,
    url: o.url,
    price: typeof priceP?.value === "number" ? priceP.value : toInt(priceP?.value),
    currency: priceP?.currency ?? "PLN",
    year: toInt(strVal("year")),
    mileageKm: toInt(strVal("milage")),
    fuelType: rawFuel ? (OLX_FUEL_NORMALIZE[rawFuel] ?? rawFuel) : null,
    gearbox: strVal("transmission"),
    enginePowerHp: toInt(strVal("enginepower")),
    engineCapacityCm3: toInt(strVal("enginesize")),
    location: o.location?.city?.name ?? null,
    thumbnailUrl: photo,
    createdAt: o.created_time ?? null,
  };
}

/** Scrape OLX for offers matching criteria via its public JSON API. */
export async function searchOlx(criteria: Criteria): Promise<Offer[]> {
  const all: Offer[] = [];
  const seen = new Set<string>();

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = buildParams(criteria, page * LIMIT);
    const res = await fetch(`${API}?${params.toString()}`, {
      headers: { "User-Agent": UA, Accept: "application/json", "Accept-Language": "pl-PL,pl;q=0.9" },
    });
    if (!res.ok) throw new Error(`olx: HTTP ${res.status} (blocked or bad request)`);
    const data = await res.json();
    const offers = (data.data ?? []) as RawOlxOffer[];
    if (offers.length === 0) break;

    for (const raw of offers) {
      const o = offerFromOlx(raw);
      if (seen.has(o.uid)) continue;
      seen.add(o.uid);
      all.push(o);
    }

    const total = data.metadata?.total_elements ?? 0;
    if ((page + 1) * LIMIT >= total) break;
    await sleep(PAGE_DELAY_MS);
  }
  return all;
}
