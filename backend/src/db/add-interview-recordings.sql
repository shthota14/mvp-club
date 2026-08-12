-- ============================================================
-- Migration: audio recordings for interviews
-- Whole-interview recordings (question_n IS NULL) and
-- per-question voice notes (question_n = 1..7).
-- Run: docker compose exec -T db psql -U mvpclub -d mvpclub < backend/src/db/add-interview-recordings.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS interview_recordings (
  id            UUID PRIMARY KEY,
  interview_id  UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_n    INT,                       -- NULL = whole-interview recording
  mime          TEXT NOT NULL DEFAULT 'audio/webm',
  filename      TEXT NOT NULL,
  duration_ms   INT,
  size_bytes    INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_recordings_interview ON interview_recordings(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_recordings_user ON interview_recordings(user_id);
