-- Create programs table
CREATE TABLE IF NOT EXISTS public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create mission_programs junction table
CREATE TABLE IF NOT EXISTS public.mission_programs (
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (mission_id, program_id)
);

-- Enable RLS
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_programs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for programs
CREATE POLICY "Anyone can view programs" ON public.programs FOR SELECT USING (true);
CREATE POLICY "Admins can insert programs" ON public.programs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update programs" ON public.programs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete programs" ON public.programs FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for mission_programs
CREATE POLICY "Anyone can view mission_programs" ON public.mission_programs FOR SELECT USING (true);
CREATE POLICY "Admins can insert mission_programs" ON public.mission_programs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete mission_programs" ON public.mission_programs FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Seed default "Base Activities" program if it doesn't exist
DO $$
DECLARE
  base_program_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.programs WHERE title = 'Base Activities') THEN
    INSERT INTO public.programs (title, description, is_default)
    VALUES ('Base Activities', 'Core missions available to all participants', true)
    RETURNING id INTO base_program_id;
    
    -- Assign all existing missions to this program
    INSERT INTO public.mission_programs (mission_id, program_id)
    SELECT id, base_program_id FROM public.missions;
  END IF;
END $$;
