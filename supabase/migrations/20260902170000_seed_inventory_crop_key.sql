-- Additive: seed batches get the same nullable crop_key as sowings.
-- Does not rewrite variety text.

alter table public.seed_inventory
  add column if not exists crop_key text;

comment on column public.seed_inventory.crop_key is
  'Canonical crop slug. Null on historical rows until lazily written.';
