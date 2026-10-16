/** Enum option lists shared by the config schema intent and the web form.
 *  Keep in sync with the portal adapters' value maps (e.g. otomoto/url.ts). */

export const FUEL_OPTIONS = ["petrol", "diesel", "hybrid", "petrol-lpg", "electric"] as const;

export const GEARBOX_OPTIONS = ["manual", "automatic"] as const;

export const BODY_TYPE_OPTIONS = [
  "city-cars",
  "compact",
  "small-cars",
  "sedan",
  "station-wagon",
  "suv",
  "coupe",
  "minivan",
  "cabriolet",
] as const;
