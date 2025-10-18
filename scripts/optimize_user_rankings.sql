-- Create a function to efficiently calculate user rankings
-- This avoids fetching all users just to calculate one user's rank

CREATE OR REPLACE FUNCTION get_user_rank(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  user_rank INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO user_rank
  FROM profiles
  WHERE total_points > (
    SELECT total_points 
    FROM profiles 
    WHERE id = user_id_param
  );
  
  RETURN user_rank;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_submissions_user_status ON submissions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_total_points ON profiles(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_likes_submission_user ON likes(submission_id, user_id);
CREATE INDEX IF NOT EXISTS idx_profile_activities_created ON profile_activities(created_at DESC);

-- Add comment explaining the optimization
COMMENT ON FUNCTION get_user_rank IS 'Efficiently calculates a user''s rank based on total_points without fetching all users';
