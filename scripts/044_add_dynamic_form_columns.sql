-- Add submission_schema column to missions table for dynamic form definitions
ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS submission_schema JSONB;

-- Add answers column to submissions table for structured JSON responses
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS answers JSONB;

-- Add comment to explain the new columns
COMMENT ON COLUMN missions.submission_schema IS 'JSON schema defining the form fields and validation rules for mission submissions';
COMMENT ON COLUMN submissions.answers IS 'Structured JSON data containing user responses based on the mission submission schema';

-- Create index on submission_schema for better query performance
CREATE INDEX IF NOT EXISTS idx_missions_submission_schema ON missions USING GIN (submission_schema);

-- Create index on answers for better query performance  
CREATE INDEX IF NOT EXISTS idx_submissions_answers ON submissions USING GIN (answers);
