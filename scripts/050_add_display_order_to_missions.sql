-- Add display_order column to missions table for controlling card sequence
ALTER TABLE missions ADD COLUMN display_order INTEGER DEFAULT 0;

-- Update existing missions with sequential display order based on creation date
UPDATE missions 
SET display_order = row_number() OVER (ORDER BY created_at)
WHERE display_order = 0;

-- Create index for better performance when ordering by display_order
CREATE INDEX IF NOT EXISTS idx_missions_display_order ON missions(display_order);
