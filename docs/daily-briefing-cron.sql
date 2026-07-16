-- Dagens 3: morgonbriefing-cron
-- 06:45 Europe/Stockholm sommartid = 04:45 UTC.
-- (Vintertid = 05:45 UTC — justera vid tidsomställning, samma sak gäller weekly-digest.)
--
-- Kör i Supabase SQL Editor. Kräver att cron_secret finns i Vault
-- (samma secret som weekly-digest och frost-alert använder).

select cron.schedule('daily-briefing', '45 4 * * *', $$
  select net.http_post(
    url := 'https://ysonnvbkrwajacvdkqut.supabase.co/functions/v1/daily-briefing',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name='cron_secret')),
    body := '{}'::jsonb);
$$);

-- Ta bort: select cron.unschedule('daily-briefing');
-- Testa manuellt (utan cron):
--   curl -X POST https://ysonnvbkrwajacvdkqut.supabase.co/functions/v1/daily-briefing \
--     -H "x-cron-secret: <cron_secret>"
