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

## Odlingsdata

`src/data/sowingMatrix.ts` är enda källan för såtider per klimatzon. Kör `node scripts/export-sowing-weeks.mjs` efter ändringar så att edge functions får samma veckor via `supabase/functions/_shared/sowingWeeks.ts`.

Sådder har `plant_kind` (`edible` eller `ornamental`). Prydnadsväxter får blomnings- och övervintringsflöde i stället för skörd och räknas inte in i kg-statistiken.

## CI

`.github/workflows/verify.yml` kör typecheck, tester, lint och produktionsbygge på Node 22, plus `deno check` på edge functions.
