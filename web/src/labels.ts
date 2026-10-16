/** Polish display labels for backend enum values (portal keys stay English). */
const LABELS: Record<string, string> = {
  // fuel
  petrol: "Benzyna",
  diesel: "Diesel",
  hybrid: "Hybryda",
  "plugin-hybrid": "Hybryda plug-in",
  "petrol-lpg": "Benzyna + LPG",
  "petrol-cng": "Benzyna + CNG",
  electric: "Elektryczny",
  hydrogen: "Wodór",
  // gearbox
  manual: "Manualna",
  automatic: "Automatyczna",
  // body
  "city-cars": "Auta miejskie",
  compact: "Kompakt",
  "small-cars": "Auta małe",
  sedan: "Sedan",
  "station-wagon": "Kombi",
  suv: "SUV",
  coupe: "Coupé",
  minivan: "Minivan",
  cabriolet: "Kabriolet",
};

export const label = (v: string): string => LABELS[v] ?? v;

export const toOptions = (values: readonly string[]) => values.map((value) => ({ value, label: label(value) }));
