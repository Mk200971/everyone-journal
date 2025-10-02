-- Check what the actual image URLs look like in the database
SELECT 
    id,
    title,
    image_url,
    CASE 
        WHEN image_url IS NULL THEN 'No image URL'
        WHEN image_url LIKE '%supabase%' THEN 'Supabase URL format'
        ELSE 'Other URL format'
    END as url_type
FROM missions 
WHERE image_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Also check if there are any missions without image URLs
SELECT COUNT(*) as missions_without_images
FROM missions 
WHERE image_url IS NULL;
