-- Update CORS configuration for submissions-media bucket
-- This ensures videos work properly in production with crossOrigin="anonymous"

-- Note: Supabase automatically handles CORS for public buckets
-- This script documents the required CORS setup
-- If videos still show black screen, verify in Supabase dashboard:
-- Storage -> submissions-media -> Settings -> CORS configuration

-- Allowed origins should include:
-- - Your production domain
-- - Your development domain
-- - *  (for public content)

-- The bucket is already public, but ensuring proper CORS headers
UPDATE storage.buckets 
SET public = true
WHERE id IN ('submissions-media', 'submissions');

-- Add comment for documentation
COMMENT ON TABLE storage.buckets IS 'Public buckets require CORS headers for video playback across origins';
