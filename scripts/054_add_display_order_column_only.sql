-- Add display_order column to missions table (nullable initially)
ALTER TABLE missions 
ADD COLUMN display_order INTEGER;

-- Add index for performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_missions_display_order ON missions(display_order);
