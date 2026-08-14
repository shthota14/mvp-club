-- MVP Club — Feedback Migration
-- Run: PGPASSWORD=mvpclub_secret psql -h localhost -p 5433 -U mvpclub -d mvpclub -f "backend/src/db/migrations/add-feedback.sql"
--
-- Global "Feedback" widget (feature requests / bug reports / improvement
-- proposals / general feedback), visible on every page via a top-nav icon
-- and a floating tab (see FeedbackWidget.tsx, mounted in AppShell.tsx).
-- Submissions land in a private admin-only inbox (Admin Panel → Feedback
-- tab) — never shown to other users, mirroring how notifications.ts and
-- add-notifications.sql are structured.

CREATE TABLE IF NOT EXISTS feedback_submissions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category     VARCHAR(20) NOT NULL,                 -- 'feature' | 'bug' | 'improvement' | 'feedback'
  message      TEXT NOT NULL,
  page_context TEXT,                                  -- e.g. '/work' — where the user was when they submitted
  status       VARCHAR(20) NOT NULL DEFAULT 'new',     -- 'new' | 'reviewing' | 'planned' | 'done' | 'dismissed'
  admin_notes  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback_submissions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user   ON feedback_submissions(user_id);
