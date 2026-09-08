# Butiksmaterial – Odlingsdagboken 1.0

Utkast att publicera först efter att funktionerna verifierats på releasebygget.

**Namn:** Odlingsdagboken

**Apple-underrubrik:** Din odling, alltid nära

**Google-korttext:** Följ växter, spara foton och anteckna offline. Få egna odlingspåminnelser.

## Beskrivning

Ta med odlingsdagboken ut i trädgården.

Fånga den första grodden, tomaten som äntligen mognat och lärdomen du vill minnas nästa säsong. Odlingsdagboken hjälper dig att samla det som händer i din odling.

- Skriv fältanteckningar även utan internet och utan konto.
- Ta foton med kameran eller välj bilder från telefonen.
- Samla anteckningar kring växter och odlingsplatser.
- Skapa egna telefonpåminnelser om nästa steg.
- Sök bland iakttagelser, sådd, skötsel och skörd.
- Exportera en kopia med bilder och läs in den på en annan enhet.
- Logga in för att använda dina odlingar, sådder, skördar, växtbibliotek och övriga kontoverktyg.

Med Gro kan du be om AI-baserade odlingsråd efter att du valt om du vill dela dina uppgifter. AI kan ha fel; kontrollera råden mot dina egna observationer.

Appen är kostnadsfri. Kontofunktionernas omfattning beror på ditt befintliga konto. Konto och AI kräver internet. Fältdagboken lagras separat på enheten och synkroniseras inte automatiskt till kontot. Exportera innan du byter telefon eller avinstallerar. Påminnelser kräver tillåtna notiser och kan visas ungefär vid vald tid.

## Publika adresser – verifiera efter webbdriftsättning

- Integritet: https://odlingsdagboken.com/terms
- Kontoradering: https://odlingsdagboken.com/radera-konto
- Support: info@auroramedia.se
- Webbplats: https://odlingsdagboken.com

## App Privacy / Data safety-underlag

Native har ingen annonsmätning och begär ingen GPS-position. Den lokala fältdagboken lämnar inte enheten automatiskt. Följande kan däremot samlas in genom det valfria kontot: namn, e-post, användar-ID, odlingstext/anteckningar, uppladdade bilder, support/AI-rapporter samt manuellt vald ort och dess koordinater. Uppgifterna är kopplade till kontot och används för appfunktioner; AI-delning kräver samtycke. Ange valfri/obligatorisk status utifrån respektive faktisk funktion, krypterad överföring och raderingsmöjlighet. Bekräfta leverantörsavtal och eventuella uppgifter om delning/retention innan de slutliga formulären skickas in. Native `PrivacyInfo.xcprivacy` ersätter inte App Store Connect-formuläret.

Valfri serverpush samlar också installations-ID och APNs-/FCM-token kopplat till kontot för appfunktioner. Apple/Google förmedlar generell notistext. Avstängda installationer och utskicksloggar rensas efter 30 dagar; kontoradering tar bort kontots installationer och jobb. Återkallelsemarkörer utan konto-ID/token finns kvar högst 30 dagar. Redovisa enhetsidentifierare och faktisk leverantörsbehandling i butikernas formulär. Marknadsför inte serverpush som tillgänglig innan hela kedjan driftsatts och verifierats på båda plattformarna.

### Uppgifter att föra över till butikernas formulär

Detta är ett underlag från kod och policy, inte en bekräftelse av leverantörernas avtal eller driftsatta gallring. Lokala uppgifter ska skiljas från uppgifter som skickas till servern. En generell notis utan odlingstext innebär inte att push saknar kontokopplade identifierare.

