-- Fix missing public read policy for missions-media bucket
-- This allows mission images to be displayed publicly while keeping admin-only upload/update/delete

-- Ensure public read access exists for missions-media bucket
CREATE POLICY "Allow public read access to mission images" ON storage.objects
FOR SELECT USING (bucket_id = 'missions-media');
