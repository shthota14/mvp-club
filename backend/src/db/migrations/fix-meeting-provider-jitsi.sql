-- Fixes the interviews.meeting_provider CHECK constraint left over from the
-- Zoom integration. It only ever allowed ('', 'zoom', 'teams', 'manual'), but
-- the app has since moved to public Jitsi Meet and now writes
-- meeting_provider = 'jitsi' for every meeting link it creates.
--
-- On any database that still has the old constraint, EVERY booking attempt
-- fails: scheduling.ts's POST /book/:token handler runs
--   UPDATE interviews SET ... meeting_provider = 'jitsi' ... WHERE id = $5
-- which Postgres rejects with "new row for relation "interviews" violates
-- check constraint "interviews_meeting_provider_check"" -- an error message
-- that isMissingSchedulingTables() doesn't recognise, so it falls through to
-- the generic 500 "Internal server error" the booking page shows, on every
-- single slot the visitor tries.
--
-- Run once against your database:
--   docker exec -i mvpclub-db-1 psql -U mvpclub -d mvpclub < backend/src/db/migrations/fix-meeting-provider-jitsi.sql
-- or, if you connect directly instead of through the container:
--   PGPASSWORD=mvpclub_secret psql -h localhost -p 5433 -U mvpclub -d mvpclub -f backend/src/db/migrations/fix-meeting-provider-jitsi.sql

ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_meeting_provider_check;
ALTER TABLE interviews ADD CONSTRAINT interviews_meeting_provider_check
  CHECK (meeting_provider IN ('', 'zoom', 'teams', 'manual', 'jitsi'));
