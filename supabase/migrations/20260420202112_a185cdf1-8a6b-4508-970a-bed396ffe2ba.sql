-- Lägg till status/felfält
ALTER TABLE public.seo_plants
  ADD COLUMN IF NOT EXISTS generation_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS generation_errors text[];

ALTER TABLE public.seo_months
  ADD COLUMN IF NOT EXISTS generation_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS generation_errors text[];

ALTER TABLE public.seo_zones
  ADD COLUMN IF NOT EXISTS generation_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS generation_errors text[];

-- Logg-tabell
CREATE TABLE IF NOT EXISTS public.seo_generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  type text NOT NULL,
  target_slug text,
  model text,
  input_prompt text,
  output_json jsonb,
  validation_errors text[],
  status text NOT NULL DEFAULT 'success',
  error_message text
);

CREATE INDEX IF NOT EXISTS seo_generation_log_created_at_idx
  ON public.seo_generation_log (created_at DESC);
CREATE INDEX IF NOT EXISTS seo_generation_log_type_idx
  ON public.seo_generation_log (type);

ALTER TABLE public.seo_generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage seo_generation_log"
  ON public.seo_generation_log
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));