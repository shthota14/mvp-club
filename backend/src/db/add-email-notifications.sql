-- Add email notification preference to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE;
