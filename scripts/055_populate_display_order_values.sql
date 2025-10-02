-- Populate display_order values based on the specified mission sequence

-- Actions (1-2)
UPDATE missions SET display_order = 1 WHERE title ILIKE '%My EVERYONE Pledge%';
UPDATE missions SET display_order = 2 WHERE title ILIKE '%Customer Obsessed, Everyday%';

-- Core Missions (3-4)
UPDATE missions SET display_order = 3 WHERE title ILIKE '%Frontliner Day%';
UPDATE missions SET display_order = 4 WHERE title ILIKE '%Call Listening%';

-- Lite Missions (5-6)
UPDATE missions SET display_order = 5 WHERE title ILIKE '%Value Proposition 101%';
UPDATE missions SET display_order = 6 WHERE title ILIKE '%Social Listening%';

-- Elevate Missions (7-12)
UPDATE missions SET display_order = 7 WHERE title ILIKE '%Small Data%';
UPDATE missions SET display_order = 8 WHERE title ILIKE '%Delivering Happiness%';
UPDATE missions SET display_order = 9 WHERE title ILIKE '%The CX Cast%';
UPDATE missions SET display_order = 10 WHERE title ILIKE '%Start with the CX%';
UPDATE missions SET display_order = 11 WHERE title ILIKE '%Start with Why%';
UPDATE missions SET display_order = 12 WHERE title ILIKE '%The Value of CX, Quantified%';

-- Update mission_number to match the category numbering
UPDATE missions SET mission_number = 1 WHERE title ILIKE '%My EVERYONE Pledge%';
UPDATE missions SET mission_number = 2 WHERE title ILIKE '%Customer Obsessed, Everyday%';
UPDATE missions SET mission_number = 1 WHERE title ILIKE '%Frontliner Day%';
UPDATE missions SET mission_number = 2 WHERE title ILIKE '%Call Listening%';
UPDATE missions SET mission_number = 1 WHERE title ILIKE '%Value Proposition 101%';
UPDATE missions SET mission_number = 2 WHERE title ILIKE '%Social Listening%';
UPDATE missions SET mission_number = 1 WHERE title ILIKE '%Small Data%';
UPDATE missions SET mission_number = 2 WHERE title ILIKE '%Delivering Happiness%';
UPDATE missions SET mission_number = 3 WHERE title ILIKE '%The CX Cast%';
UPDATE missions SET mission_number = 4 WHERE title ILIKE '%Start with the CX%';
UPDATE missions SET mission_number = 5 WHERE title ILIKE '%Start with Why%';
UPDATE missions SET mission_number = 6 WHERE title ILIKE '%The Value of CX, Quantified%';

-- Verify the updates
SELECT title, mission_number, display_order 
FROM missions 
ORDER BY display_order;
