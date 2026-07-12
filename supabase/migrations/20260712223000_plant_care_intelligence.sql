CREATE TABLE IF NOT EXISTS public.plant_care_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plant_id uuid NOT NULL REFERENCES public.my_plants(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'health_check'
    CHECK (event_type IN ('health_check', 'watered', 'fertilized', 'repotted', 'moved', 'note')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  soil_moisture text
    CHECK (soil_moisture IS NULL OR soil_moisture IN ('very_dry', 'dry', 'moist', 'wet')),
  health_rating smallint
    CHECK (health_rating IS NULL OR health_rating BETWEEN 1 AND 5),
  symptoms text[] NOT NULL DEFAULT '{}',
  water_amount text
    CHECK (water_amount IS NULL OR water_amount IN ('little', 'normal', 'thorough')),
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plant_care_events_plant_time_idx
  ON public.plant_care_events (plant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS plant_care_events_user_time_idx
  ON public.plant_care_events (user_id, occurred_at DESC);

ALTER TABLE public.plant_care_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own plant care events" ON public.plant_care_events;
CREATE POLICY "Users can view own plant care events"
  ON public.plant_care_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own plant care events" ON public.plant_care_events;
CREATE POLICY "Users can create own plant care events"
  ON public.plant_care_events FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.my_plants
      WHERE my_plants.id = plant_care_events.plant_id
        AND my_plants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own plant care events" ON public.plant_care_events;
CREATE POLICY "Users can update own plant care events"
  ON public.plant_care_events FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own plant care events" ON public.plant_care_events;
CREATE POLICY "Users can delete own plant care events"
  ON public.plant_care_events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.plant_care_events IS
  'Structured plant observations used to learn each individual plant watering rhythm and health.';
