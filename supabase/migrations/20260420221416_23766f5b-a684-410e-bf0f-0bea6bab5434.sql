CREATE TABLE IF NOT EXISTS public.soro_indexnow_state (
  slug TEXT PRIMARY KEY,
  last_iso_date TEXT,
  last_pinged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.soro_indexnow_state ENABLE ROW LEVEL SECURITY;

-- Endast service role ska skriva; admins får läsa för felsökning
CREATE POLICY "Admins can view soro indexnow state"
ON public.soro_indexnow_state
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));