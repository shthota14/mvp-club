-- ============================================================
-- Migration: diagrams table (one per idea, JSON state)
-- Run: docker compose exec -T db psql -U mvpclub -d mvpclub < backend/src/db/add-diagrams.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS diagrams (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id     UUID NOT NULL UNIQUE REFERENCES ideas(id) ON DELETE CASCADE,
  state       JSONB NOT NULL DEFAULT '{"items":{},"arrs":[]}',
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS diagrams_idea_id_idx ON diagrams(idea_id);

SELECT 'diagrams table created' AS status;
