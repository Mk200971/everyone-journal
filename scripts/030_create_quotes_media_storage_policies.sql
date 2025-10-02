-- Create storage policies for the quotes media bucket
-- This allows authenticated users to upload and access files in the quotes media bucket

-- Policy to allow authenticated users to upload files to quotes media bucket
INSERT INTO storage.policies (id, bucket_id, name, definition, check_expression, command)
VALUES (
  'quotes_media_upload_policy',
  'quotes media',
  'Allow authenticated users to upload to quotes media',
  'auth.role() = ''authenticated''',
  'auth.role() = ''authenticated''',
  'INSERT'
);

-- Policy to allow public read access to quotes media files
INSERT INTO storage.policies (id, bucket_id, name, definition, check_expression, command)
VALUES (
  'quotes_media_read_policy', 
  'quotes media',
  'Allow public read access to quotes media',
  'true',
  'true',
  'SELECT'
);

-- Policy to allow authenticated users to update their uploaded files
INSERT INTO storage.policies (id, bucket_id, name, definition, check_expression, command)
VALUES (
  'quotes_media_update_policy',
  'quotes media', 
  'Allow authenticated users to update quotes media files',
  'auth.role() = ''authenticated''',
  'auth.role() = ''authenticated''',
  'UPDATE'
);

-- Policy to allow authenticated users to delete their uploaded files
INSERT INTO storage.policies (id, bucket_id, name, definition, check_expression, command)
VALUES (
  'quotes_media_delete_policy',
  'quotes media',
  'Allow authenticated users to delete quotes media files', 
  'auth.role() = ''authenticated''',
  'auth.role() = ''authenticated''',
  'DELETE'
);
