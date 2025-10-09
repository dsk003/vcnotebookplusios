-- Add full-text search functionality to notes table
-- Run this SQL in your Supabase SQL Editor

-- Add a generated column for full-text search
-- This will automatically index the title and content columns
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS title_content_fts tsvector 
GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || content)) STORED;

-- Create a GIN index on the full-text search column for fast searching
CREATE INDEX IF NOT EXISTS idx_notes_title_content_fts 
ON notes USING gin (title_content_fts);

-- Optional: Create a function for more advanced search
CREATE OR REPLACE FUNCTION search_notes(
    search_term TEXT,
    user_id_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.title,
        n.content,
        n.user_id,
        n.created_at,
        n.updated_at
    FROM notes n
    WHERE 
        (user_id_param IS NULL OR n.user_id = user_id_param)
        AND n.title_content_fts @@ to_tsquery('english', search_term)
    ORDER BY 
        ts_rank(n.title_content_fts, to_tsquery('english', search_term)) DESC,
        n.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
