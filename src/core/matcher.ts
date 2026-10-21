import type { Criteria, Offer } from "./types.js";

/** Lowercase, strip accents, split on anything non-alphanumeric. */
function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** True if `needle` appears as a consecutive run of whole words in `hay`. */
function containsRun(hay: string[], needle: string[]): boolean {
  for (let i = 0; i + needle.length <= hay.length; i++) {
    if (needle.every((t, j) => hay[i + j] === t)) return true;
  }
  return false;
}

/** Make/model check. Prefer the portal's structured slug (exact match);
 *  otherwise fall back to whole-word match against the title. */
function nameMatches(want: string | undefined, structured: string | null | undefined, title: string): boolean {
  const w = tokens(want ?? "");
  if (w.length === 0) return true;
  if (structured) return tokens(structured).join("-") === w.join("-");
  return containsRun(tokens(title), w);
}

/** Authoritative client-side filter. Portals may return a superset (or ignore
 *  filters they don't support); this decides what actually matches. A null
 *  field on the offer means "unknown" and fails any criterion that constrains
 *  that field, to avoid notifying on offers we can't verify. */
export function matches(offer: Offer, c: Criteria): boolean {
  if (!nameMatches(c.make, offer.make, offer.title)) return false;
  if (!nameMatches(c.model, offer.model, offer.title)) return false;

  if (c.priceMax !== undefined && (offer.price === null || offer.price > c.priceMax)) return false;
  if (c.priceMin !== undefined && (offer.price === null || offer.price < c.priceMin)) return false;

  if (c.yearMax !== undefined && (offer.year === null || offer.year > c.yearMax)) return false;
  if (c.yearMin !== undefined && (offer.year === null || offer.year < c.yearMin)) return false;

  if (c.mileageMax !== undefined && (offer.mileageKm === null || offer.mileageKm > c.mileageMax)) return false;

  if (c.engineCapacityMin !== undefined && (offer.engineCapacityCm3 === null || offer.engineCapacityCm3 < c.engineCapacityMin)) return false;
  if (c.enginePowerMin !== undefined && (offer.enginePowerHp === null || offer.enginePowerHp < c.enginePowerMin)) return false;

  if (c.fuelTypes?.length) {
    if (!offer.fuelType || !c.fuelTypes.includes(offer.fuelType)) return false;
  }
  if (c.gearbox?.length) {
    if (!offer.gearbox || !c.gearbox.includes(offer.gearbox)) return false;
  }

  return true;
}

export function filterOffers(offers: Offer[], c: Criteria): Offer[] {
  return offers.filter((o) => matches(o, c));
}
