-- Check if profile_activities table exists and show its structure
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profile_activities'
ORDER BY ordinal_position;

-- Check if there are any existing records
SELECT COUNT(*) as total_records FROM profile_activities;

-- Show recent profile activities if any exist
SELECT * FROM profile_activities ORDER BY created_at DESC LIMIT 5;
