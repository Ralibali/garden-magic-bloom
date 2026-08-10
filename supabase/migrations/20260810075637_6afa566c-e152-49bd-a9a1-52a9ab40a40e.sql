ALTER TABLE public.sowings
  ADD COLUMN IF NOT EXISTS plant_kind text NOT NULL DEFAULT 'edible';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sowings_plant_kind_check'
  ) THEN
    ALTER TABLE public.sowings
      ADD CONSTRAINT sowings_plant_kind_check CHECK (plant_kind IN ('edible','ornamental'));
  END IF;
END $$;

UPDATE public.sowings
SET plant_kind = 'ornamental'
WHERE plant_kind = 'edible'
  AND variety ~* '(dahlia|georgin|tulpan|narciss|pion|ros\b|rosor|lavendel|tagetes|ringblomma|lupin|riddarsporre|zinnia|cosmos|rudbeckia|luktärt|gladiolus|lilja|krokus|hyacint|iris|vallmo|pensé|penseer|viol|begonia|pelargon|petunia|snittblomma|sommarblomma|solros|sommarflox)';