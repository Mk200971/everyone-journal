-- Update all existing missions with sequential mission numbers from 1-12
-- This will assign mission numbers based on creation date (oldest first)

WITH numbered_missions AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC) as new_mission_number
  FROM missions
)
UPDATE missions 
SET mission_number = numbered_missions.new_mission_number
FROM numbered_missions 
WHERE missions.id = numbered_missions.id;

-- Verify the update
SELECT id, title, mission_number, created_at 
FROM missions 
ORDER BY mission_number;
