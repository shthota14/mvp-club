-- MVP Club -- Grafter suppression list migration
-- Run: PGPASSWORD=mvpclub_secret psql -h localhost -p 5433 -U mvpclub -d mvpclub -f "backend/src/db/migrations/add-grafter-suppression.sql"
--
-- Grafter Sprint 3, round 2 (GRF-25): once someone opts out, they must
-- never be emailed again for this idea -- checked by email address, not
-- by prospect/contact row, so re-prospecting the same company later can't
-- accidentally re-add them. Requires add-grafter-contacts.sql.
--
-- v1 has no reply-parsing (GRF-27, not yet built), so this is populated by
-- the founder manually marking a contact as opted out -- not automatically
-- from a detected "unsubscribe" reply yet. The check at send time is real
-- regardless of how a row got here.

CREATE TABLE IF NOT EXISTS grafter_suppressed_email (
  idea_id    UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  reason     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (idea_id, email)
);
