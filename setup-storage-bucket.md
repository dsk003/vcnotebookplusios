# Setup Supabase Storage Bucket

## Step 1: Create Storage Bucket

1. **Go to your Supabase Dashboard**
2. **Navigate to Storage** (in the left sidebar)
3. **Click "New bucket"**
4. **Configure the bucket:**
   - **Name:** `note-attachments`
   - **Public:** ❌ **Unchecked** (keep it private)
   - **File size limit:** `50` MB
   - **Allowed MIME types:** 
     ```
     image/*
     video/*
     application/pdf
     text/*
     application/msword
     application/vnd.openxmlformats-officedocument.wordprocessingml.document
     ```
5. **Click "Create bucket"**

## Step 2: Set Bucket Policies (Optional but Recommended)

After creating the bucket, you can set up Row Level Security policies:

1. **Go to Storage → Policies**
2. **Click "New Policy" for the `note-attachments` bucket**
3. **Create these policies:**

### Policy 1: Allow users to upload their own files
```sql
CREATE POLICY "Users can upload their own files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'note-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 2: Allow users to view their own files
```sql
CREATE POLICY "Users can view their own files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'note-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 3: Allow users to delete their own files
```sql
CREATE POLICY "Users can delete their own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'note-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## Step 3: Test the Setup

1. **Deploy your app** to Render
2. **Sign in** with Google
3. **Create a new note**
4. **Try uploading a file** - it should work now!

## Troubleshooting

If you still get errors:

1. **Check bucket name** - Make sure it's exactly `note-attachments`
2. **Check bucket permissions** - Should be private
3. **Check file size** - Make sure it's under 50MB
4. **Check file type** - Make sure it's an allowed MIME type
5. **Check debug console** - Look for specific error messages

## Alternative: Create Bucket via SQL

If you prefer to create the bucket via SQL, you can run this in the SQL Editor:

```sql
-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'note-attachments',
  'note-attachments',
  false,
  52428800, -- 50MB in bytes
  ARRAY['image/*', 'video/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);
```
