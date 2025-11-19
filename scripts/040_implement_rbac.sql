-- 1. Add role column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'participant';

-- 2. Migrate existing roles
-- Update admins
UPDATE public.profiles SET role = 'admin' WHERE is_admin = true;
-- Update everyone else to participant (default)
UPDATE public.profiles SET role = 'participant' WHERE is_admin = false OR is_admin IS NULL;

-- 3. Create mission_types table
CREATE TABLE IF NOT EXISTS public.mission_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Insert default mission types
-- Insert existing types from missions table
INSERT INTO public.mission_types (name)
SELECT DISTINCT type FROM public.missions WHERE type IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- Ensure 'Base Activity Access' exists
INSERT INTO public.mission_types (name, description)
VALUES ('Base Activity Access', 'Standard access for all participants')
ON CONFLICT (name) DO NOTHING;

-- 5. Add mission_type_id to missions
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS mission_type_id UUID REFERENCES public.mission_types(id);

-- 6. Migrate existing missions to link to mission_types
UPDATE public.missions m
SET mission_type_id = mt.id
FROM public.mission_types mt
WHERE m.type = mt.name;

-- Set default type for any missions without a type
UPDATE public.missions
SET mission_type_id = (SELECT id FROM public.mission_types WHERE name = 'Base Activity Access')
WHERE mission_type_id IS NULL;

-- 7. Create mission_assignments table
CREATE TABLE IF NOT EXISTS public.mission_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID REFERENCES public.missions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mission_id, user_id)
);

-- 8. RLS Policies

-- Enable RLS on new tables
ALTER TABLE public.mission_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_assignments ENABLE ROW LEVEL SECURITY;

-- Mission Types Policies
CREATE POLICY "Anyone can view mission types" ON public.mission_types 
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage mission types" ON public.mission_types 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Mission Assignments Policies
CREATE POLICY "Users can view own assignments" ON public.mission_assignments 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all assignments" ON public.mission_assignments 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage assignments" ON public.mission_assignments 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Update Missions RLS
-- Drop existing policy that allows everyone to view everything
DROP POLICY IF EXISTS "Anyone can view missions" ON public.missions;

-- Admin access
CREATE POLICY "Admins can view all missions" ON public.missions 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Participant access (only assigned missions)
CREATE POLICY "Participants can view assigned missions" ON public.missions 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mission_assignments ma
      WHERE ma.mission_id = id AND ma.user_id = auth.uid()
    )
  );

-- 9. Auto-assign existing missions to all existing participants
-- This ensures no one loses access immediately upon migration
INSERT INTO public.mission_assignments (mission_id, user_id)
SELECT m.id, p.id
FROM public.missions m
CROSS JOIN public.profiles p
WHERE p.role = 'participant'
ON CONFLICT DO NOTHING;

-- 10. Update Trigger to sync is_admin with role (for backward compatibility)
CREATE OR REPLACE FUNCTION public.sync_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    NEW.is_admin := true;
  ELSE
    NEW.is_admin := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_admin_role_trigger
BEFORE INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_admin_role();
