-- ============================================================
-- SEO Infrastructure (Del 1 av 4) — programmatic SEO content
-- ============================================================

-- ---------- seo_plants ----------
CREATE TABLE public.seo_plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  name_alternatives text[],
  latin_name text,
  category text CHECK (category IN ('grönsak', 'frukt', 'bär', 'krydda', 'blomma', 'rotfrukt')),

  sow_indoor_start int CHECK (sow_indoor_start BETWEEN 1 AND 12),
  sow_indoor_end int CHECK (sow_indoor_end BETWEEN 1 AND 12),
  sow_outdoor_start int CHECK (sow_outdoor_start BETWEEN 1 AND 12),
  sow_outdoor_end int CHECK (sow_outdoor_end BETWEEN 1 AND 12),
  harvest_start int CHECK (harvest_start BETWEEN 1 AND 12),
  harvest_end int CHECK (harvest_end BETWEEN 1 AND 12),

  germination_days_min int,
  germination_days_max int,
  days_to_harvest_min int,
  days_to_harvest_max int,
  plant_spacing_cm int,
  row_spacing_cm int,
  planting_depth_cm numeric(4,2),
  mature_height_cm int,

  difficulty text CHECK (difficulty IN ('nybörjare', 'medel', 'avancerad')),
  sun_requirement text CHECK (sun_requirement IN ('sol', 'halvskugga', 'skugga')),
  water_requirement text CHECK (water_requirement IN ('låg', 'medel', 'hög')),
  soil_ph_min numeric(3,1),
  soil_ph_max numeric(3,1),

  zone_min int CHECK (zone_min BETWEEN 1 AND 8),
  zone_max int CHECK (zone_max BETWEEN 1 AND 8),

  companion_plants text[],
  avoid_plants text[],

  description_short text NOT NULL,
  description_long text,
  content_html text,

  faq jsonb,

  image_url text,
  image_alt text,
  featured boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_seo_plants_slug ON public.seo_plants(slug);
CREATE INDEX idx_seo_plants_published ON public.seo_plants(published);
CREATE INDEX idx_seo_plants_category ON public.seo_plants(category);

-- ---------- seo_months ----------
CREATE TABLE public.seo_months (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  month_number int UNIQUE NOT NULL CHECK (month_number BETWEEN 1 AND 12),
  month_name text NOT NULL,
  season text CHECK (season IN ('vinter', 'vår', 'sommar', 'höst')),

  avg_temp_south numeric(4,1),
  avg_temp_middle numeric(4,1),
  avg_temp_north numeric(4,1),
  daylight_hours_avg numeric(4,1),
  frost_risk text CHECK (frost_risk IN ('hög', 'medel', 'låg', 'ingen')),

  title text NOT NULL,
  intro text,
  content_html text,
  tasks text[],

  faq jsonb,

  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_seo_months_slug ON public.seo_months(slug);
CREATE INDEX idx_seo_months_published ON public.seo_months(published);

-- ---------- seo_zones ----------
CREATE TABLE public.seo_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  zone_number int UNIQUE NOT NULL CHECK (zone_number BETWEEN 1 AND 8),
  title text NOT NULL,
  description text,

  typical_regions text[],
  frost_free_days_min int,
  frost_free_days_max int,
  first_frost_typical text,
  last_frost_typical text,
  winter_temp_min numeric(4,1),

  content_html text,
  suitable_categories text[],

  faq jsonb,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_seo_zones_slug ON public.seo_zones(slug);
CREATE INDEX idx_seo_zones_published ON public.seo_zones(published);

-- ---------- seo_plant_zones ----------
CREATE TABLE public.seo_plant_zones (
  plant_id uuid NOT NULL REFERENCES public.seo_plants(id) ON DELETE CASCADE,
  zone_id uuid NOT NULL REFERENCES public.seo_zones(id) ON DELETE CASCADE,
  suitability text CHECK (suitability IN ('utmärkt', 'bra', 'möjlig', 'svår')),
  notes text,
  PRIMARY KEY (plant_id, zone_id)
);

CREATE INDEX idx_seo_plant_zones_plant ON public.seo_plant_zones(plant_id);
CREATE INDEX idx_seo_plant_zones_zone ON public.seo_plant_zones(zone_id);

-- ---------- seo_plant_months ----------
CREATE TABLE public.seo_plant_months (
  plant_id uuid NOT NULL REFERENCES public.seo_plants(id) ON DELETE CASCADE,
  month_id uuid NOT NULL REFERENCES public.seo_months(id) ON DELETE CASCADE,
  activity text NOT NULL CHECK (activity IN ('så_inomhus', 'så_utomhus', 'plantera_ut', 'skörda', 'skötsel')),
  PRIMARY KEY (plant_id, month_id, activity)
);

CREATE INDEX idx_seo_plant_months_plant ON public.seo_plant_months(plant_id);
CREATE INDEX idx_seo_plant_months_month ON public.seo_plant_months(month_id);

-- ============================================================
-- updated_at triggers
-- ============================================================
CREATE TRIGGER trg_seo_plants_updated_at
  BEFORE UPDATE ON public.seo_plants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_seo_months_updated_at
  BEFORE UPDATE ON public.seo_months
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_seo_zones_updated_at
  BEFORE UPDATE ON public.seo_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Enable Row Level Security
-- ============================================================
ALTER TABLE public.seo_plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_plant_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_plant_months ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies — public read on published rows, admin-only writes
-- ============================================================

-- seo_plants
CREATE POLICY "Publik läsning seo_plants"
  ON public.seo_plants FOR SELECT
  USING (published = true);

CREATE POLICY "Admins manage seo_plants"
  ON public.seo_plants FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- seo_months
CREATE POLICY "Publik läsning seo_months"
  ON public.seo_months FOR SELECT
  USING (published = true);

CREATE POLICY "Admins manage seo_months"
  ON public.seo_months FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- seo_zones
CREATE POLICY "Publik läsning seo_zones"
  ON public.seo_zones FOR SELECT
  USING (published = true);

CREATE POLICY "Admins manage seo_zones"
  ON public.seo_zones FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- seo_plant_zones (relation)
CREATE POLICY "Publik läsning seo_plant_zones"
  ON public.seo_plant_zones FOR SELECT
  USING (true);

CREATE POLICY "Admins manage seo_plant_zones"
  ON public.seo_plant_zones FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- seo_plant_months (relation)
CREATE POLICY "Publik läsning seo_plant_months"
  ON public.seo_plant_months FOR SELECT
  USING (true);

CREATE POLICY "Admins manage seo_plant_months"
  ON public.seo_plant_months FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));