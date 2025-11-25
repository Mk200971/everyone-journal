-- Add Assignment missions to Cultural Immersions and Customer Diaries programs

-- First, get the program IDs (we'll reference them)
-- Cultural Immersions and Customer Diaries should already exist

-- Insert Assignment missions for Cultural Immersions
INSERT INTO missions (title, description, type, points_value)
VALUES
  ('Assignment #1', 'Cultural Immersions - Assignment 1', 'Assignment', 100),
  ('Assignment #2', 'Cultural Immersions - Assignment 2', 'Assignment', 100),
  ('Assignment #3', 'Cultural Immersions - Assignment 3', 'Assignment', 100)
ON CONFLICT DO NOTHING;

-- Insert Assignment mission for Customer Diaries
INSERT INTO missions (title, description, type, points_value)
VALUES
  ('Assignment #1', 'Customer Diaries - Assignment 1', 'Assignment', 100)
ON CONFLICT DO NOTHING;

-- Link Cultural Immersions assignments to the Cultural Immersions program
-- We need to find the Cultural Immersions program ID
WITH cultural_program AS (
  SELECT id FROM programs WHERE title ILIKE '%Cultural Immersions%' LIMIT 1
),
cultural_assignments AS (
  SELECT id FROM missions 
  WHERE type = 'Assignment' 
  AND description LIKE 'Cultural Immersions%'
  ORDER BY title
)
INSERT INTO mission_programs (mission_id, program_id)
SELECT ca.id, cp.id
FROM cultural_assignments ca
CROSS JOIN cultural_program cp
ON CONFLICT (mission_id, program_id) DO NOTHING;

-- Link Customer Diaries assignment to the Customer Diaries program
WITH customer_program AS (
  SELECT id FROM programs WHERE title ILIKE '%Customer Diaries%' LIMIT 1
),
customer_assignment AS (
  SELECT id FROM missions 
  WHERE type = 'Assignment' 
  AND description LIKE 'Customer Diaries%'
  LIMIT 1
)
INSERT INTO mission_programs (mission_id, program_id)
SELECT ca.id, cp.id
FROM customer_assignment ca
CROSS JOIN customer_program cp
ON CONFLICT (mission_id, program_id) DO NOTHING;
