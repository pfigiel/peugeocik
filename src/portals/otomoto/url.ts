import type { Criteria } from "../../core/types.js";

const BASE = "https://www.otomoto.pl/osobowe";

/** Map our normalized fuel values to otomoto enum values. */
const FUEL_MAP: Record<string, string> = {
  petrol: "petrol",
  diesel: "diesel",
  hybrid: "hybrid",
  "petrol-lpg": "petrol-lpg",
  electric: "electric",
};

/** Map our normalized gearbox values to otomoto enum values. */
const GEARBOX_MAP: Record<string, string> = {
  manual: "manual",
  automatic: "automatic",
};

/** Map our normalized body types to otomoto enum values. */
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

/** Slugify for the otomoto path: "Alfa Romeo" -> "alfa-romeo", "Łódź" -> "lodz". */
function slug(s: string | undefined): string | undefined {
  const out = s
    ?.trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return out || undefined;
}

/**
 * Build an otomoto listing URL for the given criteria + page.
 * make/model/city go into the path; ranges/enums into the search querystring.
 * Unknown/missing fields are simply omitted (otomoto returns a superset).
 */
export function buildSearchUrl(criteria: Criteria, page: number): string {
  // Path: /osobowe[/make[/model]][/city]
  const path = [
    BASE,
    slug(criteria.make),
    slug(criteria.model),
    slug(criteria.location?.city),
  ]
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

  // Enum multi-filters use indexed keys on otomoto.
  (criteria.fuelTypes ?? []).forEach((f, i) => {
    const mapped = FUEL_MAP[f];
    if (mapped) set(`search[filter_enum_fuel_type][${i}]`, mapped);
  });
  (criteria.gearbox ?? []).forEach((g, i) => {
    const mapped = GEARBOX_MAP[g];
    if (mapped) set(`search[filter_enum_gearbox][${i}]`, mapped);
  });
  (criteria.bodyTypes ?? []).forEach((b, i) => {
    const mapped = BODY_MAP[b];
    if (mapped) set(`search[filter_enum_body_type][${i}]`, mapped);
  });

  if (criteria.excludeDamaged) set("search[filter_enum_damaged]", 0);
  if (criteria.registeredInPL) set("search[filter_enum_registered]", 1);
  if (criteria.location) set("search[dist]", criteria.location.radiusKm);

  if (page > 1) set("page", page);

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
