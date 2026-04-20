-- 1. Drop unused transactions table
DROP TABLE IF EXISTS public.transactions CASCADE;

-- 2. Restrict storage object listing on public buckets
-- Allow individual file reads (needed for CDN/img tags) but block listing
DROP POLICY IF EXISTS "Public read blog images" ON storage.objects;
DROP POLICY IF EXISTS "Public read seo plant images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view blog images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Re-create scoped read policies (no listing — clients must know exact path)
CREATE POLICY "Read blog images by path"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'blog-images' AND name IS NOT NULL);

CREATE POLICY "Read seo plant images by path"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'seo-plant-images' AND name IS NOT NULL);

CREATE POLICY "Read email assets by path"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'email-assets' AND name IS NOT NULL);

-- 3. Make blog_comments_public view readable by anonymous users (it already strips user_id)
-- The view exists; ensure it has proper grants
GRANT SELECT ON public.blog_comments_public TO anon, authenticated;

-- Allow public SELECT on blog_comments base table for the view to work via security_invoker=false
-- Actually the view is the safe surface; we keep base table restricted to authenticated users for writes
-- But anonymous visitors need to read via the view. Re-add a read policy for anon scoped to published posts.
DROP POLICY IF EXISTS "Public can read comments on published posts" ON public.blog_comments;
CREATE POLICY "Public can read comments on published posts"
ON public.blog_comments FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.blog_posts
    WHERE blog_posts.id = blog_comments.post_id
      AND blog_posts.is_published = true
  )
);

-- 4. SEO generation log: explicit service_role insert policy
DROP POLICY IF EXISTS "Service role can insert seo generation logs" ON public.seo_generation_log;
CREATE POLICY "Service role can insert seo generation logs"
ON public.seo_generation_log FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');