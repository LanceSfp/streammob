# Setting Up Watch History in Supabase

This guide will walk you through setting up the watch history feature in your Supabase database.

## Step 1: Access Supabase SQL Editor

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. In the left sidebar, click on **SQL Editor**
4. Click **New Query** to create a new SQL query

## Step 2: Run the Migration SQL

1. Open the file `stream/browse/watch_history_schema.sql` in your project
2. Copy the entire contents of the file
3. Paste it into the Supabase SQL Editor
4. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

The SQL will:
- Create the `watch_history` table
- Add indexes for better query performance
- Set up Row Level Security (RLS) policies
- Create a trigger to automatically update timestamps

## Step 3: Verify the Setup

After running the SQL, verify everything was created correctly:

1. In Supabase Dashboard, go to **Table Editor**
2. You should see a new table called `watch_history`
3. Check that it has the following columns:
   - `id` (uuid, primary key)
   - `user_id` (uuid)
   - `profile_id` (uuid)
   - `video_id` (text)
   - `video_title` (text)
   - `video_url` (text)
   - `thumbnail_url` (text)
   - `current_time` (real)
   - `duration` (real)
   - `progress_percent` (real)
   - `last_watched_at` (timestamp)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

## Step 4: Verify RLS Policies

1. In Supabase Dashboard, go to **Authentication** → **Policies**
2. Select the `watch_history` table
3. You should see 4 policies:
   - "Users can view own watch history" (SELECT)
   - "Users can insert own watch history" (INSERT)
   - "Users can update own watch history" (UPDATE)
   - "Users can delete own watch history" (DELETE)

## Step 5: Test the Feature

1. Open your application and log in
2. Watch a video for at least 5 seconds
3. Navigate away from the video
4. Go to the browse page - you should see a "Continue Watching" section
5. Check the video thumbnail - it should have a red progress bar at the bottom

## Troubleshooting

### If you get an error about `profiles` table:

If the `profiles` table doesn't exist or has a different structure, you can modify the SQL:

```sql
-- Remove the foreign key constraint temporarily
CREATE TABLE IF NOT EXISTS watch_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID, -- Remove REFERENCES if profiles table doesn't exist
  -- ... rest of columns
);
```

### If you get permission errors:

Make sure you're running the SQL as a database administrator or with sufficient privileges. The SQL uses `CREATE TABLE`, `CREATE INDEX`, `CREATE POLICY`, etc., which require admin access.

### Testing with localStorage fallback:

Even if the database setup isn't complete, the watch history feature will still work using localStorage as a fallback. However, data will only be stored locally in the browser and won't sync across devices.

## Additional Notes

- The watch history is automatically saved every 5 seconds while watching
- Videos with 95% or more progress won't appear in "Continue Watching"
- Each user/profile combination can only have one watch history entry per video (enforced by UNIQUE constraint)
- Watch history is automatically deleted when a user or profile is deleted (CASCADE)

