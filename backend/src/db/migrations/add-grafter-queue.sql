-- Sprint 2 (GRF-16): widen grafter_run.status so a job can sit as 'queued'
-- before grafter-worker claims it. Sprint 1's jobs (fetch_site, brain_build)
-- keep running inline via runGrafterJob and never use 'queued' -- this just
-- makes room for jobs that go through the worker instead.
ALTER TABLE grafter_run DROP CONSTRAINT IF EXISTS grafter_run_status_check;
ALTER TABLE grafter_run ADD CONSTRAINT grafter_run_status_check
  CHECK (status IN ('queued', 'running', 'done', 'failed'));
