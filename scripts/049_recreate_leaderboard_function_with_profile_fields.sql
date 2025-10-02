-- Drop the existing function first to avoid return type conflict
DROP FUNCTION IF EXISTS get_leaderboard();

-- Recreate the function with all profile fields
CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE (
  id UUID,
  name TEXT,
  avatar_url TEXT,
  total_points INTEGER,
  rank BIGINT,
  job_title TEXT,
  department TEXT,
  bio TEXT,
  country TEXT,
  customer_obsession TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.avatar_url,
    p.total_points,
    ROW_NUMBER() OVER (ORDER BY p.total_points DESC) as rank,
    p.job_title,
    p.department,
    p.bio,
    p.country,
    p.customer_obsession,
    p.created_at
  FROM profiles p
  ORDER BY p.total_points DESC;
END;
$$ LANGUAGE plpgsql;
