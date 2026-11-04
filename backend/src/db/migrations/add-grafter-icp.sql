-- MVP Club -- Grafter ICP migration
-- Run: PGPASSWORD=mvpclub_secret psql -h localhost -p 5433 -U mvpclub -d mvpclub -f "backend/src/db/migrations/add-grafter-icp.sql"
--
-- Grafter Sprint 2, GRF-13 through GRF-15 (propose an ICP from the approved
-- Brian, edit it, approve it -- prospecting (GRF-18) is gated on this being
-- approved). Requires add-grafter-brian.sql to already be applied.
--
-- Same versioning model as grafter_company_brain: one row per version, the
-- latest row is "active", approving doesn't create a new row, only a
-- rebuild (POST /api/grafter/icp/build again) does.
--
-- fields is a JSONB object of four keys -- target_profile, jobs_to_be_done,
-- frustrations, current_alternatives -- each { value: string, sources:
-- string[] }, sources drawn from ('brian'|'founder_edit') since the ICP is
-- derived only from the approved Brian, never straight from site content.

CREATE TABLE IF NOT EXISTS grafter_icp (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id     UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  version     INTEGER NOT NULL,
  status      VARCHAR(10) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved')),
  fields      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  UNIQUE (idea_id, version)
);

CREATE INDEX IF NOT EXISTS idx_grafter_icp_idea ON grafter_icp(idea_id, version DESC);
