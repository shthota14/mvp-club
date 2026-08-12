ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS interviewee_email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meeting_provider  TEXT NOT NULL DEFAULT '' CHECK (meeting_provider IN ('', 'zoom', 'teams', 'manual')),
  ADD COLUMN IF NOT EXISTS meeting_link      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meeting_id        TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invite_sent_at    TIMESTAMPTZ;
