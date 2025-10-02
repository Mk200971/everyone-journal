-- Create submissions-media storage bucket for edited submission media
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions-media', 'submissions-media', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for submissions-media bucket
CREATE POLICY "Users can upload their own submission media" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'submissions-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view all submission media" ON storage.objects
FOR SELECT USING (bucket_id = 'submissions-media');

CREATE POLICY "Users can update their own submission media" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'submissions-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own submission media" ON storage.objects
FOR DELETE USING (
  bucket_id = 'submissions-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
