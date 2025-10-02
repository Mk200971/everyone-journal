-- Link existing missions to their corresponding resources
-- This script maps specific missions to resources based on the provided mapping

-- Link "The CX Cast Ep.371 (Podcast)" mission to Forrester resource
UPDATE missions 
SET resource_id = (
    SELECT id FROM resources 
    WHERE title = 'The CX Cast Ep.371: Customer-Focused Culture Behaviors'
)
WHERE title = 'The CX Cast Ep.371 (Podcast)';

-- Link "Start with the Customer Experience (Video)" mission to Steve Jobs resource
UPDATE missions 
SET resource_id = (
    SELECT id FROM resources 
    WHERE title = 'Start with the Customer Experience - Steve Jobs'
)
WHERE title = 'Start with the Customer Experience (Video)';

-- Link "Start with Why (TEDx Video)" mission to Simon Sinek resource
UPDATE missions 
SET resource_id = (
    SELECT id FROM resources 
    WHERE title = 'Start with Why - Simon Sinek TEDx Talk'
)
WHERE title = 'Start with Why (TEDx Video)';

-- Link "The Value of CX, Quantified (Article)" mission to HBR resource
UPDATE missions 
SET resource_id = (
    SELECT id FROM resources 
    WHERE title = 'The Value of Customer Experience, Quantified'
)
WHERE title = 'The Value of CX, Quantified (Article)';
