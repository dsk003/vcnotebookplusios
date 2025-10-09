-- Migration script to add user_id column to existing notes table
-- Run this SQL in your Supabase SQL Editor

-- First, add the user_id column to the existing table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Update existing notes to have a default user_id (you can change this)
-- This is for any existing notes that don't have a user_id
UPDATE notes SET user_id = 'anonymous' WHERE user_id IS NULL;

-- Make user_id NOT NULL after setting default values
ALTER TABLE notes ALTER COLUMN user_id SET NOT NULL;

-- Now create the index on user_id
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);

-- Update the RLS policy to use the new user_id column
-- First drop the existing policy if it exists
DROP POLICY IF EXISTS "Allow all operations on notes" ON notes;
DROP POLICY IF EXISTS "Users can only access their own notes" ON notes;

-- Create the new policy that allows users to only access their own notes
CREATE POLICY "Users can only access their own notes" ON notes
    FOR ALL USING (auth.uid()::text = user_id);

-- Optional: If you want to clean up the anonymous notes, you can delete them
-- Uncomment the line below if you want to remove notes with user_id = 'anonymous'
-- DELETE FROM notes WHERE user_id = 'anonymous';
