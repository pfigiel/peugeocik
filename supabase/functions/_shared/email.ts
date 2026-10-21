import type { Offer } from "./types.ts";

// New-offer email alerts via Brevo (https://brevo.com). Configured by secrets:
//   BREVO_API_KEY      Brevo API key (v3)
//   NOTIFY_EMAIL_FROM  verified sender, e.g. "peugeocik <ty@gmail.com>"
// Recipients come solely from config.notifyEmails (edited in the app UI).
// Unset key or no recipients disables email (scan still runs and persists).

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
const DEFAULT_FROM = "peugeocik <no-reply@example.com>";

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

interface Sender { name: string; email: string }
interface EmailConfig { apiKey: string; from: Sender; to: string[] }

/** Parse "Name <email>" (or a bare address) into a Brevo sender object. */
function parseSender(raw: string): Sender {
  const m = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1] || "peugeocik", email: m[2].trim() };
  return { name: "peugeocik", email: raw.trim() };
}

/** Recipients come solely from config (`notifyEmails`); empty disables email.
 *  API key and sender are secrets. */
function emailConfig(recipients: string[]): EmailConfig | null {
  const apiKey = Deno.env.get("BREVO_API_KEY") ?? "";
  const to = recipients.map((s) => s.trim()).filter(Boolean);
  if (!apiKey || to.length === 0) return null;
  return { apiKey, to, from: parseSender(Deno.env.get("NOTIFY_EMAIL_FROM") || DEFAULT_FROM) };
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

  const { subject, html, text } = render(bySearch, total);
  const res = await fetch(BREVO_URL, {
    method: "POST",
    headers: { "api-key": cfg.apiKey, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: cfg.from,
      to: cfg.to.map((email) => ({ email })),
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  if (!res.ok) throw new Error(`brevo: HTTP ${res.status} ${await res.text()}`);
  return true;
}
