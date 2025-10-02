-- Add display_order column to missions table
ALTER TABLE missions ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Set initial display_order values based on mission_number (which already exists)
UPDATE missions 
SET display_order = mission_number 
WHERE display_order IS NULL;

-- Make display_order NOT NULL after setting initial values
ALTER TABLE missions ALTER COLUMN display_order SET NOT NULL;

-- Set default value for display_order to use the next available number
ALTER TABLE missions ALTER COLUMN display_order SET DEFAULT (SELECT COALESCE(MAX(display_order), 0) + 1 FROM missions);

-- Create index for better performance when ordering by display_order
CREATE INDEX IF NOT EXISTS idx_missions_display_order ON missions(display_order);

-- Create index for better performance when ordering by mission_number
CREATE INDEX IF NOT EXISTS idx_missions_mission_number ON missions(mission_number);
