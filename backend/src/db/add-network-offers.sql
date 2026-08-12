-- Network Offers: community members offer to introduce their contacts to idea owners

CREATE TABLE IF NOT EXISTS network_offers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id             UUID REFERENCES ideas(id) ON DELETE CASCADE,
  offeror_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  contact_name        TEXT NOT NULL,
  contact_description TEXT NOT NULL,   -- how this contact can help the idea
  contact_type        TEXT NOT NULL CHECK (contact_type IN ('linkedin', 'email')),
  contact_value       TEXT NOT NULL,   -- LinkedIn URL or email address
  relationship        TEXT,            -- how the offeror knows this contact
  status              TEXT NOT NULL DEFAULT 'offered'
                      CHECK (status IN ('offered', 'connected', 'declined')),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_offers_idea ON network_offers(idea_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_network_offers_offeror ON network_offers(offeror_id);
