# AP3 weekly digest

This package adds the weekly retention email "Din odlingsvecka".

## Files

- `supabase/functions/weekly-digest/index.ts`
- `supabase/functions/_shared/weeklyDigestModel.ts`
- `src/components/WeeklyEmailSettings.tsx`
- `src/components/NotificationsSettings.tsx`
- `supabase/config.toml`

## Manual test checklist

- Toggle weekly email in Settings > Notiser.
- Run `weekly-digest?offset=0` with `x-cron-secret`.
- Verify queue payload in `transactional_emails`.
- Verify `email_send_log` row with `template_name = weekly-digest`.
- Re-run same week and confirm idempotency skip.
