-- Create resources table for the Resources Hub
CREATE TABLE IF NOT EXISTS resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read resources
CREATE POLICY "Allow authenticated users to read resources" ON resources
    FOR SELECT TO authenticated
    USING (true);

-- Create policy to allow admin users to manage resources
-- For now, we'll allow all authenticated users to manage resources
-- This can be restricted later based on user roles
CREATE POLICY "Allow authenticated users to manage resources" ON resources
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
