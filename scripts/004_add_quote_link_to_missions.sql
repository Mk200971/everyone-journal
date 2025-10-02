-- Add quote_id column to missions table to link to noticeboard_items
ALTER TABLE missions 
ADD COLUMN quote_id uuid REFERENCES noticeboard_items(id);

-- Add comment for clarity
COMMENT ON COLUMN missions.quote_id IS 'Links to a specific quote from noticeboard_items table';
