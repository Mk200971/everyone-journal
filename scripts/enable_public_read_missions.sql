-- Enable RLS on missions table if not already enabled
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON missions;

-- Allow everyone to read all missions (public content)
CREATE POLICY "Enable read access for all users" ON missions
  FOR SELECT
  USING (true);

-- Only admins should be able to insert/update/delete missions
-- This would typically be handled through a separate admin interface
