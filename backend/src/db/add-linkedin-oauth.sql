-- LinkedIn OAuth integration

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS linkedin_id           TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS linkedin_url          TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_name         TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_picture      TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_connected_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_linkedin_id ON users(linkedin_id);
