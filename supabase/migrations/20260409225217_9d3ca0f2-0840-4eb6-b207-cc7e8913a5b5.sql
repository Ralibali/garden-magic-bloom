
CREATE OR REPLACE FUNCTION public.get_weekly_signup_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.profiles
  WHERE created_at >= now() - interval '7 days'
$$;

-- Allow anon and authenticated to call this
GRANT EXECUTE ON FUNCTION public.get_weekly_signup_count() TO anon, authenticated;
