-- Password reset tokens
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_token        TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;
