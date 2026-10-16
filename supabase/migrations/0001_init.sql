-- peugeocik schema: shared config + matches, RLS for authenticated friends.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Single shared config row (id is pinned to 1).
create table if not exists public.app_config (
  id         int primary key default 1 check (id = 1),
  config     jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.matches (
  uid           text primary key,
  portal        text not null,
  search_name   text not null,
  offer         jsonb not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create index if not exists matches_first_seen_idx on public.matches (first_seen_at desc);

-- ---------------------------------------------------------------------------
-- Seed config (shared). Notifiers omitted: cloud scan persists to DB directly.
-- ---------------------------------------------------------------------------

insert into public.app_config (id, config)
values (
  1,
  '{
    "intervalMinutes": 30,
    "searches": [
      {
        "name": "small-petrol-manual-gliwice",
        "portals": ["otomoto"],
        "criteria": {
          "priceMax": 30000,
          "yearMin": 2015,
          "mileageMax": 120000,
          "engineCapacityMin": 1199,
          "enginePowerMin": 80,
          "fuelTypes": ["petrol"],
          "gearbox": ["manual"],
          "bodyTypes": ["city-cars", "compact", "small-cars"],
          "excludeDamaged": true,
          "registeredInPL": true,
          "location": { "city": "Gliwice", "radiusKm": 50 }
        }
      }
    ]
  }'::jsonb
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
--   Reads: any authenticated user (logged-in friend).
--   Writes: via service_role only (edge function / cron bypass RLS), so no
--           write policies are defined for regular users.
-- ---------------------------------------------------------------------------

alter table public.app_config enable row level security;
alter table public.matches    enable row level security;

drop policy if exists "auth read config" on public.app_config;
create policy "auth read config" on public.app_config
  for select to authenticated using (true);

drop policy if exists "auth read matches" on public.matches;
create policy "auth read matches" on public.matches
  for select to authenticated using (true);
