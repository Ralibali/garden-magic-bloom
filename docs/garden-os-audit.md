# Garden OS audit — Odlingsdagboken (Garden Magic Bloom)

Live: [odlingsdagboken.com](https://odlingsdagboken.com) · Aurora Media · repo `Ralibali/garden-magic-bloom`

**Date:** 2026-09-02
**Rule:** connect what exists. Do not add a graph database. Do not invent thirty features. Do not merge.

The owner backlog numbered “105” is **not in this repo** (no issue, doc, or comment). The eight first-sprint bets below are the top item in each required slot, chosen from what the product already stores.

---

## 0. Pulse decision

**SHIP a thin Pulse.** No new tables. No new route.

The operational chain already exists:

```
auth.users / profiles.user_id
        └── beds.id
                └── sowings.bed_id?  + sowings.variety (free text)
                        └── harvests.sowing_id?
                        └── plant_photos.sowing_id?
```

That is enough to answer *idag / den här veckan / saker som är sena / nothing-important-exists* from rows the user already typed.

**What is not a FK graph:** there is no `gardens` table (the user *is* the garden), and there is no `plant_id` on sowings. Canonical plant identity is the **OS-blocking join**, not the Pulse-blocking join.

Pulse in this PR:

- `src/lib/gardenPulse.ts` groups existing `buildGardenActions` output.
- `src/components/GardenPulse.tsx` renders the three buckets on `/app`.
- Replaces the buried `TodayInGarden` block on the edible dashboard. No extra nav item.

If a later change needs “Sungold in greenhouse bed 2” as one object everywhere, ship the schema patch in §1.4 — do not invent a graph DB.

---

## 1. Garden graph — what exists

### 1.1 Entity map

| Canonical entity | Where it lives | FKs / identity | Status |
|---|---|---|---|
| **USER** | `auth.users` + `public.profiles` (`src/integrations/supabase/types.ts`) | `profiles.user_id` → auth | Connected. Climate zone, premium, onboarding, prefs JSON. |
| **GARDEN** | *No table* | Implicit: all rows with `user_id` | **Orphaned as a concept.** One user = one unnamed garden. No multi-garden, no shared kolonilott. |
| **LOCATION** | `profiles.location_lat/lon/name` written from `NotificationsSettings.tsx` | Not referenced by weather | **Orphaned.** Forecasts use zone centroids in `gardenWeather.ts` and Gro (`coordinatesForZone`). |
| **BED** | `public.beds` | `user_id` | Connected downward. Name is free text (“Växthus bädd 2”). No type, no geometry, no garden_id. `season_notes` is a sticky note, not NEXT-SEASON. |
| **PLANT / CROP** | Three catalogues: `plants` (houseplant library), `seo_plants` (public SEO), `sowingMatrix` / `SOW_DATA` (static) | None of these are FKs on sowings | **Fragmented.** Same tomato can be a library row, an SEO slug, a matrix name, and a typed string. |
| **VARIETY** | Free-text `sowings.variety`, `harvests.variety`, `seed_inventory.variety` | String match only | **Worst re-entry.** Placeholder literally says “Tomat – Sungold”. |
| **SEED BATCH** | `public.seed_inventory` | `user_id` only | **Orphaned.** Prefills sowing via navigation state (`variety` + `brand`). No `seed_inventory_id` on sowings. |
| **SOWING** | `public.sowings` | `bed_id?`, `user_id`, `variety` text, `plant_kind` edible/ornamental, `seed_brand` text | **Hub of the edible graph.** Status lifecycle in `sowingLifecycle.ts`. |
| **PLANTING** | `sowings.transplant_date` + status `transplanted` | Same row as sowing | Exists as a field, not an entity. |
| **ACTION** | `reminder_settings.settings.reminders[]` JSON + `smart_action_state` | Optional `bed` *string*, `source_action_id`, `source_pest_log_id` | **Orphaned from IDs.** No `sowing_id`, no `bed_id`. |
| **WEATHER** | Open-Meteo via `gardenWeather.ts`, Gro, frost-alert function | Zone centroid, not bed, not lat/lon | Connected to tasks *when* frost/wind/drought fire in `gardenToday.ts`. Hero “12° · mulet” is decoration. |
| **OBSERVATION** | Split: `plant_care_events` (houseplants), `plant_logs`, photo `caption`/`analysis` | `plant_care_events.plant_id` → `my_plants` | Edible garden has no observation table. |
| **PHOTO** | `public.plant_photos` | `bed_id?`, `sowing_id?`, `my_plant_id?` | **Best-connected child.** Can hang off bed *or* sowing *or* houseplant. |
| **PROBLEM** | `public.pest_logs` | `bed_id?` only | No `sowing_id`. Treatment is a text column on the same row. |
| **TREATMENT** | `pest_logs.treatment` | Same row | Not a first-class entity. Follow-up reminder is JSON, not an FK. |
| **HARVEST** | `public.harvests` | `sowing_id?`, `bed_id?`, `variety` text (copied) | Connected *if* the user picks the sowing. Form still requires retyping variety unless they pick. |
| **RESULT** | `statistics` page + `season_summaries` + `seasonShare.ts` | Summaries have `bed_id?` + `year` | Partial. Stats group by variety *string*. |
| **NEXT-SEASON** | `season_summaries.grow_again` + `beds.season_notes` + CropRotation grid | `bed_id` + year | Connected to beds, not to sowings/varieties. Rotation guesses family from variety substring. |

### 1.2 Parallel graphs (do not merge them by accident)

```
EDIBLE / OUTDOOR
  user → beds → sowings → harvests
                 sowings → photos
                 beds    → pest_logs
                 beds    → season_summaries

HOUSEPLANT
  user → my_plants → plants (catalogue)
          my_plants → plant_care_events
          my_plants → watering_log
          my_plants → plant_logs
          my_plants → plant_photos.my_plant_id

PUBLIC SEO (no user_id)
  seo_plants ↔ seo_plant_months ↔ seo_months
  seo_plants ↔ seo_plant_zones  ↔ seo_zones
```

Onboarding `garden_categories` hides routes (`gardenModules.ts`) but does **not** share identity. A krukväxt user never writes `sowings`; Gro still concatenates both graphs into one prompt.

### 1.3 Worst re-entry (same Sungold, five times)

| Surface | What the user types again | Already had |
|---|---|---|
| Såkalender `/app/calendar` | Nothing — static `SOW_DATA`, **does not create sowings** | User’s beds/sowings unused |
| Public `/sakalender` | Zone + method checkboxes (lead capture) | Separate from app beds |
| Sålogg | Variety string + optional bed | Seed inventory can prefill variety/brand only |
| Påminnelser | Title + type + date; optional bed *name* | No sowing picker |
| Gro | Chat text (server *does* load beds/sowings) | User still names the plant in the question |
| Skördelogg | Variety string; optional sowing/bed pickers | Prefill from sowing works *if they navigate from sålogg* |
| Växtföljd | Nothing typed — **but** family is regex on variety text | Breaks if they wrote “Sungold” without “Tomat” |
| Fröförråd | Variety + brand again | One-way prefill into sålogg |
| Samplantering | Nothing typed — substring match on variety | “Tomat – Sungold” works; “Sungold” alone does not |
| Fotodagbok | Optional sowing/bed | Good when used |
| Växtbibliotek / Mina växter | Different object (`plants` / `my_plants`) | Not the greenhouse Sungold |

**Cheapest join (reuse IDs, no new DB):**

1. Always create harvests/photos/pests/reminders *from a sowing id* (UI contract). Already half-built for harvest + photo.
2. Put `sowing_id` and `bed_id` on reminder JSON (no migration).
3. Optional later: `sowings.seed_inventory_id` + a normalized `crop_key` text column on sowings and seed_inventory. Still no new table.

### 1.4 Schema patch — proposal only (not shipped)

Pulse does not need this. This is the cheapest patch *if* the next sprint must make “Sungold in greenhouse bed 2” one object:

```sql
-- Proposal only. Do not run in this PR.
alter table public.sowings
  add column if not exists seed_inventory_id uuid
    references public.seed_inventory(id) on delete set null,
  add column if not exists crop_key text;

alter table public.seed_inventory
  add column if not exists crop_key text;

alter table public.pest_logs
  add column if not exists sowing_id uuid
    references public.sowings(id) on delete set null;

create index if not exists sowings_crop_key_idx on public.sowings (user_id, crop_key);
```

`crop_key` = `'tomat'` from “Tomat – Sungold”. Rotation, companion match, harvest forecast, and SEO slugs can all key off it. Still not a graph database.

Do **not** add `gardens` until a user has two real properties. Do **not** add Neo4j / edges / embeddings.

---

## 2. Surface inspection (observe, do not add)

| Surface | Verdict |
|---|---|
| **Beds** | Real hub. Free-tier 3. No location type (växthus vs pallkrage is a name). |
| **Sowings** | Real hub. Free-tier 10. Lifecycle + harvest hint + Gro prompt include bed name when joined. |
| **Harvests** | FK-capable. Variety still required as text. |
| **Statistics** | Groups by variety string + `cropPrices.ts`. 3-season useful *if* variety spelling is stable. |
| **Reminders** | JSON blob on `reminder_settings`. Works for Pulse. Not joinable. |
| **Premium** | 99 kr/år, 14-day trial. Limits: 3 beds, 10 sowings, 3 Gro/day. |
| **Sowing calendar `/app/calendar`** | Hardcoded `SOW_DATA` months. **Does not read user sowings.** Second calendar. |
| **Public `/sakalender`** | Uses `sowingMatrix.ts` (authoritative weeks). Lead capture. Not the app calendar. |
| **Crop rotation** | Reads beds + sowings + season_summaries. Family map is a substring dictionary. |
| **Seed inventory** | Orphan table. Expiry helper is local. |
| **Timeline** | Derived view of sowings/harvests. Good OS surface. |
| **Companion planting** | Folklore table + substring analysis. See `docs/companion-planting-truth.md`. |
| **Pest log** | Bed-level only. Creates a follow-up reminder (good) without sowing_id (bad). |
| **Photo diary** | Best join of the late features. Analysis JSON optional. |
| **Plant library / My plants** | Houseplant OS. Do not force it onto edible sowings. |
| **Gardening Coach (Gro)** | Already loads beds, sowings, harvests, plants, pests, photos, seasons, reminders, zone weather. **Ask My Garden is 80% shipped.** Identity is still prompt-text, not IDs. |
| **Public plant content** | `seo_*` tables + prerender. Parallel catalogue. |
| **Growing zones** | Profile `climate_zone` 1–8. Weather = centroid. `location_*` unused by forecast. |
| **Monthly calendar** | `/odlingskalender` SEO, not the user’s plan. |
| **Growing plan `/odlingsplan`** | Public planner / lead. Does not write `beds`. |
| **Odlingsakuten** | Public triage → Gro. No pest_log write. |
| **SEO/blog** | `/blogg`, prerender, IndexNow, `llms.txt`. Separate from garden graph. |
| **Plausible catalogue** | Typed events in `plausible.ts`: Signup, Trial, Checkout, Purchased, First Cultivation. Plus legacy `plausibleEvent`. Internal `recordProductActivity` is a *second* product log (`click_events` / `analytics_events`) — do not add a third tracker. |
| **Prerender routes** | `scripts/prerender.mjs` already covers `/`, `/sakalender`, `/odlingsplan`, `/odlingsakuten`, `/gro`, `/blogg`, `/vaxter`, `/odlingskalender`, `/zoner`, `/install`, plus dynamic slugs. |
| **XLSX** | **Import only** (`importUtils.ts` / `DataImporter`). Export is CSV + HTML-print PDF. No XLSX export. |
| **PWA / offline** | `pwa.ts` + `sw.js`. Prod-only registration. Offline is app-shell, not garden data. |
| **Companion claims** | Flagged; one qualifier shipped. |

Chicken-coop leftovers (`daily_chores`, `flocks`, …) were dropped in `20260307012716_…`. Types file is slightly stale (`weekly_email_enabled`, `public_leads`, `analytics_events` exist in later migrations but not all in `types.ts`).

---

## 3. Nine prototypes — scored, not shipped

Scale: **L / M / H** unless noted. **AI cost** = extra model spend beyond Gro’s current live-context call. **Kill** = stop if this is true.

### 3.1 Garden Pulse — **SHIPPED (thin)**

| | |
|---|---|
| **User value** | H — one screen instead of five modules for “what now?” |
| **Current data** | sowings, beds, reminders JSON, my_plants care, Open-Meteo, harvest hints |
| **Missing data** | sowing_id on reminders; crop_key (degrades labels, not the buckets) |
| **Build cost** | L — grouping over `gardenToday` |
| **AI cost** | None |
| **Retention** | H — daily reason to open |
| **Monetization** | M — natural place for Plus when limits hit |
| **Differentiation** | H — Swedish zone + *their* beds, not a generic calendar |
| **Cheapest prototype** | This PR |
| **Kill condition** | Empty for users who have sowings (logic too shy) **or** always noisy (logic too eager) |

Rank: **1**

### 3.2 Ask My Garden

| | |
|---|---|
| **User value** | H — Gro already answers from live rows |
| **Current data** | Full Gro context in `gardening-coach/index.ts` |
| **Missing data** | Structured “this sowing” handle; user still names Sungold |
| **Build cost** | L — Pulse “Fråga Gro” already passes a seeded prompt |
| **AI cost** | Same as today’s Gro (Gemini 2.5 Pro per message) |
| **Retention** | H if grounded; L if it hallucinates beds |
| **Monetization** | H — 3/day free cap already exists |
| **Differentiation** | H if it cites *their* sowing dates |
| **Cheapest prototype** | Keep Pulse → Gro deep link; do not build a second chat |
| **Kill condition** | Answers ignore the live context block |

Rank: **2** (already exists; do not rebuild)

### 3.3 Natural-language quick log

| | |
|---|---|
| **User value** | H for dirty-hands &lt;10s |
| **Current data** | createSowing / createHarvest / pest insert APIs |
| **Missing data** | Parser + confirmation UI; crop_key |
| **Build cost** | M |
| **AI cost** | M per log if model-parsed; L if regex + picker |
| **Retention** | H |
| **Monetization** | M (Plus: unlimited logs) |
| **Differentiation** | M — many apps have this; wins only if it writes **IDs** |
| **Cheapest prototype** | One field: “1 kg Sungold” → harvest on matching sowing_id |
| **Kill condition** | Creates a second variety string instead of attaching to sowing |

Rank: **3**

### 3.4 Season recap

| | |
|---|---|
| **User value** | H in Sep–Oct (dialog already gated) |
| **Current data** | harvests, sowings, season_summaries, `seasonShare.ts`, `seasonJourney.ts` |
| **Missing data** | Prefill from actual kg/variety; grow_again not applied to next year |
| **Build cost** | L — prefill the existing wrap dialog |
| **AI cost** | None if deterministic; L if Gro writes prose |
| **Retention** | H — this *is* the 3-season loop |
| **Monetization** | M — “keep last year’s numbers” is the Plus story |
| **Differentiation** | H in Swedish hobby market |
| **Cheapest prototype** | Prefill wrap from harvests grouped by bed |
| **Kill condition** | Recap that does not write `season_summaries` |

Rank: **4**

### 3.5 Next-season plan

| | |
|---|---|
| **User value** | H in Nov–Feb |
| **Current data** | season_summaries.grow_again, rotation grid, seed inventory, sowingMatrix |
| **Missing data** | A plan row that *is* next year’s sowings (or a `year` on a draft sowing) |
| **Build cost** | M if it writes sowings; H if a new plan entity |
| **AI cost** | L optional |
| **Retention** | H (3-season test) |
| **Monetization** | M |
| **Differentiation** | H if it starts from *their* beds |
| **Cheapest prototype** | “Odla igen” on a season_summary creates a sowing draft on the same bed_id |
| **Kill condition** | A planner that does not reuse bed_id / last year’s variety |

Rank: **5**

### 3.6 Personal growing recipes

| | |
|---|---|
| **User value** | M–H after two seasons |
| **Current data** | sow_date, harvest_date, weight, bed, season notes |
| **Missing data** | crop_key; enough years; outcome label |
| **Build cost** | M |
| **AI cost** | L if rules (“Sungold in växthus: 4.2 kg, sow week 12”) |
| **Retention** | H |
| **Monetization** | H (this is Plus knowledge) |
| **Differentiation** | H |
| **Cheapest prototype** | Per-variety card: last sow date, kg, grow_again |
| **Kill condition** | Recipes generated from sowingMatrix instead of the user’s rows |

Rank: **6**

### 3.7 Weather-adaptive tasks

| | |
|---|---|
| **User value** | H when it *changes the list*; **zero** as a card |
| **Current data** | Open-Meteo + `gardenToday` frost/wind/dry actions + `frostWarning.ts` |
| **Missing data** | User lat/lon already stored, unused; no per-bed microclimate |
| **Build cost** | L — use `profiles.location_*` in `getGardenForecast` |
| **AI cost** | None |
| **Retention** | M |
| **Monetization** | L |
| **Differentiation** | M (weather apps exist); H if it names *their* frost-tender sowings |
| **Cheapest prototype** | Point forecast at stored lat/lon; keep frost action only when min ≤ 2 |
| **Kill condition** | A weather card that does not add/remove a Pulse row (**decoration — killed**) |

Rank: **7** (keep the actions, kill the card)

### 3.8 Shareable season story

| | |
|---|---|
| **User value** | M |
| **Current data** | `buildSeasonSummary` + Web Share; harvest kg; zone |
| **Missing data** | Photos in the share card; opt-in public URL |
| **Build cost** | L — surface existing helper |
| **AI cost** | None |
| **Retention** | L–M |
| **Monetization** | L directly; M as growth |
| **Differentiation** | L |
| **Cheapest prototype** | Button on statistics that calls `shareSeasonText` |
| **Kill condition** | Share image that invents kg |

Rank: **8**

### 3.9 Garden map / digital twin

| | |
|---|---|
| **User value** | M (delight), L for dirty-hands |
| **Current data** | Bed names only. No width, path, GPS, neighbors. |
| **Missing data** | Everything spatial |
| **Build cost** | H |
| **AI cost** | None |
| **Retention** | L until year 3 of drawings |
| **Monetization** | L |
| **Differentiation** | L (every garden app mockup) |
| **Cheapest prototype** | Do not. A named list of beds *is* the map. |
| **Kill condition** | **Killed now.** Fails dirty-hands and 3-season tests. |

Rank: **9 — do not build**

### Ranking

1. Garden Pulse (ship)
2. Ask My Garden (already live — connect, don’t rebuild)
3. Natural-language quick log (ID-writing only)
4. Season recap (prefill existing wrap)
5. Next-season plan (draft sowing from grow_again)
6. Personal growing recipes (per-variety history card)
7. Weather-adaptive *tasks* (lat/lon; no card)
8. Shareable season story (surface `seasonShare`)
9. Garden map — **kill**

---

## 4. Eight first-sprint bets

Constraints: 3-season test, dirty-hands &lt;10s, existing data, no school/kolonilott/B2B (Lane C later).

| Slot | Bet | Why this one | Uses existing | Kill if |
|---|---|---|---|---|
| **Activation** | One capture: bed name + first sowing (Sungold → Växthus bädd 2) on empty state | Setup-incomplete already branches; GettingStartedGuide exists | `beds`, `sowings` | User still lands on five empty modules |
| **Daily / weekly value** | Garden Pulse on `/app` | This PR | `gardenToday` + reminders JSON | Pulse empty while sålogg has late sowings |
| **Retention** | Prefill season wrap from harvests by bed | Dialog + `season_summaries` already exist | harvests, beds, summaries | Wrap saves prose that never appears in rotation / Gro |
| **Intelligence** | Pulse → Gro with sowing/bed already in the prompt (no second chat) | Gro already loads live rows | `gardening-coach` context | New “AI garden brain” project |
| **Mobile / PWA** | Pulse as the above-fold home; Klar / Imorgon stay &lt;10s | PWA + action state already there | `smart_action_state` | New install-only marketing page |
| **Growth** | One share button using `seasonShare.ts` on statistics / wrap | Helper is written and tested | harvests, sowings, beds | Public garden URLs or social pixel |
| **Monetization test** | Plus CTA only when Pulse action hits a free limit (4th bed / 11th sowing / 4th Gro) | Limits and checkout exist | `PremiumGate`, Stripe | New SKU or “Pulse Pro” |
| **Technical quality** | Reminder JSON: add `sowing_id` + `bed_id` on create; harvest/photo already know how | No migration | `addReminder`, Harvests, PhotoDiary | New `actions` table |

Lane C (school, kolonilott, B2B) stays off the first sprint.

---

## 5. Kill list (decoration and sprawl)

- Weather **card** that does not add or remove a Pulse task.
- `DashboardActionCenter` month folklore (“Förodla tomat”) for users who already have sowings — generic, not their garden.
- Rebuilding Ask My Garden as a new product.
- Garden map / digital twin.
- Companion-planting pest-control as fact (see truth note).
- A second analytics tracker (Plausible + `recordProductActivity` is enough).
- Fake frost from `LAST_FROST_DATES` when Open-Meteo is already in repo — zone-average dates are fallback only.
- Unifying `plants` (houseplants) with `sowings` in one table.
- New `gardens` table before a user has two properties.
- Graph database, embeddings garden, or “knowledge graph” rewrite.
- Stayboost / updro (out of scope).
- Merging or publishing this PR.

---

## 6. Pulse implementation (this PR)

**Allowed because** user → bed → sowing already exists and Pulse only **reads**.

| File | Role |
|---|---|
| `src/lib/gardenPulse.ts` | Groups urgent → late, today → idag, soon + upcoming reminders → week |
| `src/lib/gardenPulse.test.ts` | Empty, late, week-ahead, completed-hidden |
| `src/components/GardenPulse.tsx` | Three buckets + nothing-important-exists |
| `src/pages/Dashboard.tsx` | Pulse above the fold; `TodayInGarden` removed from edible collapsible (kept for krukväxter) |

Reversible: delete the three files and restore the `PrimaryActionCard` / `TodayInGarden` block.

No new tables. No new nav. No companion folklore in Pulse. No second tracker. Frost rows appear only when `gardenToday` already has a weather source.

---

## 7. Done criteria

- [x] Audit in `docs/garden-os-audit.md` and in the PR body
- [x] Pulse is a thin existing-data screen (not a schema-blocked NO-SHIP)
- [x] Blocking OS join named: **canonical crop/variety identity** (`sowings.variety` text vs catalogues); Pulse does not wait on it
- [x] PR stays draft; do not merge
