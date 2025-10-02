-- Function to update user total points when submission is approved
CREATE OR REPLACE FUNCTION public.update_user_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If submission status changed to approved, add points
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE public.profiles 
    SET total_points = total_points + NEW.points_awarded
    WHERE id = NEW.user_id;
  END IF;
  
  -- If submission status changed from approved to something else, subtract points
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE public.profiles 
    SET total_points = GREATEST(0, total_points - OLD.points_awarded)
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to update points when submission status changes
DROP TRIGGER IF EXISTS on_submission_status_change ON public.submissions;
CREATE TRIGGER on_submission_status_change
  AFTER UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_points();
