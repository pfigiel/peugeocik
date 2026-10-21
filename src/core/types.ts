/** Normalized offer, portal-agnostic. Every portal adapter maps into this shape. */
export interface Offer {
  /** Globally unique id: `${portal}:${portalOfferId}`. */
  uid: string;
  portal: string;
  portalOfferId: string;
  title: string;
  url: string;
  price: number | null;
  currency: string | null;
  year: number | null;
  mileageKm: number | null;
  fuelType: string | null;
  gearbox: string | null;
  enginePowerHp: number | null;
  engineCapacityCm3: number | null;
  make?: string | null;
  model?: string | null;
  location: string | null;
  /** Default/primary photo URL for the offer, if present. */
  thumbnailUrl: string | null;
  /** When the offer was published on the portal, ISO string if known. */
  createdAt: string | null;
  /** Original portal payload, kept for debugging / future fields. */
  raw?: unknown;
}

/** Search filter, portal-agnostic. Portals push what they can to the remote
 *  query; the matcher re-checks every field client-side as source of truth. */
export interface Criteria {
  make?: string;
  model?: string;
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  mileageMax?: number;
  /** Minimum engine displacement in cm³ (e.g. 1199 for ~1.2 L). */
  engineCapacityMin?: number;
  /** Minimum engine power in HP (KM). */
  enginePowerMin?: number;
  /** Normalized values, e.g. "petrol" | "diesel" | "hybrid". Match is OR. */
  fuelTypes?: string[];
  /** Normalized values, e.g. "manual" | "automatic". Match is OR. */
  gearbox?: string[];
  /** Normalized body types, e.g. "city-cars" | "compact" | "small-cars".
   *  Portal-pushed only (not present in offer payloads to re-verify). */
  bodyTypes?: string[];
  /** Exclude offers marked as damaged. Portal-pushed only. */
  excludeDamaged?: boolean;
  /** Only offers registered in Poland. Portal-pushed only. */
  registeredInPL?: boolean;
  /** Geographic constraint around a city. Portal-pushed only. */
  location?: { city: string; radiusKm: number };
}

/** One named search: criteria applied across one or more portals. */
export interface SearchJob {
  name: string;
  portals: string[];
  criteria: Criteria;
}
