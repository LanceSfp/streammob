-- Create watch_history table to track user viewing progress
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS watch_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  video_title TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  watch_time REAL NOT NULL DEFAULT 0,
  duration REAL NOT NULL DEFAULT 0,
  progress_percent REAL NOT NULL DEFAULT 0,
  last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, profile_id, video_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_watch_history_user_profile ON watch_history(user_id, profile_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_last_watched ON watch_history(last_watched_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own watch history
CREATE POLICY "Users can view own watch history"
  ON watch_history FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own watch history
CREATE POLICY "Users can insert own watch history"
  ON watch_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own watch history
CREATE POLICY "Users can update own watch history"
  ON watch_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own watch history
CREATE POLICY "Users can delete own watch history"
  ON watch_history FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_watch_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_watch_history_updated_at
  BEFORE UPDATE ON watch_history
  FOR EACH ROW
  EXECUTE FUNCTION update_watch_history_updated_at();

