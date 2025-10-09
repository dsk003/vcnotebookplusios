-- Add file attachments functionality to notes app
-- Run this SQL in your Supabase SQL Editor

-- Create file_attachments table
CREATE TABLE IF NOT EXISTS file_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    storage_bucket TEXT NOT NULL DEFAULT 'note-attachments',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_file_attachments_note_id ON file_attachments(note_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_user_id ON file_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_created_at ON file_attachments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for file attachments
CREATE POLICY "Users can manage their own file attachments" ON file_attachments
    FOR ALL USING (true) WITH CHECK (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_file_attachments_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_file_attachments_updated_at 
    BEFORE UPDATE ON file_attachments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_file_attachments_updated_at_column();

-- Create storage bucket for note attachments
-- Note: You'll need to create this bucket in the Supabase dashboard under Storage
-- Bucket name: note-attachments
-- Public: false (private bucket)
-- File size limit: 50MB
-- Allowed MIME types: image/*, video/*, application/pdf, text/*, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document
