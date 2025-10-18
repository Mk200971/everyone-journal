-- Enable RLS on likes table if not already enabled
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON likes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON likes;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON likes;

-- Allow everyone to read all likes (needed for activity feed)
CREATE POLICY "Enable read access for all users" ON likes
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert likes
CREATE POLICY "Enable insert for authenticated users only" ON likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete only their own likes
CREATE POLICY "Enable delete for users based on user_id" ON likes
  FOR DELETE
  USING (auth.uid() = user_id);
