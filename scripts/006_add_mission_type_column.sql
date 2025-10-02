-- Add type column to missions table for categorization
ALTER TABLE missions ADD COLUMN type TEXT DEFAULT 'Core';

-- Update existing missions with sample types
UPDATE missions SET type = 'Action' WHERE id IN (
  SELECT id FROM missions ORDER BY created_at LIMIT 2
);

UPDATE missions SET type = 'Lite' WHERE id IN (
  SELECT id FROM missions ORDER BY created_at OFFSET 2 LIMIT 2
);

UPDATE missions SET type = 'Elevate' WHERE id IN (
  SELECT id FROM missions ORDER BY created_at OFFSET 4 LIMIT 2
);

-- The rest will remain as 'Core' (default)
