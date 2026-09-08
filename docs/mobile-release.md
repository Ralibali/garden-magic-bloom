# Odlingsdagboken för iOS och Android

Mobilappen använder Capacitor 8 med den befintliga React-appen som paketerade filer. `server.url` används inte. Webbbygget behåller sin egen ingång, annonsering, samtyckeshantering och betalning.

## Identitet och releasestatus

- Visningsnamn: **Odlingsdagboken**.
- Föreslaget Bundle ID / applicationId: **com.odlingsdagboken.app**. Bekräfta att det matchar eventuell befintlig butiksapp innan identifieraren registreras eller en release signeras.
- Appversion: **1.0**, build **1**. Höj buildnummer inför varje ny butiksuppladdning.
- Minsta OS: iOS 15 / Android 7 (API 24). Android compile/target SDK 36.
- Distributionsmodell: gratis följeapp. Native har inga köp, Stripe-kassor, portal- eller uppgraderingslänkar. Befintliga kontorättigheter respekteras.
- Ingen automatisk publicering ingår i dessa byggkommandon. Ett lyckat osignerat bygge är inte en uppladdad, granskad eller publicerad app.

## Vad som fungerar lokalt

`/faltdagbok` kräver varken inloggning eller internet. Den innehåller daterade anteckningar, typ av händelse, växt/plats, sökning, fem bilder per anteckning, egna påminnelser, papperskorg, återställning och export/import.

Anteckningarna ligger i två validerade revisionsfiler i appens privata Data-katalog. Varje skrivning använder den äldre filen och verifieras genom återläsning. En avbruten skrivning kan återhämtas från den senaste kompletta generationen. Ett faktiskt fil-läsfel stoppar nya skrivningar. Fotografier sparas separat, skalas till högst 1800 pixlar och kodas om utan EXIF-position.

Utkast bevaras före kamera och bakåtnavigation. Androids återställda kameraresultat binds till samma utkast. Telefonpåminnelser räknas om från aktuell lagring i en seriell kö; högst 60 kommande notiser schemaläggs. Android använder ungefärlig tid utan tillstånd för exakta alarm. Behörighet efterfrågas först när användaren själv sparar en påminnelse.

Fältdagboken är separat från molnkontot och synkroniseras inte automatiskt. Den finns kvar efter utloggning/kontoradering. Exportera innan avinstallation eller telefonbyte. Säkerhetskopior innehåller anteckningar och foton; gränsen är 100 MiB per fil. Import bevarar befintliga poster och remappar kolliderande notis-ID:n. Appens egen lokala radering tar bort journal, bilder, notiser och exporterade journalfiler i appcachen. Kopior som användaren redan delat till en annan app måste hanteras där.

Serverstyrda frost- och morgonnotiser har nu APNs-/FCM-kod för mobil och separat webbtransport. Pushdatabasen är förberedd; edge-funktioner, rätt nycklar och faktisk enhetsleverans återstår; se [notisernas implementationsstatus](mobile-notifications.md).

CI i `.github/workflows/native.yml` bygger båda plattformarna utan distributionssignering. Android-jobbet återanvänder samma SDK-licensmarkör som redan finns i projektägarens installerade SDK och accepterar inga nya licenser automatiskt.

## Konto, AI och integritet

Mobilappen använder e-post/lösenord. Bekräftelse och lösenordsåterställning öppnas på `https://odlingsdagboken.com`; därefter återgår användaren till appen. Webbens Google/Apple-inloggning bevaras. Native OAuth/deep links har inte lagts till.

AI-samtycke är versionsmärkt, bundet till användaren och sparat på enheten. Gro monteras inte och skickar inte en autohälsning före samtycke. Bild- och fröpåseanalys kontrollerar samma beslut före API-anropet. Återkallelse finns i inställningarna. AI-svar kan rapporteras till den befintliga feedbackadministrationen utan att hela samtalet eller fotografier skickas med.

Native-ingången innehåller inga Google Ads/Plausible-taggar. Webbanalys, service worker och installationsuppmaning används inte i native. Manuell ortsökning sparar ortens koordinater för väder; appen begär inte enhetens GPS-position.

`delete-account` har ändrats så att produktens aktiva Stripe-prenumerationer avslutas, foton i användarens Storage-katalog tas bort, databasfel inte ignoreras och auth-kontot raderas sist. Processen är återförsökbar men externa Stripe-/Storage-steg kan inte vara en gemensam databastransaktion. Återförsök vid delvis misslyckad radering. Raderingen begränsas till inloggad användare och Odlingsdagbokens pris-ID; fakturaunderlag bevaras hos Stripe.

