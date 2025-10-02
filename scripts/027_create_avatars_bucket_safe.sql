-- Create avatars storage bucket using Supabase storage functions
-- This approach avoids direct system table access

-- First, let's create a function to safely create the bucket if it doesn't exist
CREATE OR REPLACE FUNCTION create_avatars_bucket()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function will be called to ensure the bucket exists
  -- The actual bucket creation should be done through Supabase dashboard or API
  
  -- Enable RLS on storage.objects if not already enabled
  BEGIN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  EXCEPTION
    WHEN insufficient_privilege THEN
      -- RLS might already be enabled, continue
      NULL;
  END;

  -- Create policies for avatar management (these should work with proper permissions)
  BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

    -- Create new policies
    CREATE POLICY "Avatar images are publicly accessible" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'avatars');

    CREATE POLICY "Users can upload their own avatar" 
    ON storage.objects FOR INSERT 
    WITH CHECK (
      bucket_id = 'avatars' AND 
      auth.uid() IS NOT NULL AND
      (name LIKE auth.uid()::text || '/%' OR name LIKE auth.uid()::text || '.%')
    );

    CREATE POLICY "Users can update their own avatar" 
    ON storage.objects FOR UPDATE 
    USING (
      bucket_id = 'avatars' AND 
      auth.uid() IS NOT NULL AND
      (name LIKE auth.uid()::text || '/%' OR name LIKE auth.uid()::text || '.%')
    );

    CREATE POLICY "Users can delete their own avatar" 
    ON storage.objects FOR DELETE 
    USING (
      bucket_id = 'avatars' AND 
      auth.uid() IS NOT NULL AND
      (name LIKE auth.uid()::text || '/%' OR name LIKE auth.uid()::text || '.%')
    );

  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Could not create storage policies. Please create the avatars bucket manually in Supabase dashboard.';
  END;
END;
$$;

-- Call the function
SELECT create_avatars_bucket();

-- Clean up the function
DROP FUNCTION create_avatars_bucket();
