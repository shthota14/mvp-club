-- MVP Club -- Grafter outreach migration
-- Run: PGPASSWORD=mvpclub_secret psql -h localhost -p 5433 -U mvpclub -d mvpclub -f "backend/src/db/migrations/add-grafter-outreach.sql"
--
-- Grafter Sprint 3 / Stage 4 (outreach), round 1: mailbox connection +
-- kill switch -- the two things the architecture review said must exist
-- BEFORE any send capability is built, not after. Requires
-- add-grafter-prospects.sql to already be applied.
--
-- Sender identity decision (2026-09-27): the founder's own mailbox via
-- OAuth, never MVP Club's own sending infrastructure -- outreach must
-- never share a sending identity with mvpclub.io's transactional mail
-- (password resets, etc via Brevo). Mirrors add-zoom-oauth.sql's shape
-- (columns on users, plaintext at rest -- same as this codebase's existing
-- OAuth integrations; there's no secrets-at-rest encryption helper here to
-- reuse, matching the Zoom precedent, not introducing a new one for this).
--
-- Controller decision (2026-09-27): MVP Club is the data controller for
-- prospect data (sourced via Apollo, not from the data subject), so GDPR
-- Article 14 requires notifying each prospect -- satisfied by folding the
-- required disclosures (controller identity, purpose, legal basis, data
-- source, opt-out) into the outreach email itself as a non-removable
-- footer block (see outreachDraft.ts, GRF-22), rather than a separate
-- notice-sending mechanism. grafter_outreach.art14_notice_included records
-- that every send carried it.
--
-- Kill switch (PRD FR6): per-idea, not global -- one founder pausing
-- their own outreach must never affect anyone else's.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gmail_email            TEXT,
  ADD COLUMN IF NOT EXISTS gmail_access_token      TEXT,
  ADD COLUMN IF NOT EXISTS gmail_refresh_token     TEXT,
  ADD COLUMN IF NOT EXISTS gmail_token_expires_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gmail_connected_at      TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS grafter_outreach_settings (
  idea_id     UUID PRIMARY KEY REFERENCES ideas(id) ON DELETE CASCADE,
  paused_at   TIMESTAMPTZ,
  paused_reason TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- One outreach thread per candidate per idea. status starts 'drafted' (an
-- AI-written draft the founder hasn't approved yet -- GRF-23 requires this
-- gate before anything can move to 'sent'), never inserted as anything else.
CREATE TABLE IF NOT EXISTS grafter_outreach (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id                UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  prospect_id            UUID NOT NULL REFERENCES grafter_prospect(id) ON DELETE CASCADE,
  status                 VARCHAR(10) NOT NULL DEFAULT 'drafted' CHECK (status IN ('drafted','approved','sent','failed','replied')),
  subject                TEXT NOT NULL,
  body                   TEXT NOT NULL,
  art14_notice_included  BOOLEAN NOT NULL DEFAULT TRUE,
  gmail_message_id       TEXT,
  error                  TEXT,
  sent_at                TIMESTAMPTZ,
  replied_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (idea_id, prospect_id)
);

CREATE INDEX IF NOT EXISTS idx_grafter_outreach_idea ON grafter_outreach(idea_id, created_at DESC);
