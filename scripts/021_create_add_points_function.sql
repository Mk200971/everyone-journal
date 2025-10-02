-- Create a database function to atomically add points to a user's profile
CREATE OR REPLACE FUNCTION add_points_to_profile(user_id_input UUID, points_to_add INT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles 
  SET total_points = COALESCE(total_points, 0) + points_to_add
  WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql;
