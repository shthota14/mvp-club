-- ── User management migration ─────────────────────────────────────────────────
-- Run: PGPASSWORD=mvpclub_secret psql -h localhost -p 5433 -U mvpclub -d mvpclub -f "backend/src/db/add-user-management.sql"

ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT FALSE;

SELECT 'Migration complete' AS status;
