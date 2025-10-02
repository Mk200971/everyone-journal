-- Fix missions-media bucket access for public image viewing
-- This ensures images uploaded to the bucket can be viewed by all users

-- First, make sure the bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'missions-media';

-- Drop existing policy if it exists and recreate it properly
DROP POLICY IF EXISTS "Allow public read access to mission images" ON storage.objects;

-- Create a proper public read policy for mission images
CREATE POLICY "Public read access for mission images"
ON storage.objects FOR SELECT
USING (bucket_id = 'missions-media');

-- Verify the bucket settings
SELECT id, name, public FROM storage.buckets WHERE id = 'missions-media';
