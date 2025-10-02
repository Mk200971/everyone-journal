-- Add image_url column to missions table for mission pictures
ALTER TABLE missions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN missions.image_url IS 'URL to mission image stored in missions-media bucket';
