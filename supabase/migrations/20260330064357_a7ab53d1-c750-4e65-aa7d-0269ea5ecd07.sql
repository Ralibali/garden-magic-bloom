
-- 1. Make plant-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'plant-photos';

-- 2. Remove the anon SELECT policy that exposes all photos
DROP POLICY IF EXISTS "Public can view plant photos" ON storage.objects;

-- 3. Protect profiles from subscription self-elevation
CREATE OR REPLACE FUNCTION public.prevent_subscription_selfmod()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only service_role can change subscription fields
  IF current_setting('role') != 'service_role' THEN
    NEW.subscription_status := OLD.subscription_status;
    NEW.premium_expires_at := OLD.premium_expires_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_subscription_selfmod
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_subscription_selfmod();

-- 4. Harden analytics insert policies - replace permissive ones with constrained versions
DROP POLICY IF EXISTS "Public can insert page views" ON public.page_views;
CREATE POLICY "Public can insert page views" ON public.page_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(path) < 500 AND
    (session_id IS NULL OR length(session_id) < 100) AND
    (referrer IS NULL OR length(referrer) < 2000)
  );

DROP POLICY IF EXISTS "Public can insert click events" ON public.click_events;
CREATE POLICY "Public can insert click events" ON public.click_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(event_name) < 100 AND
    event_name = ANY(ARRAY['button_click','cta_click','blog_link_click','external_link_click','nav_click','scroll_depth']) AND
    (path IS NULL OR length(path) < 500) AND
    (element_text IS NULL OR length(element_text) < 200) AND
    (session_id IS NULL OR length(session_id) < 100)
  );

-- 5. Fix function search path mutable
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
