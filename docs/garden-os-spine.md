# Garden OS data spine

Separate PR from Pulse. Mission: remove the worst re-entry. No graph DB. No second AI. No UI redesign.

## Canonical identity

| Field | Role |
|---|---|
| `sowings.variety` | Original user-entered display text. Never overwritten. |
| `sowings.crop_key` | Stable slug (`tomat`, `morot`, …) or `unknown`. Null on historical rows. |
| `sowings.variety_name` | Cultivar part (`Sungold`). |
| `sowings.id` + `sowings.bed_id` | Operational identity. Harvest / photo / pest / reminder attach here. |

Read path: stored `crop_key` if present, else lazy `deriveCropIdentity(variety)`.
Write path: new or edited sowings get keys. Old rows stay null until touched.
Catalogue match, custom variety, alias, and `UNKNOWN` are all valid.

## Migration safety

`supabase/migrations/20260902160000_garden_os_spine.sql`

- Nullable columns only: `sowings.crop_key`, `sowings.variety_name`, `sowings.seed_inventory_id`, `pest_logs.sowing_id`
- No `UPDATE` of existing rows
- `derive_crop_key()` exists for optional later backfill and is **not** executed
- FKs are `ON DELETE SET NULL`

## Wired in this PR

- Identity helpers + sowing attach helpers
- Reminders keep `display_text` and store durable `sowing_id` + `bed_id` + `source`
- Pest log optional `sowing_id` (bed / garden still allowed)
- Optional `seed_inventory_id` on sowing create (no germination analytics)
- Weather: saved lat/lon → zone centroid. Query keys are `'saved' | 'zone'` — coordinates never go to analytics
- Weather changes Pulse / gardenToday tasks. No new weather card
- `getGardenContext({ scope })` exported; Pulse TODAY is wired
- Pulse WHY labels + Klar / Logga / Snooze / Inte relevant
- Companion copy stays tradition, not proven pest-control

## Proposal / follow-up (not this PR)

- **Gro consumption of `getGardenContext`** — helper is exported; Gro still uses its existing live load. Do not dump the DB into Gro here.
- Quick log (natural-language write to sowing / harvest / reminder IDs)
- Forced historical backfill of `crop_key`
