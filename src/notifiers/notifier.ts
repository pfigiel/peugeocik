import type { Offer } from "../core/types.js";

/** Context passed alongside matched offers so notifiers can label the alert. */
export interface NotifyContext {
  /** Name of the search job that produced these matches. */
  searchName: string;
}

/** Destination for new matched offers. Add a channel (Telegram, email, ...) by
 *  implementing this and registering it in ./registry.ts. */
export interface Notifier {
  readonly type: string;
  notify(offers: Offer[], ctx: NotifyContext): Promise<void>;
}
