-- Add is_admin column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Set the current user as admin (Mohamed khaled)
UPDATE profiles 
SET is_admin = true 
WHERE id = 'ccfe8d8b-807e-4646-afd9-8d274284cf4c';

-- Verify the change
SELECT id, name, email, is_admin FROM profiles WHERE is_admin = true;
