ALTER TABLE public.plant_photos
  ADD COLUMN IF NOT EXISTS analysis jsonb,
  ADD COLUMN IF NOT EXISTS analyzed_at timestamptz;

CREATE INDEX IF NOT EXISTS plant_photos_my_plant_taken_idx ON public.plant_photos(my_plant_id, taken_at DESC);