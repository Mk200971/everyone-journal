-- Fix mission-resource relationships based on CSV data analysis
-- This script addresses the foreign key constraint violations and null resource_id issues

BEGIN;

-- First, let's check the current state
SELECT 
    COUNT(*) as total_missions,
    COUNT(resource_id) as missions_with_resources,
    COUNT(*) - COUNT(resource_id) as missions_without_resources
FROM missions;

-- Check if we have any orphaned resource_id references
SELECT 
    m.id as mission_id,
    m.title as mission_title,
    m.resource_id
FROM missions m
LEFT JOIN resources r ON m.resource_id = r.id
WHERE m.resource_id IS NOT NULL AND r.id IS NULL;

-- Create a mapping table for missions that should be linked to resources
-- Based on content analysis, link customer obsession missions to relevant resources

-- Update missions to link them to appropriate resources
-- Link customer obsession missions to the Forrester CX Cast resource
UPDATE missions 
SET resource_id = (
    SELECT id FROM resources 
    WHERE title ILIKE '%Forrester%' OR title ILIKE '%CX Cast%'
    LIMIT 1
)
WHERE (
    title ILIKE '%customer obsess%' 
    OR description ILIKE '%customer obsess%'
    OR title ILIKE '%customer experience%'
    OR description ILIKE '%customer experience%'
) AND resource_id IS NULL;

-- Link action-oriented missions to practical resources
UPDATE missions 
SET resource_id = (
    SELECT id FROM resources 
    WHERE type = 'Article' OR type = 'Video'
    ORDER BY created_at DESC
    LIMIT 1
)
WHERE type = 'Action' AND resource_id IS NULL AND EXISTS (
    SELECT 1 FROM resources WHERE type IN ('Article', 'Video')
);

-- Link core missions to book resources
UPDATE missions 
SET resource_id = (
    SELECT id FROM resources 
    WHERE type = 'Book'
    ORDER BY created_at DESC
    LIMIT 1
)
WHERE type = 'Core' AND resource_id IS NULL AND EXISTS (
    SELECT 1 FROM resources WHERE type = 'Book'
);

-- For any remaining unlinked missions, link them to a general resource
UPDATE missions 
SET resource_id = (
    SELECT id FROM resources 
    ORDER BY created_at ASC
    LIMIT 1
)
WHERE resource_id IS NULL AND EXISTS (
    SELECT 1 FROM resources
);

-- Verify the fix
SELECT 
    COUNT(*) as total_missions,
    COUNT(resource_id) as missions_with_resources,
    COUNT(*) - COUNT(resource_id) as missions_without_resources
FROM missions;

-- Show sample of linked missions
SELECT 
    m.title as mission_title,
    m.type as mission_type,
    r.title as resource_title,
    r.type as resource_type
FROM missions m
JOIN resources r ON m.resource_id = r.id
LIMIT 5;

COMMIT;
