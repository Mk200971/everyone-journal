-- Add mission_number column to missions table
ALTER TABLE missions ADD COLUMN mission_number INTEGER;

-- Update existing missions with sequential numbers based on creation date
UPDATE missions 
SET mission_number = row_number() OVER (ORDER BY created_at)
WHERE mission_number IS NULL;

-- Make mission_number NOT NULL and add a default for new records
ALTER TABLE missions ALTER COLUMN mission_number SET NOT NULL;

-- Create a sequence for auto-incrementing mission numbers
CREATE SEQUENCE IF NOT EXISTS mission_number_seq START WITH (SELECT COALESCE(MAX(mission_number), 0) + 1 FROM missions);

-- Set default value for mission_number to use the sequence
ALTER TABLE missions ALTER COLUMN mission_number SET DEFAULT nextval('mission_number_seq');
