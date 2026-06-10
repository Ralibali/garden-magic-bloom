-- A1: 7 → 14 dagars trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, subscription_status, premium_expires_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'premium',
    now() + interval '14 days'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;

-- A2: Gro daglig användningstabell
CREATE TABLE IF NOT EXISTS public.gro_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Stockholm')::date,
  message_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);

GRANT SELECT ON public.gro_usage TO authenticated;
GRANT ALL ON public.gro_usage TO service_role;

ALTER TABLE public.gro_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own gro usage"
  ON public.gro_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
