-- Public (unauthenticated) help offers submitted via the /c/:id share link
CREATE TABLE IF NOT EXISTS challenge_public_offers (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id   UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  offer_type     TEXT NOT NULL CHECK (offer_type IN ('vouch', 'fit')),
  contact_name   TEXT,
  contact_email  TEXT NOT NULL,
  note           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_offers_challenge ON challenge_public_offers(challenge_id);
