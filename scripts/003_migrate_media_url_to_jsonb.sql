-- Migrate media_url from TEXT to JSONB array to support multiple media files
-- Backup existing media_url data and convert to array format
ALTER TABLE submissions 
ALTER COLUMN media_url TYPE JSONB 
USING 
  CASE 
    WHEN media_url IS NULL OR media_url = '' THEN '[]'::jsonb
    ELSE jsonb_build_array(media_url)
  END;

-- Update column default to empty JSON array
ALTER TABLE submissions 
ALTER COLUMN media_url SET DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN submissions.media_url IS 'JSONB array of media URLs (images and videos)';
