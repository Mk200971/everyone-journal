-- Add display_order column to missions table
ALTER TABLE missions ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Create a temporary sequence to assign display_order values
-- We'll use the mission_number as the initial display_order if it exists, otherwise use id
UPDATE missions 
SET display_order = COALESCE(mission_number, id)
WHERE display_order IS NULL;

-- Set default value for future inserts
ALTER TABLE missions ALTER COLUMN display_order SET DEFAULT 1;

-- Add index for better performance when ordering by display_order
CREATE INDEX IF NOT EXISTS idx_missions_display_order ON missions(display_order);

-- Verify the update
SELECT id, title, mission_number, display_order 
FROM missions 
ORDER BY display_order 
LIMIT 10;
