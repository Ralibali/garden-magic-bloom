
ALTER TABLE public.plant_photos
  ADD COLUMN IF NOT EXISTS my_plant_id uuid
  REFERENCES public.my_plants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS plant_photos_my_plant_time_idx
  ON public.plant_photos (my_plant_id, taken_at DESC);
