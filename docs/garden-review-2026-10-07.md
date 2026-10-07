# Garden Bloom – rättningar 7 oktober 2026

Ändringarna gäller Garden Bloom / Odlingsdagboken. Inga användarposter har skapats, ändrats eller raderats under arbetet. Poster märkta ”TEST Hark” lämnas kvar.

## Ändrat

- Registrering och omsändning går till `/auth/confirm`. Sidan verifierar en engångstoken innan den visar ”Din e-post är bekräftad” och öppnar appen efter fem sekunder. Ogiltig eller utgången länk visar ett svenskt fel; en befintlig inloggning räcker inte som bevis. Länken i signup-hooken ligger på `odlingsdagboken.com` och token ligger i fragmentet.
- Introduktionen hittar inte längre på zon, odlingssätt eller grödor. En akutbedömning räknas inte som en odlingsplan. Alla profilval sparas i en enda skrivning före övergången till appen. Spara och Justera planen har lika stora knappar och Hoppa över sparar inga påhittade val. En sparad plan beskrivs som önskemål med genväg till första sådden, inte som en befintlig odling.
- Abonnemangsstatus skiljer den automatiska 14-dagarsperioden från Stripe-abonnemang, Stripe-provperiod och annan beviljad tillgång. Provperioden får slutdatum och förklaring. Inställningar länkar till abonnemangssidan. Stripe-perioder med `trialing` inkluderas; periodslut hämtas från subscription items enligt befintlig Basil-version. Befintlig SDK/API-version behålls.
- Svenska notisbesked och e-postvalidering. Utvecklingsstadium kan väljas även när en sådd skapas.
- Kilogram visas med två decimaler och svenskt kommatecken, exempelvis 0,12 kg. Samma format används i statistik, översikt och delning.
- Egna priser per gröda sparas i användarens befintliga `profiles.preferences.crop_prices`. Inga tabeller eller migrationssteg tillkommer. Alla skördevärden använder dessa priser; ett tomt fält återställer standardpriset. Noll är ett giltigt pris. Vitlök matchas före lök.
- Agendan visar pågående odlingsperioder en gång med veckospann, sedan endast nya perioder och sista veckan. Användarens egna återkommande händelser behålls.
- Skadedjur har konkreta ingångar till symtomloggen. Samplantering har ingångar till det befintliga biblioteket utan att kräva egna sådder.
- `/villkor`, `/integritet` och `/pris` leder rätt, både i klienten och på statiska värdar. Vercel får permanenta omdirigeringar. Menyn och sidfoten länkar till `/priser`. Den flytande registreringsrutan döljs när sidfoten kommer in i bild.

## Produktionsordning och kvarstående åtkomst

Supabase-anslutningen nekade åtkomst till `ysonnvbkrwajacvdkqut`. Ändringarna i Auth-konfigurationen och Edge Functions är därför **inte driftsatta eller verifierade mot ett riktigt konto** i detta arbete.

1. Publicera webbversionen med `/auth/confirm` först. Gamla mejllänkar via Supabase fortsätter att fungera.
2. Publicera `auth-email-hook` inklusive `_shared/signupConfirmation.ts` , `check-subscription` inklusive `_shared/subscriptionAccess.ts` och `calendar-feed` med den regenererade kalenderbundlen till rätt projekt. Befintliga hemligheter och webhook-signaturkontroll ska behållas.
3. Ställ Site URL till `https://odlingsdagboken.com`. Lägg till `https://odlingsdagboken.com/auth/confirm` i tillåtna redirect-URL:er och behåll befintliga adresser för inloggning, lösenordsåterställning, native och preview.
4. För den vanliga Supabase-mejlmallen: använd `supabase/templates/confirmation.html`. Den aktiva Lovable-mejlhooken skapar länken själv, så enbart byte av Site URL eller Supabase-mall räcker inte när hooken är aktiverad.
5. `node scripts/configure-signup-auth.mjs` läser aktuell konfiguration utan att ändra den. Med `--apply` ändras endast Site URL, bekräftelsemall, ämne och den sammanslagna redirect-listan. Skriptet kräver en behörig Management API-session via `SUPABASE_ACCESS_TOKEN` i miljön och skriver aldrig ut token. Kör först efter steg 1. Använd befintlig säker hantering av inloggningsuppgifter.
6. Bekräfta ett separat testkonto via det levererade mejlet, prova samma länk igen och kontrollera att en utgången länk inte visar lyckad bekräftelse. Kontrollera sedan gratisprov, betalt konto och abonnemangsportalen. Skapa inga köp för denna kontroll.

Enbart publicerad frontend kan inte ändra avsändarens mejllänkar. Om den äldre abonnemangsfunktionen fortfarande körs visas Plus-tillgång utan att påstå att ett nytt konto har ett betalt abonnemang.

## Verifiering

- `npm run typecheck`: godkänd.
- `npm run lint`: inga fel, 12 befintliga varningar.
- `npx vitest run --maxWorkers=2`: 499 tester godkända i 74 filer. Regressionstester omfattar bland annat engångsverifiering, utgången länk, introduktionens sparfel och Hoppa över, sparade grödpriser med decimalkomma, kalenderperioder och svensk e-postvalidering.
- `npm run build`: godkänd, inklusive 370 förrenderade sidor och kontroller för Lovable-värd och gemensam publiceringsversion för HTML/JS.
- Deno-typkontroll av de två nya fristående hjälpfilerna: godkänd. Full kontroll av Edge Functions blockerades när externa Deno-beroenden inte kunde hämtas från nätet.
- Riktiga bekräftelsemejl, betalstatus och Stripe-portalen återstår att verifiera efter driftsättning med rätt projektåtkomst. Ingen visuell webbläsargranskning har gjorts i denna körning.
