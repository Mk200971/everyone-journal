-- Update missions to link them with appropriate resources
-- Based on the available resources and mission themes

-- Link customer experience and leadership missions to relevant resources
UPDATE missions 
SET resource_id = '652930c9-aaef-4bf9-9d07-c09ce9a06027' -- Steve Jobs - Start with Customer Experience
WHERE title ILIKE '%customer%' OR title ILIKE '%experience%' OR title ILIKE '%service%'
  AND resource_id IS NULL;

-- Link leadership and purpose-driven missions to Simon Sinek's "Start with Why"
UPDATE missions 
SET resource_id = '19b9e808-3a63-44ea-9962-734fd406290d' -- Simon Sinek - Start with Why
WHERE (title ILIKE '%leader%' OR title ILIKE '%purpose%' OR title ILIKE '%why%' OR title ILIKE '%inspire%')
  AND resource_id IS NULL;

-- Link culture and happiness-focused missions to "Delivering Happiness"
UPDATE missions 
SET resource_id = 'fc87d17f-7ce3-41aa-a224-e30064b36d10' -- Delivering Happiness book
WHERE (title ILIKE '%culture%' OR title ILIKE '%happiness%' OR title ILIKE '%team%' OR title ILIKE '%employee%')
  AND resource_id IS NULL;

-- Link data/analytics missions to the HBR quantified value article
UPDATE missions 
SET resource_id = 'fffb0639-70d4-4c33-bf79-f5a42308a221' -- HBR - Value of Customer Experience, Quantified
WHERE (title ILIKE '%data%' OR title ILIKE '%metric%' OR title ILIKE '%measure%' OR title ILIKE '%analytics%')
  AND resource_id IS NULL;

-- Link remaining customer-focused missions to the Forrester podcast
UPDATE missions 
SET resource_id = '5ca3aa07-0b5f-48b2-b5ed-a479f0faa10e' -- Forrester CX Cast podcast
WHERE (title ILIKE '%behavior%' OR title ILIKE '%focus%' OR description ILIKE '%customer%')
  AND resource_id IS NULL;

-- Show the results
SELECT 
  m.title as mission_title,
  r.title as linked_resource,
  r.type as resource_type
FROM missions m
LEFT JOIN resources r ON m.resource_id = r.id
WHERE m.resource_id IS NOT NULL
ORDER BY m.title;
