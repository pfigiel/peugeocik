-- Scheduled scan. Run AFTER the `api` function is deployed and CRON_SECRET is
-- set. Replace the two placeholders, then run in the Supabase SQL editor.
--   <FUNCTION_URL>  e.g. https://<ref>.supabase.co/functions/v1/api
--   <CRON_SECRET>   same value set as the function's CRON_SECRET secret

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove a previous schedule with this name, if any.
select cron.unschedule('peugeocik-scan')
where exists (select 1 from cron.job where jobname = 'peugeocik-scan');

-- Every 30 minutes, POST to the scan endpoint with the shared secret.
select cron.schedule(
  'peugeocik-scan',
  '*/30 * * * *',
  $$
  select net.http_post(
    url     := '<FUNCTION_URL>/scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
