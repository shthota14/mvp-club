-- MVP Club — Grafter foundation migration
-- Run: PGPASSWORD=mvpclub_secret psql -h localhost -p 5433 -U mvpclub -d mvpclub -f "backend/src/db/migrations/add-grafter-foundation.sql"
--
-- Grafter (the "AI Sales Module" epic — see docs/architecture-review.md and
-- the PRD at https://claude.ai/code/artifact/43aa5e00-5802-40cd-83ed-75cb4a3c1db1).
-- This migration lays down only what Sprint 1's foundation stories need
-- (GRF-4/5/6): a place to log every Grafter background job/fetch
-- (grafter_run — required by the PRD's Definition of Done, "any background
-- job it adds writes to grafter_run"), and a small cache so the research
-- gateway never re-fetches the same URL twice in a row (GRF-6's AC).
--
-- No workspace/tenant concept is introduced — every table below scopes to
-- idea_id NOT NULL REFERENCES ideas(id), per the architecture review's
-- finding that the app's real tenancy is users -> ideas.
--
-- Deliberately NOT in this migration: grafter_company_brain, grafter_icp,
-- grafter_company, grafter_prospect, grafter_fact (those land with the
-- Sprint 1 stories that actually build Brian -- GRF-7 onward).

CREATE TABLE IF NOT EXISTS grafter_run (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id     UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  kind        VARCHAR(40) NOT NULL,                  -- 'fetch_site' for now; 'brain_build' etc. join later
  status      VARCHAR(20) NOT NULL DEFAULT 'running'  -- 'running' | 'done' | 'failed'
              CHECK (status IN ('running','done','failed')),
  input       JSONB,
  output      JSONB,
  error       TEXT,
  started_at  TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_grafter_run_idea ON grafter_run(idea_id, started_at DESC);

-- research-gateway's fetch cache. Keyed on the normalized URL so any idea
-- that already fetched a given site (or re-fetches its own) reuses the
-- cached page instead of hitting it again -- this is the "and is cached"
-- half of GRF-6's acceptance criteria. TTL is enforced in application code
-- (researchGateway.ts), not here, so it can change without a migration.
CREATE TABLE IF NOT EXISTS grafter_fetch_cache (
  url          TEXT PRIMARY KEY,
  status_code  INTEGER,
  content      TEXT,                                  -- fetched text, truncated to a sane size in code
  content_type TEXT,
  error        TEXT,                                   -- set when the fetch failed; content is null in that case
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
