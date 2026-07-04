# weekly-digest

Cron-protected Edge Function for the weekly retention email "Din odlingsvecka".

## Manual verification

1. Deploy `weekly-digest`.
2. Call the function with `x-cron-secret` and `?offset=0`.
3. Confirm queued email payloads in `transactional_emails`.
4. Confirm `email_send_log.template_name = 'weekly-digest'`.
5. Re-run the same week and confirm duplicate sends are skipped by `message_id`.
6. Toggle weekly email from Settings > Notiser and confirm `profiles.weekly_email_enabled` changes.

## Cron example

```sql
select cron.schedule('weekly-digest-offset-0', '0 16 * * 0', $$
  select net.http_post(
    url := 'https://ysonnvbkrwajacvdkqut.supabase.co/functions/v1/weekly-digest?offset=0',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name='cron_secret')),
    body := '{}'::jsonb);
$$);
```
