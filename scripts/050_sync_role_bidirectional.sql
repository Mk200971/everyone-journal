-- Create bi-directional sync between role and is_admin fields
-- This ensures backward compatibility if any legacy code modifies is_admin directly

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_profile_role ON profiles;
DROP FUNCTION IF EXISTS sync_profile_role_fn();

-- Function to sync role → is_admin (already exists, but updating for clarity)
CREATE OR REPLACE FUNCTION sync_profile_role_fn()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync role to is_admin
  IF NEW.role = 'admin' THEN
    NEW.is_admin := true;
  ELSE
    NEW.is_admin := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for role → is_admin sync
CREATE TRIGGER sync_profile_role
  BEFORE INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_role_fn();

-- Function to sync is_admin → role (NEW - for backward compatibility)
CREATE OR REPLACE FUNCTION sync_profile_is_admin_fn()
RETURNS TRIGGER AS $$
BEGIN
  -- If is_admin is explicitly changed, update role to match
  IF NEW.is_admin = true AND (OLD.is_admin IS NULL OR OLD.is_admin = false) THEN
    NEW.role := 'admin';
  ELSIF NEW.is_admin = false AND OLD.is_admin = true THEN
    -- Only change to participant if currently admin
    IF OLD.role = 'admin' THEN
      NEW.role := 'participant';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for is_admin → role sync
CREATE TRIGGER sync_profile_is_admin
  BEFORE UPDATE OF is_admin ON profiles
  FOR EACH ROW
  WHEN (OLD.is_admin IS DISTINCT FROM NEW.is_admin)
  EXECUTE FUNCTION sync_profile_is_admin_fn();

-- Ensure existing data is consistent
UPDATE profiles SET is_admin = (role = 'admin') WHERE is_admin != (role = 'admin');
