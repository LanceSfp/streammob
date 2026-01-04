-- Add lock_code column to profiles table
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS lock_code TEXT;

-- Optional: Add a comment to document the column
COMMENT ON COLUMN profiles.lock_code IS '4-digit PIN code to lock the profile';

