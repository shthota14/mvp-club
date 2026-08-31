-- ============================================================
-- MVP Club — Full migration (idempotent, safe to re-run)
-- Run against existing DB:
--   PGPASSWORD=mvpclub_secret psql -h localhost -p 5433 -U mvpclub -d mvpclub -f backend/src/db/migrate-all.sql
-- Or via Docker:
--   docker compose exec -T db psql -U mvpclub -d mvpclub < backend/src/db/migrate-all.sql
-- ============================================================

-- ── users: extra columns ──────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin              BOOLEAN     NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended             BOOLEAN     NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token           TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires   TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications   BOOLEAN              DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_id           TEXT        UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url          TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_name         TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_picture      TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_connected_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_linkedin_id ON users(linkedin_id);

-- ── ideas: extra columns ──────────────────────────────────────────────────────
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS idea_status       TEXT NOT NULL DEFAULT 'active'
  CHECK (idea_status IN ('active','done','archived'));
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved'
  CHECK (moderation_status IN ('pending','approved','rejected'));
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS community_ask     TEXT;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS business_domain   TEXT
  CHECK (business_domain IN (
    'fintech','healthtech','edtech','cleantech','proptech',
    'devtools','marketplace','b2b-saas','consumer','legaltech',
    'foodtech','hr-tech','logistics','media','agritech'
  ));

UPDATE ideas SET idea_status = 'done'     WHERE stage = 'done'    AND idea_status = 'active';
UPDATE ideas SET community_ask = 'Seeking early feedback — does this solve a real pain point for you?' WHERE community_ask IS NULL;

CREATE INDEX IF NOT EXISTS idx_ideas_domain ON ideas(business_domain);

-- ── community_posts: moderation ───────────────────────────────────────────────
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'visible'
  CHECK (moderation_status IN ('visible','flagged','approved','rejected','held'));
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS flag_reason TEXT;

-- ── comments: reply threading ─────────────────────────────────────────────────
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id) ON DELETE CASCADE;

-- ── bookmarks ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  idea_id    UUID REFERENCES ideas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, idea_id)
);

-- ── idea_follows ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS idea_follows (
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  idea_id    UUID REFERENCES ideas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, idea_id)
);

-- ── conversations + messages ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  user2_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  idea_id    UUID REFERENCES ideas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS conversations_pair_idea
  ON conversations (
    LEAST(user1_id::text, user2_id::text),
    GREATEST(user1_id::text, user2_id::text),
    COALESCE(idea_id::text, 'null')
  );

CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;

-- ── advisors ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS advisors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  role            TEXT NOT NULL,
  bio             TEXT,
  avatar_initials TEXT NOT NULL,
  stages          TEXT[] DEFAULT '{}',
  expertise       TEXT[] DEFAULT '{}',
  linkedin_url    TEXT,
  email           TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── network_contacts ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS network_contacts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  contact_type  TEXT NOT NULL CHECK (contact_type IN ('linkedin','email')),
  contact_value TEXT NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_network_contacts_user ON network_contacts(user_id);

