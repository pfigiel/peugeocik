import type { Offer } from "../core/types.js";
import { formatOffer } from "./format.js";
import type { Notifier, NotifyContext } from "./notifier.js";

const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "peugeocik <onboarding@resend.dev>";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function offerHtml(o: Offer): string {
  const summary = formatOffer(o).split("\n")[0] ?? o.title;
  const img = o.thumbnailUrl ? `<a href="${esc(o.url)}"><img src="${esc(o.thumbnailUrl)}" width="160" alt=""></a><br>` : "";
  return `<p>${img}<a href="${esc(o.url)}">${esc(summary)}</a></p>`;
}

/** Emails new offers via Resend. Reads RESEND_API_KEY, NOTIFY_EMAIL_FROM and
 *  NOTIFY_EMAIL_TO (comma-separated) from the environment. */
export class EmailNotifier implements Notifier {
  readonly type = "email";

  private readonly apiKey = process.env.RESEND_API_KEY ?? "";
  private readonly from = process.env.NOTIFY_EMAIL_FROM || DEFAULT_FROM;
  private readonly to = (process.env.NOTIFY_EMAIL_TO ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  constructor() {
    if (!this.apiKey || this.to.length === 0) {
      throw new Error("email notifier: set RESEND_API_KEY and NOTIFY_EMAIL_TO");
    }
  }

  async notify(offers: Offer[], ctx: NotifyContext): Promise<void> {
    const subject =
      offers.length === 1 ? `peugeocik: nowa oferta — ${offers[0]!.title}` : `peugeocik: ${offers.length} nowe oferty`;
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: this.from,
        to: this.to,
        subject,
        html: `<h3>${esc(ctx.searchName)}</h3>` + offers.map(offerHtml).join(""),
        text: `${ctx.searchName}\n\n` + offers.map(formatOffer).join("\n\n"),
      }),
    });
    if (!res.ok) throw new Error(`resend: HTTP ${res.status} ${await res.text()}`);
  }
}
