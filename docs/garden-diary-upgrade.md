# Sammanhållen odlingsdagbok

`/app/timeline` är nu **Min odlingsdagbok** och finns i huvudnavigationen för alla odlingsprofiler, även krukväxter. Mobilens mittknapp öppnar dagboken; Gro finns kvar i menyn och sidhuvudet.

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

Alla historikläsningar i `diaryApi.ts` pagineras förbi API:ets gräns per anrop. De synliga korten begränsas till 30 åt gången. Bildadresser signeras vid visning och cachas kortare tid än signaturens giltighet. Säsongssammanfattningar som registrerats ett annat år sorteras vid slutet av det år de beskriver.

## Rättningar

- En aktivitet med såddkoppling öppnar inte längre automatiskt skördeloggen. Skördeaktiviteter fyller i den riktiga sorten.
- Klart/senare/dölj visar framgång först efter bekräftad sparning.
- Fel vid säsongsuppslag stoppar sparning i stället för att försöka skapa en ny post.
- Fel vid dagboksläsning visar återförsök, inte en tom odling.
- Alla uppladdningsfält låses medan en bild sparas.

## Verifiering

- 16 nya regressionskontroller täcker datum, filtrering, källsammanfogning, navigering, sparfel och bevarande av säsongsfält.
- Hela testsviten: 203 tester i 41 filer godkända.
- TypeScript och ESLint; ESLint har befintliga varningar men inga fel.
- Produktionsbygge kör ordinarie artikel-, prerender-, värd- och publiceringskontroller.
- Läsfrågor mot den befintliga databasens fyra berörda tabeller bekräftar fält och relationsnamn med anonym behörighet. Inga produktionsdata har skrivits i verifieringen. Inloggad datalagring behöver därför även följas upp med ett riktigt konto.

Den privata Sites-förhandsversionen har separat publicering. GitHub-grenen är avsedd att granskas före ordinarie publicering på odlingsdagboken.com.
