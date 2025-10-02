-- Alternative approach for quotes media storage policies
-- If this doesn't work, use the manual setup instructions below

-- Enable storage if not already enabled
CREATE EXTENSION IF NOT EXISTS "storage" SCHEMA "extensions";

-- Create policies for quotes media bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('quotes-media', 'quotes-media', true)
ON CONFLICT (id) DO NOTHING;

-- Policy for authenticated users to upload files
CREATE POLICY "Authenticated users can upload quote images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'quotes-media' AND 
  auth.role() = 'authenticated'
);

-- Policy for public read access
CREATE POLICY "Public can view quote images" ON storage.objects
FOR SELECT USING (bucket_id = 'quotes-media');

-- Policy for authenticated users to update their uploads
CREATE POLICY "Authenticated users can update quote images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'quotes-media' AND 
  auth.role() = 'authenticated'
);

-- Policy for authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete quote images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'quotes-media' AND 
  auth.role() = 'authenticated'
);
