-- Update profile fields from learning_goals and favorite_media to bio and country
ALTER TABLE profiles 
RENAME COLUMN learning_goals TO bio;

ALTER TABLE profiles 
RENAME COLUMN favorite_media TO country;
