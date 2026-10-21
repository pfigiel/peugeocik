import type { Offer } from "../../core/types.js";

interface RawParam {
  key: string;
  value: string;
  displayValue?: string;
}

interface RawNode {
  id: string;
  title: string;
  url: string;
  createdAt?: string | null;
  price?: { amount?: { value?: string; currencyCode?: string } };
  location?: { city?: { name?: string }; region?: { name?: string } };
  parameters?: RawParam[];
  thumbnail?: { x1?: string; x2?: string } | null;
}

export interface ParsedPage {
  offers: Offer[];
  totalCount: number;
  pageSize: number;
}

function toInt(v: string | undefined): number | null {
  if (v === undefined) return null;
  const n = Number.parseInt(v.replace(/[^\d]/g, ""), 10);
  return Number.isNaN(n) ? null : n;
}

/** otomoto fuel value -> our normalized value (same folding as OLX). */
const FUEL_NORMALIZE: Record<string, string> = { "plugin-hybrid": "hybrid" };

function normalizeFuel(v: string | undefined): string | null {
  return v ? (FUEL_NORMALIZE[v] ?? v) : null;
}

function paramValue(params: RawParam[], key: string): string | undefined {
  return params.find((p) => p.key === key)?.value;
}

function nodeToOffer(n: RawNode): Offer {
  const params = n.parameters ?? [];
  const price = n.price?.amount?.value;
  return {
    uid: `otomoto:${n.id}`,
    portal: "otomoto",
    portalOfferId: n.id,
    title: n.title,
    url: n.url,
    price: toInt(price),
    currency: n.price?.amount?.currencyCode ?? null,
    year: toInt(paramValue(params, "year")),
    mileageKm: toInt(paramValue(params, "mileage")),
    fuelType: normalizeFuel(paramValue(params, "fuel_type")),
    gearbox: paramValue(params, "gearbox") ?? null,
    enginePowerHp: toInt(paramValue(params, "engine_power")),
    engineCapacityCm3: toInt(paramValue(params, "engine_capacity")),
    make: paramValue(params, "make") ?? null,
    model: paramValue(params, "model") ?? null,
    location: n.location?.city?.name ?? null,
    thumbnailUrl: n.thumbnail?.x2 ?? n.thumbnail?.x1 ?? null,
    createdAt: n.createdAt ?? null,
    raw: n,
  };
}

/**
 * Extract offers from an otomoto listing page HTML.
 * Offers are embedded server-side in the Next.js `__NEXT_DATA__` script as a
 * urql GraphQL cache; `advertSearch.edges[].node` holds each listing.
 */
export function parseListingHtml(html: string): ParsedPage {
  const marker = '<script id="__NEXT_DATA__"';
  const i = html.indexOf(marker);
  if (i === -1) throw new Error("otomoto: __NEXT_DATA__ not found in page");
  const start = html.indexOf(">", i) + 1;
  const end = html.indexOf("</script>", start);
  const data = JSON.parse(html.slice(start, end));

  const urql = data?.props?.pageProps?.urqlState ?? {};
  for (const key of Object.keys(urql)) {
    let payload = urql[key]?.data;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        continue;
      }
    }
    const search = payload?.advertSearch;
    if (!search?.edges) continue;
    const offers = (search.edges as { node: RawNode }[])
      .map((e) => e.node)
      .filter((n) => n && n.id)
      .map(nodeToOffer);
    return {
      offers,
      totalCount: search.totalCount ?? offers.length,
      pageSize: search.pageInfo?.pageSize ?? offers.length,
    };
  }
  throw new Error("otomoto: advertSearch not found in __NEXT_DATA__");
}
