-- Add resource_id column to missions table to link missions with resources
ALTER TABLE missions 
ADD COLUMN resource_id UUID REFERENCES resources(id);

-- Add index for better query performance
CREATE INDEX idx_missions_resource_id ON missions(resource_id);
