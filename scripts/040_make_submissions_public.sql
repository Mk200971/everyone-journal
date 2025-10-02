-- Make submissions publicly viewable for the activity feed
-- This allows all users to see all submissions in the community activity

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view own submissions" ON public.submissions;

-- Create new public read policy for submissions
CREATE POLICY "Users can view all submissions" ON public.submissions 
  FOR SELECT USING (true);

-- Keep the existing policies for insert and update (users can only modify their own)
-- These policies should already exist:
-- "Users can insert own submissions" - allows users to create their own submissions
-- "Users can update own submissions" - allows users to update their own submissions

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'submissions' AND schemaname = 'public';