**Backend måste driftsättas och verifieras före butikssubmission.** Rätt Supabase-projekt är `ysonnvbkrwajacvdkqut`. Den separata Supabase-anslutningen saknar åtkomst, men databasåtkomst finns via Lovable-projekt `57180308-833a-4411-a64b-9d965797edb1`. Native-push-migrationen är applicerad och rättigheterna verifierade där. Använd inte något annat anslutet projekt. Ändrade funktioner: `delete-account`, `create-checkout`, delad `accountDeletion.ts`. Kontoraderingssidan `/radera-konto` och uppdaterade `/terms` måste också finnas på den publika webbplatsen före submission.

Push kräver dessutom fem edge-funktioner, cron och APNs-/FCM-konfiguration enligt [notisguiden](mobile-notifications.md). iOS privacy manifest redovisar enhets-ID kopplat till konto för appfunktioner. Bekräfta även butikernas integritetsformulär.

## Bygga

```sh
npm ci
npm run typecheck
npm test -- --maxWorkers=1
npm run build:native
npx cap sync
```

Bygget använder `native.html` och skriver `dist-native/index.html`. Byggkontrollen avvisar webbmätning/service worker i den ingången. Kör nativebygge och `cap sync` efter varje ändring av webbkoden före plattformsbygge. Vite-webbbygget använder fortsatt `npm run build` och prerender.

iOS, simulator utan distributionssignering:

```sh
npm run build:native:dev
npx cap sync ios
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath .mobile-build/ios -jobs 1 \
  CODE_SIGNING_ALLOWED=NO build
```

Android, efter installation av JDK 21, API 36 och build-tools 36.0.0:

```sh
cd android
./gradlew --no-daemon --max-workers=1 :app:assembleDebug :app:bundleRelease
```

`app-debug.apk` är en testapp. En `.aab` utan konfigurerad upload key är **osignerad** och kan inte publiceras. Lägg aldrig keystore, lösenord, Apple-certifikat eller profiler i Git. Använd Android Studios signeringsdialog eller skyddade bygghemligheter. iOS signeras genom rätt Apple-team i Xcode/Organizer.

Inför iOS Release/TestFlight/App Store: kör `npm run build:native` och `npx cap sync ios` på nytt. Det sätter APNs till production; Xcode stoppar ett Releasebygge med sandbox-paket. För Androids riktiga push krävs korrekt `android/app/google-services.json` och FCM-serverkonfiguration. CI använder inga riktiga pushnycklar och kan inte verifiera leverans.

## Verifiering före submission

1. Installera senaste byggda version på riktig iPhone och Androidtelefon. Skapa anteckning/foto/påminnelse offline, stäng appen, starta om och verifiera innehållet.
2. Neka och tillåt kamera/foton/notiser. Kontrollera att text sparas även när en behörighet nekas, att en avklarad/raderad notis försvinner och att en notifiering öppnar rätt anteckning.
3. Exportera, radera den lokala testdagboken med bekräftelse och läs in kopian. Kontrollera text, bilder och remappade notis-ID:n. Testa både bara utkast och bara papperskorg.
4. Testa konto utan/med befintlig Plus, e-postbekräftelse, återställning, utloggning, AI-nej/ja/återkallelse och rapport. Kontrollera alla synliga menyer och externa länkar mot gratis följeappens omfattning.
5. Testa full kontoradering med ett särskilt testkonto, inklusive nästlade Storage-foton och en Stripe-testprenumeration. Använd aldrig kundens riktiga odlingar som testdata.
6. Inspektera Androids sammanslagna manifest och APK: ingen `SCHEDULE_EXACT_ALARM`, inga breda bild-/lagringsbehörigheter; kontrollera alla `.so`-filers ELF-alignment och APK med `zipalign -c -P 16 -v 4`.
7. Bekräfta slutliga integritetsuppgifter, offentliga policy-/raderingslänkar, support, granskningskonto, app-ID, säljare/EU-handlarstatus och verkliga skärmbilder. Markera inte dessa som klara på grund av ett lyckat kodbygge.

## Aktuella externa butikskrav, kontrollerade 8 september 2026

- Apple kräver iOS 26 SDK eller senare för nya uppladdningar sedan 28 april 2026. Det är bygg-SDK, inte lägsta stödda iOS. [Apple](https://developer.apple.com/news/?id=ueeok6yw)
- Google kräver target API 36 för nya appar/uppdateringar sedan 31 augusti 2026. [Google Play](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- Native verktyg, offlineinnehåll och kamera ger konkret mobilnytta; butiksgodkännande garanteras inte av att använda Capacitor. [Apple 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality)
- Gratis följeapp får inte leda användaren till externa digitala köp i denna version. [Apple](https://developer.apple.com/app-store/review/guidelines/#other-purchase-methods), [Google](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en-GB)
- Kontoradering ska kunna initieras i appen; Google kräver också en offentlig webbresurs. [Apple](https://developer.apple.com/support/offering-account-deletion-in-your-app/), [Google](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- Vissa nya personliga Play-konton behöver 12 testare i 14 sammanhängande dagar före produktionsåtkomst. Det kan inte ersättas av lokala automatiska tester. [Google](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB)
