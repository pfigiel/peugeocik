import type { Offer } from "./types.ts";

// New-offer email alerts via Resend (https://resend.com). Configured by secrets:
//   RESEND_API_KEY     Resend API key
//   NOTIFY_EMAIL_FROM  sender, e.g. "peugeocik <alerty@twojadomena.pl>"
//   NOTIFY_EMAIL_TO    fallback recipients, comma-separated (used only when
//                      config.notifyEmails is empty)
// Unset key or no recipients disables email (scan still runs and persists).

const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "peugeocik <onboarding@resend.dev>";

const LABELS: Record<string, string> = {
  petrol: "Benzyna",
  diesel: "Diesel",
  hybrid: "Hybryda",
  "plugin-hybrid": "Hybryda plug-in",
  "petrol-lpg": "Benzyna + LPG",
  electric: "Elektryczny",
  manual: "Manualna",
  automatic: "Automatyczna",
};
const label = (v: string | null) => (v ? LABELS[v] ?? v : null);

/** Fresh offers grouped by the search that matched them. */
export type NewOffersBySearch = Map<string, Offer[]>;

interface EmailConfig { apiKey: string; from: string; to: string[] }

/** Recipients come from config (`notifyEmails`); when empty, fall back to the
 *  NOTIFY_EMAIL_TO secret. API key and sender are always secrets. */
function emailConfig(recipients: string[]): EmailConfig | null {
  const apiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const to = recipients.length > 0
    ? recipients
    : (Deno.env.get("NOTIFY_EMAIL_TO") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!apiKey || to.length === 0) return null;
  return { apiKey, to, from: Deno.env.get("NOTIFY_EMAIL_FROM") || DEFAULT_FROM };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const num = (n: number) => n.toLocaleString("pl-PL");

function details(o: Offer): string {
  return [
    o.year,
    o.mileageKm !== null ? `${num(o.mileageKm)} km` : null,
    label(o.fuelType),
    label(o.gearbox),
    o.engineCapacityCm3 !== null ? `${num(o.engineCapacityCm3)} cm³` : null,
    o.enginePowerHp !== null ? `${o.enginePowerHp} KM` : null,
    o.location,
  ].filter((b) => b !== null && b !== "").join(" · ");
}

const price = (o: Offer) => (o.price !== null ? `${num(o.price)} ${o.currency ?? "PLN"}` : "cena ?");

function offerHtml(o: Offer): string {
  const img = o.thumbnailUrl
    ? `<td width="160" style="padding:0 12px 0 0;vertical-align:top"><a href="${esc(o.url)}"><img src="${esc(o.thumbnailUrl)}" width="160" style="display:block;border-radius:6px;width:160px;height:auto" alt=""></a></td>`
    : "";
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border-bottom:1px solid #eee;padding-bottom:16px">
    <tr>${img}
      <td style="vertical-align:top;font-family:Arial,sans-serif">
        <div style="font-size:18px;font-weight:bold;color:#b45309">${esc(price(o))}</div>
        <div style="font-size:15px;margin:4px 0"><a href="${esc(o.url)}" style="color:#111;text-decoration:none">${esc(o.title)}</a></div>
        <div style="font-size:13px;color:#555">${esc(details(o))}</div>
        <div style="font-size:12px;margin-top:6px"><a href="${esc(o.url)}" style="color:#b45309">Zobacz na ${esc(o.portal)} →</a></div>
      </td>
    </tr>
  </table>`;
}

function render(bySearch: NewOffersBySearch, total: number): { subject: string; html: string; text: string } {
  const subject = total === 1
    ? `peugeocik: nowa oferta — ${[...bySearch.values()][0][0].title}`
    : `peugeocik: ${total} nowe oferty`;

  const sections = [...bySearch].map(([search, offers]) =>
    `<h3 style="font-family:Arial,sans-serif;font-size:14px;color:#555;margin:20px 0 10px">${esc(search)} (${offers.length})</h3>` +
    offers.map(offerHtml).join("")
  ).join("");
  const html = `<div style="max-width:640px;margin:0 auto">${sections}</div>`;

  const text = [...bySearch].map(([search, offers]) =>
    `== ${search} (${offers.length})\n` +
    offers.map((o) => `${price(o)} | ${o.title}\n${details(o)}\n${o.url}`).join("\n\n")
  ).join("\n\n");

  return { subject, html, text };
}

/** Send one digest email for all new offers of a scan. No-op when email is not
 *  configured or there is nothing new. Throws on Resend API failure. */
export async function sendNewOffersEmail(bySearch: NewOffersBySearch, recipients: string[] = []): Promise<boolean> {
  const cfg = emailConfig(recipients);
  const total = [...bySearch.values()].reduce((n, offers) => n + offers.length, 0);
  if (!cfg || total === 0) return false;

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: cfg.from, to: cfg.to, ...render(bySearch, total) }),
  });
  if (!res.ok) throw new Error(`resend: HTTP ${res.status} ${await res.text()}`);
  return true;
}
