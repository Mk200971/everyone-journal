-- Enable RLS on submissions table if not already enabled
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON submissions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON submissions;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON submissions;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON submissions;

-- Allow everyone (authenticated and anonymous) to read all submissions
-- This is needed for the community activity page
CREATE POLICY "Enable read access for all users" ON submissions
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert their own submissions
CREATE POLICY "Enable insert for authenticated users only" ON submissions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update only their own submissions
CREATE POLICY "Enable update for users based on user_id" ON submissions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete only their own submissions
CREATE POLICY "Enable delete for users based on user_id" ON submissions
  FOR DELETE
  USING (auth.uid() = user_id);
