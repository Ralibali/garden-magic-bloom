
-- Seed inventory table
CREATE TABLE public.seed_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  variety text NOT NULL,
  brand text,
  quantity text,
  expiry_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seed_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own seed inventory"
  ON public.seed_inventory FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Plant photos table
CREATE TABLE public.plant_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bed_id uuid REFERENCES public.beds(id) ON DELETE SET NULL,
  sowing_id uuid REFERENCES public.sowings(id) ON DELETE SET NULL,
  photo_url text NOT NULL,
  caption text,
  taken_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plant_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own plant photos"
  ON public.plant_photos FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Pest/disease log table
CREATE TABLE public.pest_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bed_id uuid REFERENCES public.beds(id) ON DELETE SET NULL,
  pest_name text NOT NULL,
  treatment text,
  severity text DEFAULT 'medium',
  observed_date date NOT NULL DEFAULT CURRENT_DATE,
  resolved boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pest_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pest logs"
  ON public.pest_logs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
