// Enum option lists for the form + config validation. Keep in sync with
// otomoto value maps below (otomoto.ts).

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
