-- Direct mission-resource matching based on title similarity
-- This script will update missions with their corresponding resource IDs

-- First, let's see what we're working with
SELECT 'Current missions without resources:' as info;
SELECT id, title, type, resource_id FROM missions WHERE resource_id IS NULL;

SELECT 'Available resources:' as info;
SELECT id, title, type FROM resources;

-- Now perform the updates based on exact and partial title matches

-- 1. Exact title matches (case insensitive)
UPDATE missions 
SET resource_id = (
    SELECT r.id 
    FROM resources r 
    WHERE LOWER(r.title) = LOWER(missions.title)
    LIMIT 1
)
WHERE resource_id IS NULL 
AND EXISTS (
    SELECT 1 FROM resources r 
    WHERE LOWER(r.title) = LOWER(missions.title)
);

-- 2. Partial matches for common patterns
-- "Start with Why (Video)" -> "Start with Why - Simon Sinek (TEDx)"
UPDATE missions 
SET resource_id = (
    SELECT r.id 
    FROM resources r 
    WHERE LOWER(r.title) LIKE '%start with why%'
    LIMIT 1
)
WHERE resource_id IS NULL 
AND LOWER(title) LIKE '%start with why%';

-- "Start with the Customer Experience (Video)" -> "Start with the Customer Experience - Steve Jobs"
UPDATE missions 
SET resource_id = (
    SELECT r.id 
    FROM resources r 
    WHERE LOWER(r.title) LIKE '%start with the customer experience%'
    LIMIT 1
)
WHERE resource_id IS NULL 
AND LOWER(title) LIKE '%start with the customer experience%';

-- "Delivering Happiness (Book)" -> "Delivering Happiness"
UPDATE missions 
SET resource_id = (
    SELECT r.id 
    FROM resources r 
    WHERE LOWER(r.title) LIKE '%delivering happiness%'
    LIMIT 1
)
WHERE resource_id IS NULL 
AND LOWER(title) LIKE '%delivering happiness%';

-- "The Value of Customer Experience, Quantified (Article)" -> "The Value of Customer Experience, Quantified"
UPDATE missions 
SET resource_id = (
    SELECT r.id 
    FROM resources r 
    WHERE LOWER(r.title) LIKE '%value of customer experience%'
    LIMIT 1
)
WHERE resource_id IS NULL 
AND LOWER(title) LIKE '%value of customer experience%';

-- 3. Match by type and keywords for remaining missions
-- Match video missions with video resources
UPDATE missions 
SET resource_id = (
    SELECT r.id 
    FROM resources r 
    WHERE r.type = 'video'
    AND (
        LOWER(r.title) LIKE '%' || LOWER(SPLIT_PART(missions.title, ' (', 1)) || '%'
        OR LOWER(r.description) LIKE '%' || LOWER(SPLIT_PART(missions.title, ' (', 1)) || '%'
    )
    LIMIT 1
)
WHERE resource_id IS NULL 
AND LOWER(title) LIKE '%(video)%'
AND EXISTS (
    SELECT 1 FROM resources r 
    WHERE r.type = 'video'
    AND (
        LOWER(r.title) LIKE '%' || LOWER(SPLIT_PART(missions.title, ' (', 1)) || '%'
        OR LOWER(r.description) LIKE '%' || LOWER(SPLIT_PART(missions.title, ' (', 1)) || '%'
    )
);

-- Match book missions with book resources
UPDATE missions 
SET resource_id = (
    SELECT r.id 
    FROM resources r 
    WHERE r.type = 'book'
    AND (
        LOWER(r.title) LIKE '%' || LOWER(SPLIT_PART(missions.title, ' (', 1)) || '%'
        OR LOWER(r.description) LIKE '%' || LOWER(SPLIT_PART(missions.title, ' (', 1)) || '%'
    )
    LIMIT 1
)
WHERE resource_id IS NULL 
AND LOWER(title) LIKE '%(book)%'
AND EXISTS (
    SELECT 1 FROM resources r 
    WHERE r.type = 'book'
    AND (
        LOWER(r.title) LIKE '%' || LOWER(SPLIT_PART(missions.title, ' (', 1)) || '%'
        OR LOWER(r.description) LIKE '%' || LOWER(SPLIT_PART(missions.title, ' (', 1)) || '%'
    )
);

