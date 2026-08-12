-- AI-driven alignment classification for logged interviews (Validate step 8).
-- The founder's alignment_score/confirmed_problem columns (added by
-- add-interview-alignment.sql) remain the human-facing, human-editable
-- source of truth for badges/counts elsewhere in the app. These new columns
-- hold the AI's own read of the same transcript, independent of the human
-- call, plus the reasoning/conversation behind it:
--   ai_alignment_score / ai_reasoning / ai_evidence — the AI's classification
--     (1 = not confirmed, 2 = partial, 3 = confirmed), its written rationale,
--     and a small list of supporting quotes, each tagged positive/negative/
--     neutral. Set by POST /api/interviews/:id/ai-classify.
--   ai_chat_log — the back-and-forth when a founder pushes back on the AI's
--     read ("reason with AI"), an array of {role: 'founder'|'ai', text}
--     turns. Appended to by POST /api/interviews/:id/ai-reason, which may
--     also revise ai_alignment_score/ai_reasoning if genuinely persuaded.
--   score_overridden — true once the founder has manually picked an
--     alignment_score that differs from the AI's ai_alignment_score. Used so
--     a later AI reclassification (e.g. after "reason with AI" revises its
--     take) never silently overwrites a founder's explicit override.
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS ai_alignment_score SMALLINT CHECK (ai_alignment_score BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS ai_evidence JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_chat_log JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS score_overridden BOOLEAN DEFAULT false;
