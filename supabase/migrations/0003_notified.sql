-- Email-notification flag per match.
--   notified_at IS NULL  -> pending: a cron scan will email it, then stamp now().
--   notified_at NOT NULL -> already handled: manual/criteria-change scans stamp
--                           now() on insert so they are never emailed.
-- Only the cron scan sends emails; manual scans just refresh the stored matches.
alter table public.matches add column if not exists notified_at timestamptz;

-- Existing rows predate this flag: stamp them so they are not emailed retroactively.
update public.matches set notified_at = first_seen_at where notified_at is null;

create index if not exists matches_notified_idx on public.matches (notified_at)
  where notified_at is null;
