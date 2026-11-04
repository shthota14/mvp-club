-- MVP Club -- Grafter prospecting migration
-- Run: PGPASSWORD=mvpclub_secret psql -h localhost -p 5433 -U mvpclub -d mvpclub -f "backend/src/db/migrations/add-grafter-prospects.sql"
--
-- Grafter Sprint 2, GRF-18 through GRF-20 (find matching companies via a
-- real search provider -- Apollo.io, per the founder's decision -- dedupe
-- them, and attach a real source + reason to each one). Requires
-- add-grafter-icp.sql and add-grafter-queue.sql to already be applied.
--
-- GRF-19 (dedupe): UNIQUE(idea_id, domain) is the dedupe mechanism itself,
-- not just a check -- prospecting.ts inserts with ON CONFLICT DO NOTHING,
-- so a re-run (or two concurrent workers) can never create a second row
-- for the same company under the same idea.
--
-- GRF-20 (source + reason, drop unsourced): source is NOT NULL ('apollo'
-- today -- the only provider wired in) and domain is NOT NULL, because a
-- candidate with no real website/domain is dropped before it ever reaches
-- this table (see prospecting.ts's searchApollo) -- there is no "unsourced"
-- row possible by construction, rather than a nullable column callers have
-- to remember to check.

CREATE TABLE IF NOT EXISTS grafter_prospect (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id        UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  run_id         UUID REFERENCES grafter_run(id) ON DELETE SET NULL,
  name           VARCHAR(300) NOT NULL,
  website        TEXT NOT NULL,
  domain         VARCHAR(300) NOT NULL,
  industry       VARCHAR(200),
  employee_count INTEGER,
  linkedin_url   TEXT,
  source         VARCHAR(30) NOT NULL,
  reason         TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (idea_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_grafter_prospect_idea ON grafter_prospect(idea_id, created_at DESC);
