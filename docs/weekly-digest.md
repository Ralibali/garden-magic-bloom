# Veckobrevet "Din odlingsvecka"

Retention-mejl som skickas en gång per vecka till användare som slagit på veckobrev.

## Omfattning

Veckobrevet och inställningen som slår av/på det. Inga nya persondatatabeller, ingen påverkan på auth- eller Stripe-flöden.

## Filer

- `supabase/functions/weekly-digest/index.ts`
- `supabase/functions/_shared/weeklyDigestModel.ts`
- `src/components/WeeklyEmailSettings.tsx`
- `src/components/NotificationsSettings.tsx`
- `supabase/config.toml`

## Kö och leverans

Brevet läggs i kö via `enqueueTransactional` och levereras av den befintliga kö-workern (`process-email-queue`).

## Idempotens

Message-id: `weekly-digest-{user_id}-{yyyy}-W{week}`.
Innan brevet köas kontrolleras `email_send_log` mot samma `message_id`, så samma vecka aldrig skickas två gånger.

## Batchning

Funktionen behandlar 50 profiler per anrop. Kör `?offset=0`, `?offset=50`, `?offset=100` osv. för fler batchar.

## Innehållsregler

- Aktiva sådder = allt utom status `done`.
- "Snart skörd" utgår från användarens **egna** sådder, bara `plant_kind = 'edible'`, och bara sorter som matchar grödmatrisen. Ingen match → utelämnas.
- Rubriker renderas bara när respektive lista är icke-tom.

## Manuell testchecklista

- Slå av/på veckobrev i Inställningar → Notiser.
- Kör `weekly-digest?offset=0` med `x-cron-secret`.
- Kontrollera köpayload i `transactional_emails`.
- Kontrollera rad i `email_send_log` med `template_name = weekly-digest`.
- Kör om samma vecka och verifiera att idempotensen hoppar över.
