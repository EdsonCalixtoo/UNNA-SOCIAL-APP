-- Add cover_url column to profiles table for profile background banner custom image
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_url text;
