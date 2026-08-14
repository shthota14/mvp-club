-- MVP Club — Startup News: AI-rephrased headline column
-- Run: docker compose exec -T db psql -U mvpclub -d mvpclub < backend/src/db/migrations/add-startup-news-headline.sql
--
-- Adds a "headline" column holding Ollama's rephrased version of each real
-- scraped headline. The feed no longer links out to the source site — users
-- see the rephrased headline text only, with the source named (not linked)
-- for attribution. "title" (the original scraped headline) is kept for
-- dedup/auditing but is no longer shown in the UI.

ALTER TABLE startup_news_items ADD COLUMN IF NOT EXISTS headline TEXT;
