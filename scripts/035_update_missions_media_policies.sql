-- Drop existing policies for missions-media bucket
DROP POLICY IF EXISTS "Allow authenticated users to upload mission images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update mission images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete mission images" ON storage.objects;

-- Create admin-only policies for missions-media bucket
CREATE POLICY "Allow admin users to upload mission images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'missions-media' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Allow admin users to update mission images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'missions-media' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Allow admin users to delete mission images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'missions-media' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);
