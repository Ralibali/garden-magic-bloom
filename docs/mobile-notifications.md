# Notiser i mobilappen

## Implementation och verifieringsgräns

Fältdagbokens egna telefonpåminnelser schemaläggs lokalt med Capacitor LocalNotifications utan konto. De skickas aldrig också genom serverkön.

Serverpush är implementerad för **APNs på iOS** och **FCM HTTP v1 på Android**. `frost-alert`, `daily-briefing` och `run-my-briefing` kan köa till mobilinstallationer och fortsätter använda Web Push/VAPID för webbläsare. Transporterna har separata resultat och deduplicering. Ett native-fel stoppar inte ett fungerande webbutskick.

**Pushdatabasens migration är applicerad och RLS/rättigheter verifierade i rätt Lovable Cloud-projekt den 8 september 2026. Edge-funktioner, nycklar och cron återstår. Ingen faktisk APNs-/FCM-leverans eller butikspublicering är verifierad.** Kodtester och osignerade byggen ersätter inte dessa steg.

## Samtycke och konto

Inställningarna visar push för den aktuella telefonen. Användaren aktiverar uttryckligen och godkänner OS-behörighet innan token skickas. Automatisk FCM-registrering är avstängd. iOS-token skickas till APNs, Android-token till FCM.

Varje installation har slumpmässigt ID, privat 256-bitars avregistreringshemlighet och en ny generation för varje samtycke/inloggning. Servern härleder användaren från verifierad JWT; databasen har RLS och inga direkta klienträttigheter. En transaktion förbjuder ägarbyte utan ny generation. Servern lagrar endast hemlighetens hash.

Utloggning, kontobyte och kontoradering sparar först lokal återkallelse och avregistrerar på telefonen. Serverrensning återförsöks efter nätfel, även efter omstart. Ett nytt samtycke väntar tills gammal serverrensning är klar. Ett fel i lokal lagring av återkallelsen visas och får inte ignoreras. Supabase-kontots egen utloggning kräver att dess autentiseringstjänst kan hantera begäran. Redan accepterade notiser kan fortfarande komma fram.

Försenad återregistrering stoppas av återkallelsemarkörer. En gammal utloggning kan inte stänga av nästa kontos generation. Tokenrotation uppdaterar samma aktuella bindning; ogiltiga gamla token får inte inaktivera nyare token. Kontoradering tar bort installationer och jobb genom foreign-key cascade.

## Kö och leverans

- Unik nyckel per installation, generation och händelse. Upprepade cron-anrop köar inte samma händelse igen.
- Atomisk claim med `FOR UPDATE SKIP LOCKED` och två minuters lease. Resultat får endast sparas för den lease och generation som skickade.
- Högst tre försök, med fem/tio minuters mellanrum vid tillfälliga fel. Fyra konsumenter arbetar i högst cirka 40 sekunder per körning, med tak på 100 jobb. Nästa minut fortsätter cron där kön slutade. Detta är ett arbetstak, ingen uppmätt kapacitetsgaranti.
- Aktuella frost-/briefinginställningar kontrolleras före varje försök. Manuellt begärd briefing och test är uttryckliga engångsutskick.
- Frostvarning upphör klockan 09 den varnade morgonen, dagsbriefing klockan 18 samma dag (Europe/Stockholm). Manuella utskick/test upphör efter 15 minuter. Provider-TTL begränsas av samma sluttid.
- Generell låsskärmstext, utan växtnamn, anteckningar, ort eller konto-ID. Tryck öppnar endast tillåtna interna sidor. iOS köar notistryck vid kallstart tills bryggan finns, och deduplicerar scen-/delegatehändelser.
- Testknappen skickar bara till aktuell installation. ”Accepterad” innebär att Apple/Google accepterade begäran; det bevisar inte visning på telefonen.
- Worker rensar jobb, återkallelsemarkörer och avstängda installationer efter 30 dagar. Återkallelsemarkörer innehåller inga konto-ID:n eller push-token.

## Konfiguration och driftsättning

Använd endast Supabase-projekt **ysonnvbkrwajacvdkqut**. Det saknas i den separata Supabase-anslutningens projektlista, men databasåtkomst har verifierats via Lovable-projekt `57180308-833a-4411-a64b-9d965797edb1` (garden-magic-bloom). Supabase-anslutningen saknar behörighet till projektets edge-funktioner. Driftsätt inte till något annat projekt.

1. Bekräfta befintlig butiksidentitet; `com.odlingsdagboken.app` är tills vidare föreslagen identitet.
2. `supabase/migrations/20260908130000_native_push.sql` är redan applicerad och registrerad som version `20260908130000` i `supabase_migrations.schema_migrations`. Alla tre tabeller har RLS, inga anon-/authenticated-grants och service-only RPC. Applicera inte samma migration igen.
3. Lägg serverhemligheter i rätt projekt: `NATIVE_PUSH_APP_ID`, `APNS_PRIVATE_KEY` (PKCS#8 .p8), `APNS_KEY_ID`, `APNS_TEAM_ID`, `FCM_SERVICE_ACCOUNT` (servicekonto-JSON med rätt project_id) och befintlig `CRON_SECRET`. Aktivera FCM API och begränsa servicekontots rättigheter till nödvändig sändning.
4. Driftsätt `native-push`, `send-native-notifications`, `daily-briefing`, `frost-alert`, `run-my-briefing` och delade moduler. Custom auth/cron-kontroll används enligt `supabase/config.toml`.
5. Aktivera worker med `docs/native-push-cron.sql`; behåll frostcron och uppdatera morgoncron med `docs/daily-briefing-cron.sql` för svensk sommar-/vintertid. Kontrollera cron-resultat och providerkoder utan att logga token, hemligheter eller privata odlingsuppgifter.
6. Aktivera Apples pushcapability och rätt signeringsprofil. `npm run build:native` väljer **production** för TestFlight/App Store. `npm run build:native:dev` väljer **sandbox** för utvecklingssignerad iOS-app/simulator. Kör `npx cap sync ios` efteråt. Xcode stoppar ett Debug-/Releasebygge med fel paketerad miljö. Kontrollera också att den exporterade distributionsappens signerade `aps-environment` är `production`.
7. Placera verklig `google-services.json` för exakt rätt Android applicationId i `android/app/` före Androids push-/releasebygge. Filen är gitignorerad. Utan den kan osignerad testapp byggas, men FCM fungerar inte.

Nycklar, servicekonton och signeringsmaterial får inte ligga i Git eller webbpaketet. iOS APNs-nyckeln är endast en serverhemlighet; någon Firebase iOS-konfiguration behövs inte för denna direkta APNs-transport.

## Obligatorisk verifiering på enheter

Testa senaste signerade build på iPhone och Android: tillåt/neka, förgrund/bakgrund/kallstart, testnotis, riktiga frost-/briefingjobb, två enheter, tokenbyte, kategori av/på mellan enqueue och retry, konto A → utloggning → konto B, offlineåterkallelse efter omstart samt kontoradering. Testa lokal påminnelse separat. Dokumentera leverans och öppnad route på båda plattformarna innan publicering.

## Primärkällor

- [Capacitor pushplugin](https://capacitorjs.com/docs/apis/push-notifications)
- [FCM HTTP v1](https://firebase.google.com/docs/cloud-messaging/send/v1-api)
- [APNs tokenbaserad anslutning](https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns)
- [Apples APNs-miljö](https://developer.apple.com/documentation/bundleresources/entitlements/aps-environment)
