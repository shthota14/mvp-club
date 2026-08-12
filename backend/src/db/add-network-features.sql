-- Extended Network feature migration

-- Curated MVP Club advisors (seeded, not regular users)
CREATE TABLE IF NOT EXISTS advisors (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  role             TEXT NOT NULL,
  bio              TEXT,
  avatar_initials  TEXT NOT NULL,
  stages           TEXT[] DEFAULT '{}',
  expertise        TEXT[] DEFAULT '{}',
  linkedin_url     TEXT,
  email            TEXT,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Founder's personal extended contacts (LinkedIn or email)
CREATE TABLE IF NOT EXISTS network_contacts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  contact_type   TEXT NOT NULL CHECK (contact_type IN ('linkedin', 'email')),
  contact_value  TEXT NOT NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Help requests sent to advisors or personal contacts
CREATE TABLE IF NOT EXISTS help_requests (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID REFERENCES users(id) ON DELETE CASCADE,
  advisor_id         UUID REFERENCES advisors(id),
  network_contact_id UUID REFERENCES network_contacts(id),
  stage              TEXT NOT NULL,
  problem            TEXT NOT NULL,
  specific_ask       TEXT NOT NULL,
  channel            TEXT NOT NULL CHECK (channel IN ('linkedin', 'email')),
  status             TEXT NOT NULL DEFAULT 'sent'
                     CHECK (status IN ('sent', 'replied', 'done')),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_contacts_user ON network_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_user ON help_requests(user_id);

-- Seed curated advisors
INSERT INTO advisors (name, role, bio, avatar_initials, stages, expertise, linkedin_url) VALUES
(
  'Priya Rajagopal',
  'Founder → Series A · B2B SaaS',
  'Built and scaled a B2B SaaS from 0 to $2M ARR. Expert at early validation and customer discovery.',
  'PR',
  ARRAY['validate','hone'],
  ARRAY['User interviews','Customer discovery','Cold outreach'],
  'https://linkedin.com'
),
(
  'Marcus Kim',
  'Angel investor · 40+ startups',
  'Angel investor with a portfolio of 40+ early-stage startups. Helps with idea validation and fundraising readiness.',
  'MK',
  ARRAY['hone','idea'],
  ARRAY['Fundraising','Pitch deck','Idea validation'],
  'https://linkedin.com'
),
(
  'Aisha Suleiman',
  'Product lead · Consumer apps',
  'Led product at two consumer startups. Specialises in MVP scoping and feature prioritisation.',
  'AS',
  ARRAY['shape','validate'],
  ARRAY['MVP scoping','Product strategy','User research'],
  NULL
),
(
  'David Chen',
  'Ex-YC founder · 2× exits',
  'Two successful exits. Mentors founders on go-to-market and finding first paying customers.',
  'DC',
  ARRAY['done','shape'],
  ARRAY['Go-to-market','First customers','Growth'],
  'https://linkedin.com'
)
ON CONFLICT DO NOTHING;
