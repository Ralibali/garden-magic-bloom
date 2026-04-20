-- Remove legacy policy that allows public listing of seo-plant-images bucket
DROP POLICY IF EXISTS "Public read seo-plant-images" ON storage.objects;