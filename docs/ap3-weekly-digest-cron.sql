-- AP3 weekly digest cron example
-- Sunday 18:00 Europe/Stockholm during summer time = 16:00 UTC.

select cron.schedule('weekly-digest-offset-0', '0 16 * * 0', $$
  select net.http_post(
    url := 'https://ysonnvbkrwajacvdkqut.supabase.co/functions/v1/weekly-digest?offset=0',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name='cron_secret')),
    body := '{}'::jsonb);
$$);
