/** Mirrors the backend types (src/core/types.ts, src/config/schema.ts). */

export interface Criteria {
  make?: string;
  model?: string;
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  mileageMax?: number;
  engineCapacityMin?: number;
  enginePowerMin?: number;
  fuelTypes?: string[];
  gearbox?: string[];
  bodyTypes?: string[];
  excludeDamaged?: boolean;
  registeredInPL?: boolean;
  location?: { city: string; radiusKm: number };
}

export interface SearchJob {
  name: string;
  portals: string[];
  criteria: Criteria;
}

export interface Config {
  intervalMinutes: number;
  searches: SearchJob[];
}

export interface Offer {
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
  location: string | null;
  thumbnailUrl: string | null;
  createdAt: string | null;
}

export interface MatchRecord {
  offer: Offer;
  searchName: string;
  firstSeenAt: string;
  lastSeenAt: string;
  archived: boolean;
}

export interface Meta {
  fuelTypes: string[];
  gearbox: string[];
  bodyTypes: string[];
  portals: string[];
}

export interface ScanResult {
  searchName: string;
  portal: string;
  scraped: number;
  matched: number;
  new: number;
  error?: string;
}
