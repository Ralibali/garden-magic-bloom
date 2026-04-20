-- Restore public SELECT for individual file reads (needed for blog images on public site).
-- Listing is a separate Storage API operation that requires elevated permissions.
DROP POLICY IF EXISTS "Public can read individual blog images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read individual seo-plant-images" ON storage.objects;

CREATE POLICY "Anyone can view blog images"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'blog-images');

CREATE POLICY "Public read seo-plant-images"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'seo-plant-images');