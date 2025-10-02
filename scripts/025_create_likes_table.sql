-- Create likes table for submission interactions
CREATE TABLE IF NOT EXISTS public.likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, submission_id)
);

-- Add RLS policies for likes
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Users can view all likes
CREATE POLICY "Users can view all likes" ON public.likes
    FOR SELECT USING (true);

-- Users can insert their own likes
CREATE POLICY "Users can insert own likes" ON public.likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own likes
CREATE POLICY "Users can delete own likes" ON public.likes
    FOR DELETE USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_likes_submission_id ON public.likes(submission_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);
