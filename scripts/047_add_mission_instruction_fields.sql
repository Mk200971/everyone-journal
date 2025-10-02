-- Add optional instruction fields to missions table
ALTER TABLE missions 
ADD COLUMN instructions TEXT,
ADD COLUMN tips_inspiration TEXT;

-- Add comments to document the new columns
COMMENT ON COLUMN missions.instructions IS 'Optional detailed instructions for completing the mission';
COMMENT ON COLUMN missions.tips_inspiration IS 'Optional tips and inspiration content for the mission';
