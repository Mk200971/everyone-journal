-- Check current database state for resources and missions
-- This will help us understand what exists and what needs to be created

-- Check if resources table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'resources'
) as resources_table_exists;

-- Check if missions table has resource_id column
SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'missions'
    AND column_name = 'resource_id'
) as resource_id_column_exists;

-- Fixed UNION syntax by separating into individual queries
-- Check data counts
SELECT 'Resources count' as info, COUNT(*)::text as value FROM resources;
SELECT 'Missions count' as info, COUNT(*)::text as value FROM missions;
SELECT 'Missions with resource_id' as info, COUNT(*)::text as value FROM missions WHERE resource_id IS NOT NULL;

-- Show sample data if it exists
SELECT 'resource' as type, title, type as category FROM resources LIMIT 3;
SELECT 'mission' as type, title, mission_type as category FROM missions LIMIT 3;
