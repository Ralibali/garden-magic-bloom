# Odlingsdagboken

Webbapp för svenska hemmaodlare: odlingsdagbok för bäddar, sådder, skörd, krukväxter, frölager och skadedjur — med zonanpassade råd, väderintelligens, påminnelser och AI-coachen Gro.

Produktion: [odlingsdagboken.com](https://odlingsdagboken.com)

## Teknik

- React 18 + TypeScript + Vite 5
- Tailwind CSS + shadcn/ui
- Lovable Cloud (Postgres, auth, storage, edge functions) med RLS på samtliga tabeller
- Stripe för Plus-abonnemang (99 kr/år, fjorton dagars provperiod)
- Gemini via Lovable AI Gateway för Gro, dagliga tips och fotoanalys

## Kom igång

```sh
npm install
npm run dev
```

Appen startar på `http://localhost:8080`. Miljövariabler finns i `.env.example`.

## Skript

| Kommando | Gör |
|---|---|
| `npm run dev` | Utvecklingsserver |
| `npm run build` | Produktionsbygge + prerendering av publika sidor |
| `npm run typecheck` | `tsc --noEmit` mot appens tsconfig |
| `npm run lint` | ESLint |
| `npm test` | Vitest |

## Struktur

```
src/pages/          Sidor och routes (app + publika SEO-sidor)
src/components/     UI-komponenter
src/lib/            Domänlogik (prioritering, livscykel, väder, statistik)
src/data/           Grödmatris, priser, zondata
supabase/functions/ Edge functions (mejl, AI, sitemap, Stripe m.m.)
docs/               Driftsanteckningar
```

Domänlogiken i `src/lib` är avsiktligt ren och enhetstestad — nya regler ska läggas där, inte i komponenter.

## Såtidssidor (SEO)

`/satider` och `/satider/:gröda` (en sida per gröda i såmatrisen, t.ex. `/satider/tomat`) svarar på "när ska man så …?" med veckor och datum för zon 1–8, FAQ och interna länkar. Innehållet räknas fram i `src/lib/sowingGuide.ts`, och samma modell används av React-sidorna och av prerender (`scripts/sowing-guide-pages.mjs`), som skriver fullständig HTML med `FAQPage`- och `BreadcrumbList`-schema. Prerender skriver också prenumererbara zonkalendrar till `/kalender/sakalender-zon-N.ics`. Sidorna kommer med i sitemap och `llms.txt` via `supabase/functions/_shared/satiderRoutes.ts`.

`/sista-frost` visar normal sista vårfrost och första höstfrost per zon och ort, med ortsök (`src/lib/frostGuide.ts`, samma zonveckor som såmatrisen). Startsidan och bloggartiklarna länkar till såtiderna för grödorna de nämner (`relatedGuideCrops`). Länkhjälparna i `src/lib/guideRoutes.ts` har inga beroenden på såmatrisen, så startsidans första JavaScript-paket hålls lätt.

Veckomejlet (`weekly-digest`) använder samma kalenderlogik via `supabase/functions/_shared/calendarLib.ts`: kalenderns förslag för veckan, användarens egna påminnelser och länkar till såtidssidorna. Mejlets HTML finns i `_shared/weeklyDigestHtml.ts` och testas i vitest.

## Odlingsdata

`src/data/sowingMatrix.ts` är enda källan för såtider per klimatzon. Kör `node scripts/export-sowing-weeks.mjs` efter ändringar så att edge functions får samma veckor via `supabase/functions/_shared/sowingWeeks.ts`.

## Odlingskalendern

`/app/calendar` är användarens personliga kalender. `src/lib/gardenCalendar.ts` slår ihop sådder, utplanteringar, skördar och påminnelser med såmatrisen för zonen och räknar fram:

- **beräknad utplantering** för förodlade plantor som står inne,
- **beräknad skörd** från den egna såddagen, med varning om skörden hamnar efter zonens säsong,
- **omgångssådd** för snabba grödor (rädisa, sallat, spenat m.fl.) medan direktsåfönstret är öppet,
- **frostmarkörer** för zonens normala sista frost och säsongsslut.

- **frostnätter från prognosen** (Open-Meteo), med namnen på de frostkänsliga plantor som står ute; bäddar som heter t.ex. ”Växthus” räknas som skyddade,
- **samma vecka förra året** i dagspanelen.

Vyerna är månad (med väder, och påminnelser som kan dras till en annan dag), agenda (8 veckor framåt) och årshjul. **Planera säsongen** gör valda grödor till datumsatta påminnelser för ett helt år; varje steg har en stabil `source_action_id` (`season-plan:<år>:<gröda>:<steg>`) så att planen aldrig läggs in två gånger. Startsidan visar veckans förslag i `CalendarWeekCard`.

**Synka med din kalender.** Användaren kan skapa en hemlig prenumerationslänk (webcal) som Google, Apple och Outlook hämtar ungefär var sjätte timme, eller ladda ner en `.ics`-fil en gång.

- `supabase/migrations/20260930120000_calendar_feed.sql` sparar bara en SHA-256-hash av länkens token. Klienter når tabellen enbart via RPC:erna `create_calendar_feed_token`, `revoke_calendar_feed_token` och `calendar_feed_status`. En ny länk gör den gamla ogiltig. `supabase/tests/calendar_feed.sql` körs i CI.
- Edge functionen `calendar-feed` (publik, `verify_jwt = false`) slår upp hashen med service role och returnerar `text/calendar`.
- Funktionen kör exakt samma kalenderlogik som appen via `supabase/functions/_shared/gardenCalendar.bundle.js`. Den filen genereras: kör `node scripts/export-calendar-feed.mjs` efter ändringar i `src/lib/gardenCalendar.ts` eller dess beroenden. `src/test/calendarFeed.test.ts` larmar om kopian är inaktuell.

Sådder har `plant_kind` (`edible` eller `ornamental`). Prydnadsväxter får blomnings- och övervintringsflöde i stället för skörd och räknas inte in i kg-statistiken.

## CI

`.github/workflows/verify.yml` kör typecheck, tester, lint och produktionsbygge på Node 22, plus `deno check` på edge functions.
