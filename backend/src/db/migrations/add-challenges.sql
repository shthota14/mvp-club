-- Proof of Demand: 5-Conversation Challenge
-- Run once against the production database

CREATE TABLE IF NOT EXISTS challenges (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id            UUID REFERENCES ideas(id) ON DELETE CASCADE,
  user_id            UUID REFERENCES users(id) ON DELETE CASCADE,
  idea_name          TEXT NOT NULL,
  target_profile     TEXT NOT NULL,
  target_domain      TEXT,
  status             TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'completed', 'abandoned')),
  conversations_goal INT  NOT NULL DEFAULT 5,
  deadline           TIMESTAMPTZ NOT NULL,
  verdict_signal     TEXT CHECK (verdict_signal IN ('validated', 'pivoted', 'uncertain')),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenge_conversations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id      UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interviewee_role  TEXT NOT NULL,
  quote_1           TEXT,
  quote_2           TEXT,
  quote_3           TEXT,
  signal            TEXT NOT NULL CHECK (signal IN ('validates', 'challenges', 'neutral')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenge_offers (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id   UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offer_type     TEXT NOT NULL CHECK (offer_type IN ('vouch', 'fit')),
  note           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (challenge_id, user_id, offer_type)
);

CREATE INDEX IF NOT EXISTS idx_challenges_status   ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_user     ON challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_idea     ON challenges(idea_id);
CREATE INDEX IF NOT EXISTS idx_challenge_convos    ON challenge_conversations(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_offers    ON challenge_offers(challenge_id);
