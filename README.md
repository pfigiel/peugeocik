# peugeocik

Bot monitoring car sale offers on Polish portals. Scrapes periodically, filters
by your criteria, notifies on new matches, and shows them in a web UI.
Providers: **otomoto** (embedded `__NEXT_DATA__`) and **olx** (public JSON API).

## Setup

```bash
npm install
npm run web:install                   # frontend deps (web/)
cp config.example.json config.json    # then edit criteria
```

## Run

### CLI monitor

```bash
npm run once     # single pass (good for testing)
npm start        # loop forever on intervalMinutes
npm run typecheck
```

### Web UI

One command runs backend API + frontend together (Ctrl-C stops both):

```bash
npm run dev     # API :8787 + UI :5173 (proxies /api)
```

Open http://localhost:5173 — configure criteria in the form, hit **Scan now**,
sort the matches table, click a photo/title to open the offer.

Run them separately instead:

```bash
npm run serve            # API only, http://localhost:8787
npm --prefix web run dev # UI only, http://localhost:5173
```

Production (single process): `cd web && npm run build`, then `npm run serve`
also serves the built UI at http://localhost:8787.

State (`data/matches.json`, `data/matches.md`) is git-ignored. Delete
`data/matches.json` to clear found offers and re-notify.

## Config

`config.json` (validated at startup; also editable from the web form):

| field | meaning |
|-------|---------|
| `intervalMinutes` | minutes between passes |
| `matchStorePath` | where found-offer records are stored (JSON) |
| `searches[]` | named searches: `name`, `portals[]`, `criteria` |
| `notifiers[]` | `{"type":"console"}`, `{"type":"markdown","path":...}`, or `{"type":"logfile","path":...}` |

**Criteria** (all optional): `make`, `model`, `priceMin/Max`, `yearMin/Max`,
`mileageMax`, `engineCapacityMin` (cm³), `enginePowerMin` (KM), `fuelTypes[]`
(`petrol`/`diesel`/`hybrid`/`petrol-lpg`/`electric`), `gearbox[]`
(`manual`/`automatic`), `bodyTypes[]` (`city-cars`/`compact`/`small-cars`/…),
`excludeDamaged`, `registeredInPL`, `location` (`{city, radiusKm}`). The matcher
re-checks price/year/mileage/engine/fuel/gearbox client-side; body/damaged/
registered/location are applied by the portal query.

## Email alerts

New matches are emailed as one digest per scan via [Resend](https://resend.com).
Configured by env vars (Supabase function secrets for the cloud scan, process env
for the local monitor with a `{ "type": "email" }` notifier):

| var | purpose |
|-----|---------|
| `RESEND_API_KEY` | Resend API key |
| `NOTIFY_EMAIL_TO` | recipients, comma-separated |
| `NOTIFY_EMAIL_FROM` | sender, e.g. `peugeocik <alerty@twojadomena.pl>` (default `onboarding@resend.dev`) |

Cloud: `npx supabase secrets set RESEND_API_KEY=... NOTIFY_EMAIL_TO=a@x.pl,b@y.pl NOTIFY_EMAIL_FROM="..."`.
Missing key/recipients disables email; the scan still runs. With the default
`onboarding@resend.dev` sender Resend only delivers to the account owner's
address — verify a domain to email anyone else.

## HTTP API

| method | path | purpose |
|--------|------|---------|
| GET | `/api/meta` | option lists for form selects |
| GET | `/api/config` | current config |
| PUT | `/api/config` | validate + save config |
| GET | `/api/matches` | all stored match records |
| POST | `/api/scan` | run a scan now, returns per-portal summary |

## Architecture

```
src/
  config/     schema (zod) + load + save
  core/       types, options, matcher, match-store, monitor (orchestrator)
  portals/    Portal interface + registry; otomoto/ adapter
  notifiers/  Notifier interface + registry; console, logfile, markdown
  server/     node:http API + static serving of web/dist
  index.ts    CLI entry: load config, run once or loop
web/          React + Vite + Mantine UI (form + sortable table + photos)
```

Extension points:

- **New portal** — implement `Portal` (`src/portals/portal.ts`), register in
  `src/portals/registry.ts`.
- **New notifier** (Telegram, email, ...) — implement `Notifier`
  (`src/notifiers/notifier.ts`), add a type to the config union
  (`src/config/schema.ts`) and `src/notifiers/registry.ts`.
- **Swap storage** (SQLite) — reimplement `MatchStore` (`src/core/store.ts`);
  its API is storage-agnostic.

### otomoto scraping

No browser needed. otomoto (Next.js) embeds listings server-side in the
`__NEXT_DATA__` script as a urql GraphQL cache; offers live at
`advertSearch.edges[].node` (including the default photo `thumbnail`).
`parse.ts` extracts them, `url.ts` builds the filtered search URL, `otomoto.ts`
paginates (capped) politely.

### olx scraping

OLX exposes a public JSON API (`/api/v1/offers/`, cars `category_id=199`).
Filters map to `filter_float_*` / `filter_enum_*` params; location uses
`city_id` + `distance` (a small city→id map, Gliwice seeded). OLX fuel values
(`plugin-hybrid`, `lpg`, …) and body types are normalized to the shared
vocabulary so the matcher works across portals. Adapter: `olx.ts`
(Node `src/portals/olx/`, Deno `supabase/functions/_shared/olx.ts`).

Each offer's `uid` is prefixed by portal (`otomoto:…`, `olx:…`), so results
dedupe and archive independently across providers.
