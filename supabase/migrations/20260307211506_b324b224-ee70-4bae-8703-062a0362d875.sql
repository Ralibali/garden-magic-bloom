
-- Create storage bucket for plant photos
INSERT INTO storage.buckets (id, name, public) VALUES ('plant-photos', 'plant-photos', true);

-- Allow authenticated users to upload to plant-photos bucket
CREATE POLICY "Users can upload plant photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'plant-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to view their own photos
CREATE POLICY "Users can view own plant photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'plant-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read for plant photos (since bucket is public)
CREATE POLICY "Public can view plant photos"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'plant-photos');

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own plant photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'plant-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
