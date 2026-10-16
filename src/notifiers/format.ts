import type { Offer } from "../core/types.js";

/** Single-line human summary of an offer, shared by console + logfile. */
export function formatOffer(o: Offer): string {
  const price = o.price !== null ? `${o.price.toLocaleString("pl-PL")} ${o.currency ?? ""}`.trim() : "price ?";
  const bits = [
    o.year ?? "?",
    o.mileageKm !== null ? `${o.mileageKm.toLocaleString("pl-PL")} km` : "? km",
    o.fuelType ?? "?",
    o.gearbox ?? "?",
    o.engineCapacityCm3 !== null ? `${o.engineCapacityCm3} cm³` : null,
    o.enginePowerHp !== null ? `${o.enginePowerHp} KM` : null,
    o.location ?? "?",
  ].filter((b) => b !== null);
  return `${price} | ${o.title} | ${bits.join(" · ")}\n  ${o.url}`;
}
