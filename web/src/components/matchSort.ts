import type { MatchRecord } from "../types";

export type SortKey = "firstSeenAt" | "price" | "year" | "mileageKm" | "enginePowerHp";
export type Dir = "asc" | "desc";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "firstSeenAt", label: "Found" },
  { value: "price", label: "Price" },
  { value: "year", label: "Year" },
  { value: "mileageKm", label: "Mileage" },
  { value: "enginePowerHp", label: "Power" },
];

function value(r: MatchRecord, key: SortKey): number {
  if (key === "firstSeenAt") return new Date(r.firstSeenAt).getTime();
  return r.offer[key] ?? Number.NEGATIVE_INFINITY;
}

export function sortRecords(records: MatchRecord[], key: SortKey, dir: Dir): MatchRecord[] {
  const arr = [...records];
  arr.sort((a, b) => (dir === "asc" ? value(a, key) - value(b, key) : value(b, key) - value(a, key)));
  return arr;
}

const nf = new Intl.NumberFormat("pl-PL");
export const fmtNum = (v: number | null, suffix = "") => (v === null ? "—" : `${nf.format(v)}${suffix}`);
export const fmtPrice = (price: number | null, currency: string | null) =>
  price === null ? "—" : `${nf.format(price)} ${currency ?? ""}`.trim();
