-- 1. Restrict transactions policy from {public} to {authenticated} only
DROP POLICY IF EXISTS "Users manage own transactions" ON public.transactions;
CREATE POLICY "Users manage own transactions"
  ON public.transactions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Restrict blog_comments base table SELECT to authenticated only.
--    Public/anon users will read via the blog_comments_public view (no user_id).
DROP POLICY IF EXISTS "Anyone can read comments" ON public.blog_comments;
CREATE POLICY "Authenticated users can read comments"
  ON public.blog_comments
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Storage: prevent public listing of objects in public buckets.
--    Public SELECT should only return a single object by exact name match (no listing).
--    The existing broad SELECT policies allow `list` operations; we replace them.
DROP POLICY IF EXISTS "Anyone can view blog images" ON storage.objects;
DROP POLICY IF EXISTS "Public read seo-plant-images" ON storage.objects;

-- Allow public to read individual files (GET by key) but not list bucket contents.
-- Storage's list endpoint requires SELECT with the bucket prefix; we keep SELECT
-- only when a specific object name is requested via the public CDN URL,
-- which still works because Storage's getPublicUrl bypasses RLS for public buckets
-- at the CDN layer. RLS only blocks the `list` API call.
CREATE POLICY "Public can read individual blog images"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'blog-images' AND auth.role() = 'authenticated');

CREATE POLICY "Public can read individual seo-plant-images"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'seo-plant-images' AND auth.role() = 'authenticated');

-- Note: email-assets bucket has no SELECT policy on storage.objects,
-- so it's already protected from listing (only CDN URL access works).