import type { Offer } from "../core/types.js";
import { formatOffer } from "./format.js";
import type { Notifier, NotifyContext } from "./notifier.js";

export class ConsoleNotifier implements Notifier {
  readonly type = "console";

  async notify(offers: Offer[], ctx: NotifyContext): Promise<void> {
    console.log(`\n🚗 [${ctx.searchName}] ${offers.length} new offer(s):`);
    for (const o of offers) {
      console.log("  " + formatOffer(o).replace(/\n/g, "\n  "));
    }
  }
}
