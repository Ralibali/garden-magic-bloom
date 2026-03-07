
-- Update handle_new_user to auto-grant 7 days premium for new signups
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
    now() + interval '7 days'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;

-- Add season_notes column to beds for "vad lärde jag mig i år?"
ALTER TABLE public.beds ADD COLUMN IF NOT EXISTS season_notes text DEFAULT NULL;
