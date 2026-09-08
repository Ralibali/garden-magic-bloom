# Mina odlingar och en sammanhållen dagbok

`/app/timeline` är nu **Min odlingsdagbok** och finns i huvudnavigationen för alla odlingsprofiler, även krukväxter. Mobilens mittknapp öppnar dagboken; Gro finns kvar i menyn och sidhuvudet.

## Mina odlingar

`/app/odlingar` samlar alla registrerade sådder och individuella växter, oavsett vald odlingsprofil. Den finns i huvudnavigationen och i mobilens nederkant. Tomma bäddar finns med bland platserna, utan att räknas som extra växter.

- Sök namn, art, plats och anteckning. Kombinera plats/växttyp med aktiva, behöver tillsyn, planerade, avslutade och alla år.
- Behov kommer från exakt kopplade påminnelser, öppna problem och förklarade tidsbaserade förslag. Gemensamma bäddproblem tillskrivs inte automatiskt varje växt.
- Visa odlingens foton, registrerad skördevikt, senaste aktivitet och kommande uppgifter. Alla relationer matchas med ID, även när namn återanvänds.
- Öppna rätt sådd eller växt, spara ett kopplat foto, planera nästa steg, fråga Gro med odlingens kontext eller visa just dess dagbok.
- Kontrollera jord och mående direkt på växtkortet. Vattning kräver ett eget aktivt val.
- Redigera växtens namn, placering, anteckningar och startintervall. Äldre historik bevaras. Växtbibliotekets förifyllda tillägg fungerar nu.
- Redigera såddens utvecklingsstadium direkt. Direktsådda grödor behöver inte markeras som förodlade för att gå vidare till skörd eller blomning.

## Användarflöde

- Sök i anteckningar, växtnamn och platser. Kombinera med år, månad, typ och odlingsplats.
- Följ sådder, utplanteringar, skördar, foton, växtvård, problem och säsongslärdomar på samma sida.
- Skriv, datera, redigera och radera fristående anteckningar. Osparad text behålls vid sparfel och stängning kräver ett aktivt val om innehållet ändrats.
- Öppna foton i storlek för närmare granskning. Fotoalbumet har fotograferingsdatum och koppling till krukväxt, sådd och bädd.
- Återöppnade säsongssammanfattningar hämtar tidigare värden. Bara redigerade platser sparas; orörda fält bevaras.

## Data och kompatibilitet

Befintlig autentisering, Supabase-tabeller och radbehörigheter används. Ingen databasmigration eller ny extern tjänst krävs.

Fristående anteckningar lagras i `plant_logs` med `plant_id = null` och `log_type = 'note'`. `created_at` representerar det valda dagboksdatumet, lagrat som UTC-middag så att läsning i Stockholm ger samma datum oavsett webbläsarens tidszon. Skapa/uppdatera/radera begränsas till autentiserad användare och just dessa anteckningar. Gamla växtbundna loggar ändras inte.

Dagboken läser `plant_care_events` för strukturerad vård och tar inte med dess äldre dubbelskrivningar i `plant_logs` eller `watering_log`. Äldre växtbundna anteckningar är fortsatt tillgängliga i respektive växts historik.

Alla historikläsningar i `diaryApi.ts` och `cultivationApi.ts` pagineras förbi API:ets gräns per anrop. De synliga korten begränsas till 30 åt gången. Bildadresser signeras vid visning och cachas kortare tid än signaturens giltighet. Säsongssammanfattningar som registrerats ett annat år sorteras vid slutet av det år de beskriver.

## Rättningar

- En aktivitet med såddkoppling öppnar inte längre automatiskt skördeloggen. Skördeaktiviteter fyller i den riktiga sorten.
- Klart/senare/dölj visar framgång först efter bekräftad sparning.
- Fel vid säsongsuppslag stoppar sparning i stället för att försöka skapa en ny post.
- Fel vid dagboksläsning visar återförsök, inte en tom odling.
- Alla uppladdningsfält låses medan en bild sparas.

Omsorgskontrollens primära post sparas i `plant_care_events` innan äldre kompatibilitetsvyer uppdateras. Samma post-ID återanvänds vid återförsök. Ett misslyckat primärt anrop behåller utkastet; fel i en efterföljande påminnelse eller kompatibilitetsuppdatering skiljs från en misslyckad kontroll. Detta är inte en databastransaktion över flera tabeller. Nya gödslings-, omplanterings- och anteckningshändelser finns också i dagboken. Beskärning lagras som en anteckning med metadata, enligt befintlig tabellbegränsning.

## Smartare och mer konsekventa råd

- Hela odlingen läses; tidigare gränser på 3 påminnelser, 2 växter, 20 sådder och 8 uppgifter har tagits bort från beräkningen. Visningen pagineras i stället.
- Uppskjutna, avslutade och dolda uppgifter respekteras också bland framtida uppgifter och i odlingsöversikten. Ett injicerat datum används genom hela beräkningen.
- Fuktig eller blöt jord innebär en ny kontroll inom två kalenderdagar från observationen. Gamla kontroller skjuter inte fram tillsyn för evigt, och stress får alltid företräde.
- En första kontroll utan vattning kan skjuta fram tillsyn. Framtida omsorgshändelser används inte som dagens historik.
- Redan utplanterade växter får inte avhärdningsråd bara för att de en gång förodlades. Prydnadsväxter antas inte ha knölar att gräva upp.
- Kalenderns skördefönster presenteras som ett säsongsriktmärke. Appen säger inte åt användaren att avsluta en verklig sådd enbart på grund av kalenderveckan.
- En växt utan observationer får en första kontroll, inte en påstådd hälsopoäng i de uppdaterade växtvyerna.

## Verifiering

- Regressioner täcker datum, filtrering, källsammanfogning, en stor odling med 165 poster, exakta kopplingar, återförsök, framtida/gamla observationer, primär sparning och bevarande av säsongsfält.
- Hela Vitest-sviten: 228 tester i 44 filer godkända, inklusive 41 nya regressioner i denna uppgradering.
- TypeScript och ESLint; ESLint har befintliga varningar men inga fel.
- Produktionsbygge kör ordinarie artikel-, prerender-, värd- och publiceringskontroller.
- Läsfrågor mot den befintliga databasens fyra berörda tabeller bekräftar fält och relationsnamn med anonym behörighet. Inga produktionsdata har skrivits i verifieringen. Inloggad datalagring behöver därför även följas upp med ett riktigt konto.

Den privata Sites-förhandsversionen har separat publicering. GitHub-grenen är avsedd att granskas före ordinarie publicering på odlingsdagboken.com.
