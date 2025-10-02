-- Add admin policies to allow full access to all tables for export functionality
-- This assumes the admin user has a specific email or we create a function to check admin status

-- Create a function to check if user is admin (you can modify this logic as needed)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the current user's email is the admin email
  -- You can modify this to check against a specific admin user ID or email
  RETURN (
    SELECT email = 'gsplaybook1@gmail.com' 
    FROM auth.users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add admin policies for submissions (allows admin to view all submissions)
CREATE POLICY "Admin can view all submissions" ON public.submissions 
  FOR SELECT USING (is_admin());

-- Add admin policies for profiles (allows admin to view all profiles)  
CREATE POLICY "Admin can view all profiles" ON public.profiles 
  FOR SELECT USING (is_admin());

-- Add admin policies for missions (admin already has access, but making it explicit)
CREATE POLICY "Admin can manage missions" ON public.missions 
  FOR ALL USING (is_admin());

-- Add admin policies for resources if the table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'resources') THEN
    EXECUTE 'CREATE POLICY "Admin can manage resources" ON public.resources FOR ALL USING (is_admin())';
  END IF;
END $$;