-- Match article missions with article resources
UPDATE missions 
SET resource_id = (
    SELECT r.id 
    FROM resources r 
    WHERE r.type = 'article'
    AND (
        LOWER(r.title) LIKE '%' || LOWER(SPLIT_PART(missions.title, ' (', 1)) || '%'
        OR LOWER(r.description) LIKE '%' || LOWER(SPLIT_PART(missions.title, ' (', 1)) || '%'
    )
    LIMIT 1
)
WHERE resource_id IS NULL 
AND LOWER(title) LIKE '%(article)%'
AND EXISTS (
    SELECT 1 FROM resources r 
    WHERE r.type = 'article'
    AND (
        LOWER(r.title) LIKE '%' || LOWER(SPLIT_PART(missions.title, ' (', 1)) || '%'
        OR LOWER(r.description) LIKE '%' || LOWER(SPLIT_PART(missions.title, ' (', 1)) || '%'
    )
);

-- Match podcast missions with podcast resources
UPDATE missions 
SET resource_id = (
    SELECT r.id 
    FROM resources r 
    WHERE r.type = 'podcast'
    AND (
        LOWER(r.title) LIKE '%' || LOWER(SPLIT_PART(missions.title, ' (', 1)) || '%'
        OR LOWER(r.description) LIKE '%' || LOWER(SPLIT_PART(missions.title, ' (', 1)) || '%'
    )
    LIMIT 1
)
WHERE resource_id IS NULL 
AND LOWER(title) LIKE '%(podcast)%'
AND EXISTS (
    SELECT 1 FROM resources r 
    WHERE r.type = 'podcast'
    AND (
        LOWER(r.title) LIKE '%' || LOWER(SPLIT_PART(missions.title, ' (', 1)) || '%'
        OR LOWER(r.description) LIKE '%' || LOWER(SPLIT_PART(missions.title, ' (', 1)) || '%'
    )
);

-- 4. Final fallback - match any remaining missions with any available resource by keyword similarity
UPDATE missions 
SET resource_id = (
    SELECT r.id 
    FROM resources r 
    WHERE (
        LOWER(r.title) LIKE '%customer%' AND LOWER(missions.title) LIKE '%customer%'
        OR LOWER(r.title) LIKE '%experience%' AND LOWER(missions.title) LIKE '%experience%'
        OR LOWER(r.title) LIKE '%happiness%' AND LOWER(missions.title) LIKE '%happiness%'
        OR LOWER(r.title) LIKE '%leadership%' AND LOWER(missions.title) LIKE '%leadership%'
    )
    LIMIT 1
)
WHERE resource_id IS NULL 
AND EXISTS (
    SELECT 1 FROM resources r 
    WHERE (
        LOWER(r.title) LIKE '%customer%' AND LOWER(missions.title) LIKE '%customer%'
        OR LOWER(r.title) LIKE '%experience%' AND LOWER(missions.title) LIKE '%experience%'
        OR LOWER(r.title) LIKE '%happiness%' AND LOWER(missions.title) LIKE '%happiness%'
        OR LOWER(r.title) LIKE '%leadership%' AND LOWER(missions.title) LIKE '%leadership%'
    )
);

-- Show the results
SELECT 'Updated missions with resources:' as info;
SELECT 
    m.id,
    m.title as mission_title,
    m.type as mission_type,
    r.title as resource_title,
    r.type as resource_type,
    r.url as resource_url
FROM missions m
LEFT JOIN resources r ON m.resource_id = r.id
ORDER BY m.title;

-- Show any missions that still don't have resources
SELECT 'Missions still without resources:' as info;
SELECT id, title, type FROM missions WHERE resource_id IS NULL;
