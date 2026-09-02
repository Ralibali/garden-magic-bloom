-- Garden OS spine: nullable identity + hub FKs. No destructive rewrite of old rows.

ALTER TABLE public.sowings
  ADD COLUMN IF NOT EXISTS crop_key text,
  ADD COLUMN IF NOT EXISTS variety_name text,
  ADD COLUMN IF NOT EXISTS seed_inventory_id uuid REFERENCES public.seed_inventory(id) ON DELETE SET NULL;

ALTER TABLE public.pest_logs
  ADD COLUMN IF NOT EXISTS sowing_id uuid REFERENCES public.sowings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sowings_crop_key_idx ON public.sowings (user_id, crop_key);
CREATE INDEX IF NOT EXISTS sowings_seed_inventory_id_idx ON public.sowings (seed_inventory_id);
CREATE INDEX IF NOT EXISTS pest_logs_sowing_id_idx ON public.pest_logs (sowing_id);

-- Optional lazy backfill helper. Not executed on existing rows.
CREATE OR REPLACE FUNCTION public.derive_crop_key(display text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN display IS NULL OR btrim(display) = '' THEN 'unknown'
    WHEN lower(display) LIKE '%tomat%' OR lower(display) LIKE '%tomato%' THEN 'tomat'
    WHEN lower(display) LIKE '%morot%' THEN 'morot'
    WHEN lower(display) LIKE '%sallat%' OR lower(display) LIKE '%sallad%' THEN 'sallat'
    WHEN lower(display) LIKE '%gurka%' THEN 'gurka'
    ELSE 'unknown'
  END;
$$;

COMMENT ON COLUMN public.sowings.crop_key IS 'Canonical crop slug. Null on historical rows until lazily written.';
COMMENT ON COLUMN public.sowings.variety_name IS 'Cultivar part; sowings.variety stays the original display text.';
COMMENT ON COLUMN public.sowings.seed_inventory_id IS 'Optional seed batch. Nullable; no germination analytics.';
COMMENT ON COLUMN public.pest_logs.sowing_id IS 'Optional sowing hub. Bed- or garden-level pests remain valid.';
