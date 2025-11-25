-- Add timestamp tracking to mission assignments
-- This helps audit when missions were assigned to users

-- Add assigned_at column if it doesn't exist
ALTER TABLE mission_assignments 
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT NOW();

-- Add comment to document the table's purpose
COMMENT ON TABLE mission_assignments IS 
'Primary control table for user mission visibility. Users can only see missions listed here. Managed via /admin/users Activity Assignments tab.';

COMMENT ON COLUMN mission_assignments.user_id IS 
'User who can see this mission';

COMMENT ON COLUMN mission_assignments.mission_id IS 
'Mission that will be visible to the user';

COMMENT ON COLUMN mission_assignments.assigned_by IS 
'Admin user who assigned this mission';

COMMENT ON COLUMN mission_assignments.assigned_at IS 
'Timestamp when this mission was assigned';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mission_assignments_user_lookup 
ON mission_assignments(user_id, mission_id);
