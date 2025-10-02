-- Create profile_activities table to track profile updates
CREATE TABLE IF NOT EXISTS profile_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL DEFAULT 'profile_updated',
    changed_fields TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_profile_activities_user_id ON profile_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_activities_created_at ON profile_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_activities_type ON profile_activities(activity_type);

-- Enable RLS
ALTER TABLE profile_activities ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Profile activities are viewable by everyone" ON profile_activities
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile activities" ON profile_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);
