-- Smart mission-resource matching based on content similarity
-- This script will be populated by the Python analysis script

-- First, let's see current state
SELECT 
    m.id as mission_id,
    m.title as mission_title,
    m.resource_id,
    r.title as resource_title
FROM missions m
LEFT JOIN resources r ON m.resource_id = r.id
ORDER BY m.title;

-- Clear existing incorrect resource_id assignments
UPDATE missions SET resource_id = NULL;

-- The Python script will generate the correct UPDATE statements
-- Run the Python script first, then execute the generated SQL file
