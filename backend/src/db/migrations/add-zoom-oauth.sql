-- Per-user Zoom OAuth connection, so each idea originator's interview
-- meetings are created under -- and hosted by -- their own (free) Zoom
-- account, instead of always going through one shared Server-to-Server
-- account. Mirrors add-linkedin-oauth.sql's columns-on-users shape.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS zoom_user_id          TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS zoom_email            TEXT,
  ADD COLUMN IF NOT EXISTS zoom_access_token     TEXT,
  ADD COLUMN IF NOT EXISTS zoom_refresh_token    TEXT,
  ADD COLUMN IF NOT EXISTS zoom_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS zoom_connected_at     TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_zoom_user_id ON users(zoom_user_id);
