
-- 1. Protect subscription fields on profiles from client-side modification
CREATE OR REPLACE FUNCTION public.protect_subscription_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role to update anything
  IF current_setting('role') = 'service_role' THEN
    RETURN NEW;
  END IF;
  
  -- For non-service-role, prevent changes to subscription fields
  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
    NEW.subscription_status := OLD.subscription_status;
  END IF;
  IF NEW.premium_expires_at IS DISTINCT FROM OLD.premium_expires_at THEN
    NEW.premium_expires_at := OLD.premium_expires_at;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profiles_subscription
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_subscription_fields();

-- 2. Make user_roles write policies explicit (deny all non-admin writes)
CREATE POLICY "Only admins can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "No one can update roles directly"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (false);

-- 3. Remove public read access on plant-photos bucket
DROP POLICY IF EXISTS "Public can view plant photos" ON storage.objects;

UPDATE storage.buckets SET public = false WHERE id = 'plant-photos';

-- Add UPDATE policy for plant-photos for completeness
CREATE POLICY "Users can update own plant photos"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'plant-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Add basic validation to analytics INSERT policies
DROP POLICY IF EXISTS "Public can insert page views" ON public.page_views;
CREATE POLICY "Public can insert page views"
  ON public.page_views
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(path) < 500 AND
    path IS NOT NULL
  );

DROP POLICY IF EXISTS "Public can insert click events" ON public.click_events;
CREATE POLICY "Public can insert click events"
  ON public.click_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(event_name) < 100 AND
    event_name IS NOT NULL AND
    (path IS NULL OR length(path) < 500)
  );
