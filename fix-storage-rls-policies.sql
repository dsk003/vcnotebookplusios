-- Fix RLS policies for Supabase Storage to work with Firebase authentication
-- Run this SQL in your Supabase SQL Editor

-- First, drop any existing policies on the storage.objects table
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own files" ON storage.objects;

-- Create permissive policies for Firebase auth
-- Since we're using Firebase auth, we need to be more permissive with storage access
-- The security is handled at the application level through user_id filtering

-- Policy 1: Allow all authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'note-attachments' AND
  auth.role() = 'authenticated'
);

-- Policy 2: Allow all authenticated users to view files
CREATE POLICY "Allow authenticated downloads" ON storage.objects
FOR SELECT USING (
  bucket_id = 'note-attachments' AND
  auth.role() = 'authenticated'
);

-- Policy 3: Allow all authenticated users to delete files
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE USING (
  bucket_id = 'note-attachments' AND
  auth.role() = 'authenticated'
);

-- Alternative: If the above doesn't work, try this more permissive approach
-- Uncomment these if the above policies still don't work:

-- DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated downloads" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- CREATE POLICY "Allow all operations on note-attachments" ON storage.objects
-- FOR ALL USING (bucket_id = 'note-attachments');

-- If you want to be more restrictive and use Firebase user IDs, you can try:
-- CREATE POLICY "Allow Firebase user uploads" ON storage.objects
-- FOR INSERT WITH CHECK (
--   bucket_id = 'note-attachments' AND
--   (storage.foldername(name))[1] IS NOT NULL
-- );

-- CREATE POLICY "Allow Firebase user downloads" ON storage.objects
-- FOR SELECT USING (
--   bucket_id = 'note-attachments' AND
--   (storage.foldername(name))[1] IS NOT NULL
-- );

-- CREATE POLICY "Allow Firebase user deletes" ON storage.objects
-- FOR DELETE USING (
--   bucket_id = 'note-attachments' AND
--   (storage.foldername(name))[1] IS NOT NULL
-- );
