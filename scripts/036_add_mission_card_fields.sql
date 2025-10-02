-- Add new columns to missions table for enhanced mission card display
ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS duration TEXT,
ADD COLUMN IF NOT EXISTS coordinator TEXT,
ADD COLUMN IF NOT EXISTS support_status TEXT DEFAULT 'Supported',
ADD COLUMN IF NOT EXISTS due_date DATE;

-- Update existing missions with sample data to match the design
UPDATE missions 
SET 
  duration = '1 Day',
  coordinator = 'With Coordinator',
  support_status = 'Supported',
  due_date = '2025-12-31'
WHERE duration IS NULL;
