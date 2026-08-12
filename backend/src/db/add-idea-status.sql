-- ============================================================
-- Migration: add idea_status lifecycle column to ideas
-- Values: 'active' | 'done' | 'archived'
-- Run: docker compose exec -T db psql -U mvpclub -d mvpclub < backend/src/db/add-idea-status.sql
-- ============================================================

ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS idea_status TEXT NOT NULL DEFAULT 'active'
  CHECK (idea_status IN ('active', 'done', 'archived'));

-- Backfill: ideas already at stage='done' are considered done
UPDATE ideas SET idea_status = 'done' WHERE stage = 'done' AND idea_status = 'active';

SELECT
  idea_status,
  COUNT(*) AS count
FROM ideas
GROUP BY idea_status
ORDER BY idea_status;
