-- Update the get_leaderboard function to include all profile fields needed for the leaderboard display
CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE (
  id UUID,
  name TEXT,
  avatar_url TEXT,
  total_points BIGINT,
  created_at TIMESTAMP WITH TIME ZONE,
  job_title TEXT,
  department TEXT,
  bio TEXT,
  country TEXT,
  customer_obsession TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.avatar_url,
    COALESCE(SUM(s.points_awarded), 0) as total_points,
    p.created_at,
    p.job_title,
    p.department,
    p.bio,
    p.country,
    p.customer_obsession
  FROM profiles p
  LEFT JOIN submissions s ON p.id = s.user_id AND s.status = 'approved'
  GROUP BY p.id, p.name, p.avatar_url, p.created_at, p.job_title, p.department, p.bio, p.country, p.customer_obsession
  ORDER BY total_points DESC, p.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