-- ── help_requests ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS help_requests (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID REFERENCES users(id) ON DELETE CASCADE,
  advisor_id         UUID REFERENCES advisors(id),
  network_contact_id UUID REFERENCES network_contacts(id),
  stage              TEXT NOT NULL,
  problem            TEXT NOT NULL,
  specific_ask       TEXT NOT NULL,
  channel            TEXT NOT NULL CHECK (channel IN ('linkedin','email')),
  status             TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','replied','done')),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_help_requests_user ON help_requests(user_id);

-- ── network_offers ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS network_offers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id             UUID REFERENCES ideas(id) ON DELETE CASCADE,
  offeror_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  contact_name        TEXT NOT NULL,
  contact_description TEXT NOT NULL,
  contact_type        TEXT NOT NULL CHECK (contact_type IN ('linkedin','email')),
  contact_value       TEXT NOT NULL,
  relationship        TEXT,
  status              TEXT NOT NULL DEFAULT 'offered' CHECK (status IN ('offered','connected','declined')),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_network_offers_idea    ON network_offers(idea_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_network_offers_offeror ON network_offers(offeror_id);

-- ── diagrams ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diagrams (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id    UUID NOT NULL UNIQUE REFERENCES ideas(id) ON DELETE CASCADE,
  state      JSONB NOT NULL DEFAULT '{"items":{},"arrs":[]}',
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS diagrams_idea_id_idx ON diagrams(idea_id);

-- ── interviews ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id           UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interviewee_name  TEXT NOT NULL DEFAULT '',
  interviewee_role  TEXT NOT NULL DEFAULT '',
  interviewee_email TEXT NOT NULL DEFAULT '',
  scheduled_at      TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  notes             TEXT NOT NULL DEFAULT '',
  key_insights      TEXT NOT NULL DEFAULT '',
  meeting_provider  TEXT NOT NULL DEFAULT '' CHECK (meeting_provider IN ('','zoom','teams','manual','jitsi')),
  meeting_link      TEXT NOT NULL DEFAULT '',
  meeting_id        TEXT NOT NULL DEFAULT '',
  invite_sent_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Safe: add columns to interviews if table already existed without them
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS interviewee_email TEXT NOT NULL DEFAULT '';
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS meeting_provider  TEXT NOT NULL DEFAULT '';
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS meeting_link      TEXT NOT NULL DEFAULT '';
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS meeting_id        TEXT NOT NULL DEFAULT '';
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS invite_sent_at    TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS interview_questions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  question     TEXT NOT NULL DEFAULT '',
  answer       TEXT NOT NULL DEFAULT '',
  order_index  INT  NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviews_idea_id              ON interviews(idea_id);
CREATE INDEX IF NOT EXISTS idx_interviews_user_id              ON interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_interview_id ON interview_questions(interview_id);

-- ── validation_contacts: ICP fit + structured contact details ─────────────────
ALTER TABLE validation_contacts ADD COLUMN IF NOT EXISTS icp_fit TEXT CHECK (icp_fit IN ('yes','unsure'));
ALTER TABLE validation_contacts ADD COLUMN IF NOT EXISTS email        TEXT;
ALTER TABLE validation_contacts ADD COLUMN IF NOT EXISTS phone        TEXT;
ALTER TABLE validation_contacts ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- ── founder availability (weekly recurring rules + per-user booking defaults) ──
CREATE TABLE IF NOT EXISTS availability_rules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week  INT  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_availability_rules_user ON availability_rules(user_id);

CREATE TABLE IF NOT EXISTS availability_settings (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  timezone             TEXT NOT NULL DEFAULT 'UTC',
  min_notice_hours     INT  NOT NULL DEFAULT 12,
  booking_window_days  INT  NOT NULL DEFAULT 14,
  buffer_mins          INT  NOT NULL DEFAULT 10,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── interviews: public slot-booking fields ─────────────────────────────────────
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS booking_token         TEXT UNIQUE;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS booking_status        TEXT NOT NULL DEFAULT ''
            CHECK (booking_status IN ('', 'awaiting_response', 'booked', 'expired'));
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS duration_mins         INT NOT NULL DEFAULT 20;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS validation_contact_id UUID REFERENCES validation_contacts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_interviews_validation_contact ON interviews(validation_contact_id);
CREATE INDEX IF NOT EXISTS idx_interviews_booking_token       ON interviews(booking_token);

-- ── admin_audit_log: impersonation events, etc. ─────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action         TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── admin user ────────────────────────────────────────────────────────────────
-- Created LOCKED: the hash below is bcrypt of a 48-byte random string that was
-- discarded at generation time, so nobody — including anyone reading this repo —
-- can log in as this account. It exists only so the admin row is present.
--
-- To make it usable, run on the server:
--     ./deploy/hetzner/set-admin.sh
-- which prompts for a password, hashes it with the same bcryptjs/12 rounds the
-- app uses, and makes this the sole admin account.
--
-- ON CONFLICT deliberately does NOT touch password_hash, so re-running this
-- migration never resets a password you have already set.
-- Older installs created this admin on the .com address; rename it to the real
-- domain rather than leaving two admin rows. Guarded against the unique index.
UPDATE users SET email = 'admin@mvpclub.io'
 WHERE email = 'admin@mvpclub.com'
   AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@mvpclub.io');
DELETE FROM users
 WHERE email = 'admin@mvpclub.com'
   AND EXISTS (SELECT 1 FROM users WHERE email = 'admin@mvpclub.io');

INSERT INTO users (email, password_hash, name, current_stage, avatar_initials, is_admin, email_notifications)
VALUES (
  'admin@mvpclub.io',
  '$2b$12$o/LBOOH2DD6Ag0PHjPiEG.I.2OOUBXqwKncwFSb72QXGiXKF/Oy.q', -- locked; see set-admin.sh
  'MVP Club Admin',
  'idea',
  'AD',
  TRUE,
  FALSE
)
ON CONFLICT (email) DO UPDATE SET is_admin = TRUE;

-- ── seed advisors (skip if already present) ───────────────────────────────────
INSERT INTO advisors (name, role, bio, avatar_initials, stages, expertise, linkedin_url) VALUES
('Priya Rajagopal','Founder → Series A · B2B SaaS','Built and scaled a B2B SaaS from 0 to $2M ARR.','PR',ARRAY['validate','hone'],ARRAY['User interviews','Customer discovery','Cold outreach'],'https://linkedin.com'),
('Marcus Kim','Angel investor · 40+ startups','Angel investor with 40+ early-stage startups.','MK',ARRAY['hone','idea'],ARRAY['Fundraising','Pitch deck','Idea validation'],'https://linkedin.com'),
('Aisha Suleiman','Product lead · Consumer apps','Led product at two consumer startups.','AS',ARRAY['shape','validate'],ARRAY['MVP scoping','Product strategy','User research'],NULL),
('David Chen','Ex-YC founder · 2× exits','Two successful exits.','DC',ARRAY['done','shape'],ARRAY['Go-to-market','First customers','Growth'],'https://linkedin.com')
ON CONFLICT DO NOTHING;

-- ── seed/beta provenance flag ───────────────────────────────────────────────────
-- Hidden marker for the "SEED100" demo dataset (the 100 fictional SaaS ideas +
-- their interviews/surveys/community posts, owned by the *@seed100.dev users).
-- Deploying to production with this flag set lets the seeded content behave and
-- render exactly like real founder activity today, while leaving a clean,
-- reversible way to filter it out (or bulk-disable it) later — nothing here
-- hides or deletes it now. Never selected into any API response; it's a
-- backend-only column for future admin/ops use.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_seed_beta BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_users_seed_beta ON users(is_seed_beta) WHERE is_seed_beta = TRUE;

UPDATE users SET is_seed_beta = TRUE
WHERE email LIKE '%@seed100.dev' AND is_seed_beta = FALSE;

-- Older copies of the SEED100 dataset wrote a literal "[SEED100]" tag into the
-- end of some community post text — that was a visible artifact of the seeding
-- process, not something a real user would ever see, so strip it. The dataset
-- is still identifiable going forward via users.is_seed_beta above.
UPDATE community_posts SET content = regexp_replace(content, '\s*\[SEED100\]\s*$', '')
WHERE content ~ '\[SEED100\]';

-- ── community_posts: anonymous/public pain-point submissions ──────────────────
-- Lets a pain point be logged by a visitor with no account at all
-- (community_posts.user_id is already nullable). guest_email is optional —
-- collected only if the visitor chooses to leave one, so we can notify them
-- or offer to link the post to an account they later register with the same
-- email. Never returned by any public API response.
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS guest_email TEXT;

-- ── Analytics: hero-page visits + CTA clicks ──────────────────────────────────
-- Visitor identity is a one-way salted hash of IP (HMAC-SHA256 with the
-- server-only ANALYTICS_IP_SALT secret — never the raw IP itself), so
-- distinct-visitor counts stay accurate without storing anything that points
-- back to a real address. Raw rows are purged after 90 days by the nightly
-- analyticsRollup job; analytics_daily_agg is written first (before the
-- purge) and kept forever so long-run totals and trends survive it.
CREATE TABLE IF NOT EXISTS analytics_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type   TEXT NOT NULL CHECK (event_type IN ('page_view','link_click')),
  path         TEXT NOT NULL,
  link_label   TEXT,
  visitor_hash TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_path ON analytics_events(event_type, path);

CREATE TABLE IF NOT EXISTS analytics_daily_agg (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day              DATE NOT NULL,
  path             TEXT NOT NULL,
  event_type       TEXT NOT NULL CHECK (event_type IN ('page_view','link_click')),
  link_label       TEXT NOT NULL DEFAULT '',
  unique_visitors  INT NOT NULL DEFAULT 0,
  total_events     INT NOT NULL DEFAULT 0,
  UNIQUE (day, path, event_type, link_label)
);

SELECT 'Migration complete ✓' AS status;
