-- Populate display_order values for missions based on the specified order
-- First, remove the NOT NULL constraint temporarily if it exists
ALTER TABLE missions ALTER COLUMN display_order DROP NOT NULL;

-- Update display_order values based on mission titles and types
-- Actions (1-2)
UPDATE missions SET display_order = 1 WHERE title = 'My EVERYONE Pledge';
UPDATE missions SET display_order = 2 WHERE title = 'Customer Obsessed, Everyday';

-- Core Missions (3-4)
UPDATE missions SET display_order = 3 WHERE title = 'Frontliner Day';
UPDATE missions SET display_order = 4 WHERE title = 'Call Listening';

-- Lite Missions (5-6)
UPDATE missions SET display_order = 5 WHERE title = 'Value Proposition 101';
UPDATE missions SET display_order = 6 WHERE title = 'Social Listening';

-- Elevate Missions (7-12)
UPDATE missions SET display_order = 7 WHERE title = 'Book – Small Data';
UPDATE missions SET display_order = 8 WHERE title = 'Book – Delivering Happiness';
UPDATE missions SET display_order = 9 WHERE title = 'Podcast Ep. – The CX Cast (Forrester)';
UPDATE missions SET display_order = 10 WHERE title = 'Video – Start with the CX';
UPDATE missions SET display_order = 11 WHERE title = 'Video – Start with Why';
UPDATE missions SET display_order = 12 WHERE title = 'Article – The Value of CX, Quantified';

-- Handle any missions that might not have been matched (set them to high numbers)
UPDATE missions SET display_order = 999 WHERE display_order IS NULL;

-- Add the NOT NULL constraint back
ALTER TABLE missions ALTER COLUMN display_order SET NOT NULL;

-- Update mission_number values to match the display order for consistency
UPDATE missions SET mission_number = 1 WHERE title = 'My EVERYONE Pledge';
UPDATE missions SET mission_number = 2 WHERE title = 'Customer Obsessed, Everyday';
UPDATE missions SET mission_number = 1 WHERE title = 'Frontliner Day';
UPDATE missions SET mission_number = 2 WHERE title = 'Call Listening';
UPDATE missions SET mission_number = 1 WHERE title = 'Value Proposition 101';
UPDATE missions SET mission_number = 2 WHERE title = 'Social Listening';
UPDATE missions SET mission_number = 1 WHERE title = 'Book – Small Data';
UPDATE missions SET mission_number = 2 WHERE title = 'Book – Delivering Happiness';
UPDATE missions SET mission_number = 3 WHERE title = 'Podcast Ep. – The CX Cast (Forrester)';
UPDATE missions SET mission_number = 4 WHERE title = 'Video – Start with the CX';
UPDATE missions SET mission_number = 5 WHERE title = 'Video – Start with Why';
UPDATE missions SET mission_number = 6 WHERE title = 'Article – The Value of CX, Quantified';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_missions_display_order ON missions(display_order);

-- Verify the results
SELECT title, type, mission_number, display_order 
FROM missions 
ORDER BY display_order;
