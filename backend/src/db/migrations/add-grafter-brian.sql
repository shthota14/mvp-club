-- MVP Club -- Grafter Brian migration
-- Run: PGPASSWORD=mvpclub_secret psql -h localhost -p 5433 -U mvpclub -d mvpclub -f "backend/src/db/migrations/add-grafter-brian.sql"
--
-- Grafter Sprint 1, GRF-7 through GRF-10 (build Brian, fall back to 3
-- direct questions, review/edit, approve + version on rebuild). See
-- docs/architecture-review.md and the PRD for context; requires
-- add-grafter-foundation.sql to already be applied (grafter_run).
--
-- One row per version, per the PRD's data model table ("one row per
-- approved version, idea_id FK, versioned") -- the latest row by version
-- number is always the "active" one; approving doesn't create a new row,
-- only a rebuild (calling POST /api/grafter/brain/build again) does.
--
-- fields is a JSONB object of exactly three keys -- what_you_sell,
-- who_its_for, pricing -- each { value: string, sources: string[] }. This
-- intentionally skips a separate grafter_fact table (the PRD's fuller data
-- model) for this slice: per-prospect sourced facts are Sprint 2's concern
-- (GRF-18/19/20), and a per-field sources array already satisfies GRF-7's
-- "every field tagged by source" AC without that extra table yet.

CREATE TABLE IF NOT EXISTS grafter_company_brain (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id            UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  version            INTEGER NOT NULL,
  status             VARCHAR(10) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved')),
  fields             JSONB NOT NULL DEFAULT '{}'::jsonb,
  needs_manual_input BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  approved_at        TIMESTAMPTZ,
  UNIQUE (idea_id, version)
);

CREATE INDEX IF NOT EXISTS idx_grafter_brain_idea ON grafter_company_brain(idea_id, version DESC);
