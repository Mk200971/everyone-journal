-- Add max_submissions_per_user column to missions table
ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS max_submissions_per_user INTEGER DEFAULT 1;

-- Update existing missions with different submission limits
-- Set some missions to allow multiple submissions (up to 10)
UPDATE missions 
SET max_submissions_per_user = 10 
WHERE id IN (
  SELECT id FROM missions 
  WHERE type = 'Customer Obsession' 
  LIMIT 3
);

-- Set some missions to allow 5 submissions
UPDATE missions 
SET max_submissions_per_user = 5 
WHERE id IN (
  SELECT id FROM missions 
  WHERE type = 'Core' 
  LIMIT 2
);

-- Keep the rest as single submission (default 1)
