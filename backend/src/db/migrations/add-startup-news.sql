-- MVP Club — Startup News Migration
-- Run: docker compose exec -T db psql -U mvpclub -d mvpclub < backend/src/db/migrations/add-startup-news.sql
--
-- Backs the "Early-Stage Funding News" widget on the Community page. A daily
-- cron job (backend/src/jobs/startupNewsDigest.ts) fetches real angel/seed
-- funding headlines from Google News RSS, uses the local Ollama model to
-- filter out anything that isn't genuinely an early-stage funding story and
-- write a one-line "why it matters" blurb, then upserts the results here.
-- Headlines/URLs are real and sourced live — only the relevance filter and
-- blurb are AI-generated, never the news itself.

CREATE TABLE IF NOT EXISTS startup_news_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  url          TEXT NOT NULL UNIQUE,
  source       VARCHAR(200),
  blurb        TEXT,
  published_at TIMESTAMPTZ,
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_startup_news_published ON startup_news_items(published_at DESC);
