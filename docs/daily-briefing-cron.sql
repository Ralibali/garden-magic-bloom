-- Dagens 3: morgonbriefing-cron
-- Kör varje timme men skicka endast 06:45 lokal Stockholmstid.
-- Postgres hanterar svensk sommar- och vintertid.
--
-- Kör i Supabase SQL Editor. Kräver att cron_secret finns i Vault
-- (samma secret som weekly-digest och frost-alert använder).

select cron.schedule('daily-briefing', '45 * * * *', $$
  select net.http_post(
    url := 'https://ysonnvbkrwajacvdkqut.supabase.co/functions/v1/daily-briefing',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name='cron_secret')),
    body := '{}'::jsonb)
  where (now() at time zone 'Europe/Stockholm')::time >= time '06:45'
    and (now() at time zone 'Europe/Stockholm')::time < time '06:50';
$$);

-- Ta bort: select cron.unschedule('daily-briefing');
-- Testa manuellt (utan cron):
--   curl -X POST https://ysonnvbkrwajacvdkqut.supabase.co/functions/v1/daily-briefing \
--     -H "x-cron-secret: <cron_secret>"
