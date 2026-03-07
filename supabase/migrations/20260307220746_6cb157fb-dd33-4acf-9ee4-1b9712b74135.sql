
-- Plant library (public read)
CREATE TABLE public.plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_sv text NOT NULL,
  category text NOT NULL,
  subcategory text,
  light text,
  water text,
  sow_month text,
  plant_out_month text,
  harvest_month text,
  temp_min int,
  temp_max int,
  watering_interval_days int
);

ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plants" ON public.plants FOR SELECT USING (true);
CREATE POLICY "Admins manage plants" ON public.plants FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User houseplants
CREATE TABLE public.my_plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plant_id uuid REFERENCES public.plants(id),
  custom_name text,
  location text,
  watering_interval_days int DEFAULT 7,
  last_watered date,
  fertilizing_interval_days int,
  last_fertilized date,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.my_plants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own plants" ON public.my_plants FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Watering log
CREATE TABLE public.watering_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plant_id uuid REFERENCES public.my_plants(id) ON DELETE CASCADE,
  watered_at timestamptz DEFAULT now()
);

ALTER TABLE public.watering_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own watering log" ON public.watering_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Plant activity logs
CREATE TABLE public.plant_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plant_id uuid REFERENCES public.my_plants(id) ON DELETE CASCADE,
  log_type text NOT NULL,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.plant_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own plant logs" ON public.plant_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
