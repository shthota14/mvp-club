-- MVP Club -- Grafter reply detection migration (GRF-27)
-- Run: PGPASSWORD=mvpclub_secret psql -h localhost -p 5433 -U mvpclub -d mvpclub -f "backend/src/db/migrations/add-grafter-reply-detection.sql"
--
-- grafter_outreach.status already had 'replied' in its CHECK constraint and
-- replied_at already existed (add-grafter-outreach.sql anticipated this,
-- see its comment referencing "no reply parsing yet -- GRF-27" on the
-- opt-out route) -- this migration only adds what was actually missing to
-- detect one: the Gmail thread id, captured at send time, that
-- grafter-worker's periodic sweep (replyDetection.ts) polls against.

ALTER TABLE grafter_outreach
  ADD COLUMN IF NOT EXISTS gmail_thread_id TEXT;

-- Reply detection reads threads, which gmail.send alone does not permit --
-- the mailbox OAuth flow now also requests gmail.metadata (labels/headers
-- only, never bodies). Record what each founder ACTUALLY granted so the
-- sweep can skip mailboxes connected before that change (they need to
-- reconnect) instead of 403ing on every thread every 5 minutes.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gmail_scopes TEXT;
