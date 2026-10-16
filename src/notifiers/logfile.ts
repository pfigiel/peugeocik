import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { Offer } from "../core/types.js";
import { formatOffer } from "./format.js";
import type { Notifier, NotifyContext } from "./notifier.js";

export class LogFileNotifier implements Notifier {
  readonly type = "logfile";

  constructor(private readonly path: string) {}

  async notify(offers: Offer[], ctx: NotifyContext): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const ts = new Date().toISOString();
    const lines = offers
      .map((o) => `[${ts}] [${ctx.searchName}] ${formatOffer(o).replace(/\n\s*/g, " ")}`)
      .join("\n");
    await appendFile(this.path, lines + "\n", "utf8");
  }
}
