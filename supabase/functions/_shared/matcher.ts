import type { Criteria, Offer } from "./types.ts";

/** Authoritative client-side filter (mirrors the Node core matcher). A null
 *  field means "unknown" and fails any criterion constraining that field. */
export function matches(offer: Offer, c: Criteria): boolean {
  if (c.priceMax !== undefined && (offer.price === null || offer.price > c.priceMax)) return false;
  if (c.priceMin !== undefined && (offer.price === null || offer.price < c.priceMin)) return false;
  if (c.yearMax !== undefined && (offer.year === null || offer.year > c.yearMax)) return false;
  if (c.yearMin !== undefined && (offer.year === null || offer.year < c.yearMin)) return false;
  if (c.mileageMax !== undefined && (offer.mileageKm === null || offer.mileageKm > c.mileageMax)) return false;
  if (c.engineCapacityMin !== undefined && (offer.engineCapacityCm3 === null || offer.engineCapacityCm3 < c.engineCapacityMin)) return false;
  if (c.enginePowerMin !== undefined && (offer.enginePowerHp === null || offer.enginePowerHp < c.enginePowerMin)) return false;
  if (c.fuelTypes?.length && (!offer.fuelType || !c.fuelTypes.includes(offer.fuelType))) return false;
  if (c.gearbox?.length && (!offer.gearbox || !c.gearbox.includes(offer.gearbox))) return false;
  return true;
}

export function filterOffers(offers: Offer[], c: Criteria): Offer[] {
  return offers.filter((o) => matches(o, c));
}
