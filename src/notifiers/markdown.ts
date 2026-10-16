import { appendFile, mkdir, access } from "node:fs/promises";
import { dirname } from "node:path";
import type { Offer } from "../core/types.js";
import type { Notifier, NotifyContext } from "./notifier.js";

const HEADER =
  "| Added | Search | Price | Car | Year | Mileage | Fuel | Gearbox | Engine | Power | Location | Link |\n" +
  "|---|---|---|---|---|---|---|---|---|---|---|---|\n";

/** Escape a value for a markdown table cell. */
function cell(v: string | number | null): string {
  if (v === null || v === "") return "—";
  return String(v).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function row(o: Offer, ctx: NotifyContext, ts: string): string {
  const price = o.price !== null ? `${o.price.toLocaleString("pl-PL")} ${o.currency ?? ""}`.trim() : null;
  const mileage = o.mileageKm !== null ? `${o.mileageKm.toLocaleString("pl-PL")} km` : null;
  const engine = o.engineCapacityCm3 !== null ? `${o.engineCapacityCm3} cm³` : null;
  const power = o.enginePowerHp !== null ? `${o.enginePowerHp} KM` : null;
  const link = `[otomoto](${o.url})`;
  return (
    "| " +
    [
      cell(ts),
      cell(ctx.searchName),
      cell(price),
      cell(o.title),
      cell(o.year),
      cell(mileage),
      cell(o.fuelType),
      cell(o.gearbox),
      cell(engine),
      cell(power),
      cell(o.location),
      link,
    ].join(" | ") +
    " |\n"
  );
}

/** Appends matched offers as rows of a single markdown table. Writes the table
 *  header once, when the file is first created. */
export class MarkdownNotifier implements Notifier {
  readonly type = "markdown";

  constructor(private readonly path: string) {}

  async notify(offers: Offer[], ctx: NotifyContext): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });

    let prefix = "";
    try {
      await access(this.path);
    } catch {
      prefix = `# peugeocik — matched offers\n\n${HEADER}`;
    }

    const ts = new Date().toISOString().replace("T", " ").slice(0, 16);
    const body = offers.map((o) => row(o, ctx, ts)).join("");
    await appendFile(this.path, prefix + body, "utf8");
  }
}
