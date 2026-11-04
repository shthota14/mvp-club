-- MVP Club -- Grafter contact-data migration
-- Run: PGPASSWORD=mvpclub_secret psql -h localhost -p 5433 -U mvpclub -d mvpclub -f "backend/src/db/migrations/add-grafter-contacts.sql"
--
-- Grafter Sprint 3, round 2: the contact layer that GRF-18-20's company
-- list was always missing before outreach could work at all -- you can't
-- email a company. Adds a person (name/title/email) per approved prospect,
-- sourced from Apollo People Search + People Enrichment (the founder's
-- choice, 2026-09-27) using the SAME Apollo key already configured for
-- company search -- no new provider decision needed.
--
-- apollo_org_id backfills a column add-grafter-prospects.sql should have
-- had from the start: Apollo's own organization id, needed to filter
-- People Search by organization_ids rather than re-guessing by domain.
-- Existing rows will have it NULL until re-prospected; that's fine --
-- contactFinder.ts falls back to nothing rather than guessing an org id.
--
-- Apollo will not reveal a personal email for someone in a GDPR region
-- (UK/EU) -- email is nullable here for exactly that reason, not because
-- it was skipped. A contact with no email is unusable for outreach but is
-- still shown (name/title/LinkedIn), same "show what's real, never
-- fabricate the rest" principle as grafter_prospect.

ALTER TABLE grafter_prospect
  ADD COLUMN IF NOT EXISTS apollo_org_id TEXT;

CREATE TABLE IF NOT EXISTS grafter_contact (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id       UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  prospect_id   UUID NOT NULL REFERENCES grafter_prospect(id) ON DELETE CASCADE,
  name          VARCHAR(300) NOT NULL,
  title         VARCHAR(300),
  email         TEXT,
  email_status  VARCHAR(30),
  linkedin_url  TEXT,
  source        VARCHAR(30) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (prospect_id)
);

CREATE INDEX IF NOT EXISTS idx_grafter_contact_idea ON grafter_contact(idea_id);
