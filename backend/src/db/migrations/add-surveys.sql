CREATE TABLE IF NOT EXISTS surveys (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id     UUID REFERENCES ideas(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  questions   JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS survey_responses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id         UUID REFERENCES surveys(id) ON DELETE CASCADE,
  respondent_name   TEXT,
  respondent_email  TEXT,
  answers           JSONB NOT NULL DEFAULT '[]',
  alignment         TEXT CHECK (alignment IN ('confirmed','partial','not_confirmed')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surveys_token ON surveys(token);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id);
