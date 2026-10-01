-- A newsletter opt-in must be explicit; omitted values never grant it.
ALTER TABLE public.public_leads ALTER COLUMN consent_marketing SET DEFAULT false;

-- This function needs privileged access because leads are not publicly readable.
-- Its authority is limited to the current verified account and that account's email.
CREATE OR REPLACE FUNCTION public.mark_public_leads_converted(_email text, _user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  verified_email text;
  updated_count integer;
BEGIN
  IF auth.uid() IS NULL OR _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  SELECT lower(email) INTO verified_email FROM auth.users
    WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  IF verified_email IS NULL OR lower(trim(_email)) IS DISTINCT FROM verified_email THEN
    RAISE EXCEPTION 'Verified email required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.public_leads
    SET converted_user_id = auth.uid(), converted_at = coalesce(converted_at, now())
    WHERE lower(email) = verified_email AND converted_user_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_public_leads_converted(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_public_leads_converted(text, uuid) TO authenticated;
COMMENT ON FUNCTION public.mark_public_leads_converted(text, uuid) IS 'Links leads only to the signed-in confirmed account with the same email; anonymous callers cannot modify leads.';
