-- Create missions-media storage bucket for mission images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'missions-media',
  'missions-media', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for missions-media bucket
CREATE POLICY "Allow authenticated users to upload mission images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'missions-media' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow public read access to mission images" ON storage.objects
FOR SELECT USING (bucket_id = 'missions-media');

CREATE POLICY "Allow authenticated users to update mission images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'missions-media' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to delete mission images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'missions-media' 
  AND auth.role() = 'authenticated'
);
