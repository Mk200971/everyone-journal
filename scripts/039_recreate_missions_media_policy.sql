-- Drop existing policy if it exists and recreate it properly
DROP POLICY IF EXISTS "Allow public read access to mission images" ON storage.objects;

-- Create a proper public read policy for missions-media bucket
CREATE POLICY "Public read access for mission images"
ON storage.objects FOR SELECT
USING (bucket_id = 'missions-media');

-- Ensure the bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'missions-media';

-- Verify the policy was created
SELECT 
    id,
    name,
    bucket_id,
    operation,
    definition
FROM storage.policies 
WHERE bucket_id = 'missions-media' AND operation = 'SELECT';
