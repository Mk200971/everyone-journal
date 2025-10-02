-- Debug script to check mission image URLs and storage bucket status
SELECT 
    id,
    title,
    image_url,
    CASE 
        WHEN image_url IS NULL THEN 'No image URL'
        WHEN image_url LIKE '%supabase%' THEN 'Supabase URL'
        ELSE 'Other URL'
    END as url_type
FROM missions 
WHERE image_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Check if missions-media bucket exists and its policies
SELECT 
    id as bucket_id,
    name as bucket_name,
    public as is_public,
    created_at
FROM storage.buckets 
WHERE id = 'missions-media';

-- Check storage policies for missions-media bucket
SELECT 
    id,
    name,
    bucket_id,
    operation,
    definition
FROM storage.policies 
WHERE bucket_id = 'missions-media'
ORDER BY operation;
