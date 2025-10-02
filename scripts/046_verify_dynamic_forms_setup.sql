-- Verification script to check dynamic forms implementation

-- Check missions with submission schemas
SELECT 
  id,
  title,
  submission_schema IS NOT NULL as has_schema,
  max_submissions_per_user,
  type
FROM missions 
ORDER BY title;

-- Check submissions with answers
SELECT 
  s.id,
  m.title as mission_title,
  s.answers IS NOT NULL as has_structured_answers,
  s.text_submission IS NOT NULL as has_legacy_text,
  s.status,
  s.created_at
FROM submissions s
JOIN missions m ON s.mission_id = m.id
ORDER BY s.created_at DESC
LIMIT 10;

-- Count missions by schema type
SELECT 
  CASE 
    WHEN submission_schema IS NULL THEN 'Legacy (No Schema)'
    WHEN submission_schema->>'version' = '1' THEN 'Dynamic Form v1'
    ELSE 'Other'
  END as schema_type,
  COUNT(*) as mission_count
FROM missions
GROUP BY schema_type;

-- Sample schema structure for verification
SELECT 
  title,
  jsonb_pretty(submission_schema) as schema_structure
FROM missions 
WHERE submission_schema IS NOT NULL
LIMIT 3;
