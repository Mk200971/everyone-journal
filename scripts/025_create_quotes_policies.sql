-- Enable RLS on noticeboard_items table
ALTER TABLE noticeboard_items ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read active noticeboard items
CREATE POLICY "Allow authenticated users to read active noticeboard items" 
ON noticeboard_items FOR SELECT 
USING (auth.role() = 'authenticated' AND is_active = true);

-- Allow all authenticated users to read all noticeboard items (for admin interface)
CREATE POLICY "Allow authenticated users to read all noticeboard items" 
ON noticeboard_items FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert noticeboard items
CREATE POLICY "Allow authenticated users to insert noticeboard items" 
ON noticeboard_items FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update noticeboard items
CREATE POLICY "Allow authenticated users to update noticeboard items" 
ON noticeboard_items FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete noticeboard items
CREATE POLICY "Allow authenticated users to delete noticeboard items" 
ON noticeboard_items FOR DELETE 
USING (auth.role() = 'authenticated');
