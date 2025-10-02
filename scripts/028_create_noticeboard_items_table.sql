-- Create noticeboard_items table for quotes/announcements
CREATE TABLE IF NOT EXISTS public.noticeboard_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  author_title TEXT NOT NULL,
  year TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.noticeboard_items ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read active noticeboard items
CREATE POLICY "Allow authenticated users to read active noticeboard items" 
ON public.noticeboard_items FOR SELECT 
USING (auth.role() = 'authenticated' AND is_active = true);

-- Allow all authenticated users to read all noticeboard items (for admin interface)
CREATE POLICY "Allow authenticated users to read all noticeboard items" 
ON public.noticeboard_items FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert noticeboard items
CREATE POLICY "Allow authenticated users to insert noticeboard items" 
ON public.noticeboard_items FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update noticeboard items
CREATE POLICY "Allow authenticated users to update noticeboard items" 
ON public.noticeboard_items FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete noticeboard items
CREATE POLICY "Allow authenticated users to delete noticeboard items" 
ON public.noticeboard_items FOR DELETE 
USING (auth.role() = 'authenticated');