| Uppgift | Mottagare | Ändamål och valfrihet | Radering |
| --- | --- | --- | --- |
| Lokala anteckningar, utkast och foton | Enheten; användarens valda destination vid export | Valfri fältdagbok utan konto | Radera lokal dagbok; exporterade kopior hanteras separat |
| Lokal påminnelses rubrik och tid | Enhetens operativsystem | Valfri uppföljning; rubriken kan synas på låsskärmen | Ta bort påminnelsen eller den lokala dagboken |
| E-post, namn, användar-ID och autentiseringsuppgifter | Lovable/Supabase-backend och konfigurerad mejltjänst | Konto är valfritt; e-post krävs för konto, namn är valfritt | Kontoradering; verifiera efterföljande gallring och säkerhetskopior |
| Molnlagrad odlingstext, platser, sådder, skördar och problem | Backend | Valfritt kontoinnehåll | Objekt- eller kontoradering |
| Uppladdade molnfoton | Backendens privata bildlagring | Valfri fotodagbok och växthistorik | Foto- eller kontoradering |
| Manuellt vald ort, koordinater och klimatzon | Backend och Open-Meteo | Valfri ort för väder och råd; ingen GPS-begäran | Kontoradering i backend; leverantörens loggar måste bekräftas |
| AI-frågor, valda bilder och kontots odlingskontext inklusive namn | Lovable AI Gateway och Google Gemini | Odlingsråd/bildanalys efter separat AI-samtycke | Återkallelse stoppar nya anrop; tidigare överföringar kan inte tas tillbaka av appen |
| AI-rapport: användar-ID, kategori, kommentar och rapporterat svar; supportmejl | Backend och den faktiska supportmejltjänsten | Valfri support och rapportering | Feedbackposter omfattas av kontoradering; separat mejlgallring måste bekräftas |
| Installations-ID, APNs-/FCM-token, kontokoppling och utskicksstatus | Backend, Apple APNs och Google Firebase | Valfri serverpush efter aktivering | Avregistrering kan köas offline; kontoradering tar bort installationer och jobb; gallringsjobbet måste vara driftsatt |
| Befintlig prenumerationsstatus/Stripe-kund-ID och tekniska åtkomstloggar | Backend, Stripe och driftleverantörer | Kontobehörighet, säkerhet och felsökning; inga betalningar i nativeappen | Faktisk retention för bokföring, loggar och säkerhetskopior kräver ägarbekräftelse |

Bekräfta AI-leverantörernas retention, träningsanvändning, regioner och raderingsmöjligheter. Bekräfta aktiva underbiträden, överföringsavtal, supportinkorgens leverantör och att angivna gallringsjobb faktiskt körs. Koden bevisar inte påståenden som ”delas inte”, ”ingen retention” eller ”endast inom EU”.

## Granskningsanteckning

Appen paketerar odlingsverktygen lokalt med Capacitor. Vid start finns en fungerande lokal fältdagbok utan konto eller nätverk. Kameran, privata fotofiler och lokala uppföljningsnotiser är inbyggda funktioner. Kontoåtkomst erbjuds via e-post/lösenord. Inga digitala köp eller länkar till köp erbjuds i appen. Tillhandahåll ett separat fungerande granskningskonto för kontofunktionerna genom butikens säkra granskningsfält; lägg inga inloggningsuppgifter i det här dokumentet.

## Skärmbilder att ta från slutligt installerat bygge

1. Fältdagbokens översikt med tydligt märkt exempelodling.
2. En öppen anteckning med foto och odlingsplats.
3. En egen uppföljningspåminnelse.
4. Mina odlingar med ett särskilt granskningskonto.
5. Dagbokens historik eller växtöversikt.

Använd verkliga appskärmbilder i butikernas aktuella storlekar. Använd inte riktiga kunders privata odlingar eller illustrerade skärmar som om de vore skärmbilder.

iOS-projektet stöder både iPhone och iPad. Verifiera därför även iPad-layout och ta en faktisk skärmbild för 13-tums iPad, exempelvis 2064 × 2752, innan submission. Se [Apples skärmbildskrav](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications).

Google Play behöver även en separat butikikon på 512 × 512 och en feature graphic på 1024 × 500. Dessa är inte samma filer som Androids installerade launcher-ikon. Det färdiga grafikpaketet återstår. Se [Google Plays grafikkrav](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).
