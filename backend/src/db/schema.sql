-- MVP Club Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  current_stage TEXT NOT NULL DEFAULT 'idea'
                CHECK (current_stage IN ('idea','hone','validate','shape','done')),
  community_opt BOOLEAN DEFAULT FALSE,
  help_types    TEXT[] DEFAULT '{}',
  avatar_initials TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Ideas (a user can have many)
CREATE TABLE IF NOT EXISTS ideas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  stage       TEXT NOT NULL DEFAULT 'idea'
              CHECK (stage IN ('idea','hone','validate','shape','done')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Stage work entries (answers per stage)
CREATE TABLE IF NOT EXISTS stage_entries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  idea_id     UUID REFERENCES ideas(id) ON DELETE CASCADE,
  stage       TEXT NOT NULL,
  field_key   TEXT NOT NULL,
  content     TEXT,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(idea_id, stage, field_key)
);

-- Validation outreach tracker
CREATE TABLE IF NOT EXISTS validation_contacts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  idea_id     UUID REFERENCES ideas(id) ON DELETE CASCADE,
  source      TEXT NOT NULL CHECK (source IN ('community','linkedin','email')),
  name        TEXT NOT NULL,
  contact     TEXT,                -- email or LinkedIn URL
  status      TEXT NOT NULL DEFAULT 'Not sent'
              CHECK (status IN ('Not sent','Sent','Replied','Call booked','Done')),
  notes       TEXT,
  icp_fit     TEXT CHECK (icp_fit IN ('yes','unsure')),
  email       TEXT,
  phone       TEXT,
  linkedin_url TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
-- NOTE: the `interviews` table (scheduling, meeting requests, availability_rules,
-- availability_settings) is NOT defined in this file — it's only added via
-- backend/src/db/add-interviews.sql / migrations / migrate-all.sql, run manually.
-- This predates this change; see backend/src/db/migrations/add-scheduling.sql.

-- Community posts
CREATE TABLE IF NOT EXISTS community_posts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  idea_id     UUID REFERENCES ideas(id),
  stage       TEXT NOT NULL,
  content     TEXT NOT NULL,
  post_type   TEXT DEFAULT 'win'
              CHECK (post_type IN ('win','question','validation_request','update')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Reactions
CREATE TABLE IF NOT EXISTS reactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('encourage','ask')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id, type)
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_stage_entries_idea ON stage_entries(idea_id, stage);
CREATE INDEX IF NOT EXISTS idx_validation_contacts_idea ON validation_contacts(idea_id, source);
CREATE INDEX IF NOT EXISTS idx_community_posts_stage ON community_posts(stage, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
