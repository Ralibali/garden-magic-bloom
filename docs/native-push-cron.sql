-- Run only in project ysonnvbkrwajacvdkqut after migration, functions and keys.
-- This does not embed a secret in the cron command; use the existing Vault value.
select cron.schedule('native-push-delivery','* * * * *',$$
  select net.http_post(
    url := 'https://ysonnvbkrwajacvdkqut.supabase.co/functions/v1/send-native-notifications',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='cron_secret')),
    body := '{}'::jsonb);
$$);
