-- Interviews feature: schedule, prepare questions, take notes
CREATE TABLE IF NOT EXISTS interviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id       UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interviewee_name TEXT NOT NULL DEFAULT '',
  interviewee_role TEXT NOT NULL DEFAULT '',
  scheduled_at  TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes         TEXT NOT NULL DEFAULT '',
  key_insights  TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id  UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  question      TEXT NOT NULL DEFAULT '',
  answer        TEXT NOT NULL DEFAULT '',
  order_index   INT  NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviews_idea_id ON interviews(idea_id);
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_interview_id ON interview_questions(interview_id);
