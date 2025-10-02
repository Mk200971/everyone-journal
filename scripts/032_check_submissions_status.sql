-- Check all submissions in the database to understand the sync issue
SELECT 
    s.id,
    s.user_id,
    p.name as user_name,
    s.mission_id,
    m.title as mission_title,
    s.status,
    s.points_awarded,
    s.created_at,
    s.updated_at
FROM submissions s
LEFT JOIN profiles p ON s.user_id = p.id
LEFT JOIN missions m ON s.mission_id = m.id
ORDER BY s.created_at DESC;

-- Check submission statuses
SELECT status, COUNT(*) as count
FROM submissions
GROUP BY status;

-- Check submissions by user
SELECT 
    p.name as user_name,
    s.status,
    COUNT(*) as submission_count
FROM submissions s
LEFT JOIN profiles p ON s.user_id = p.id
GROUP BY p.name, s.status
ORDER BY p.name, s.status;
