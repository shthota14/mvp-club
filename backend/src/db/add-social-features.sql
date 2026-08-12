-- MVP Club — Social Features Migration
-- Run: PGPASSWORD=mvpclub_secret psql -h localhost -p 5433 -U mvpclub -d mvpclub -f "backend/src/db/add-social-features.sql"

-- 1. community_ask on ideas (what the founder is seeking from the community)
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS community_ask TEXT;

-- 2. bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  idea_id    UUID REFERENCES ideas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, idea_id)
);

-- 3. idea follows
CREATE TABLE IF NOT EXISTS idea_follows (
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  idea_id    UUID REFERENCES ideas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, idea_id)
);

-- 4. direct message conversations
CREATE TABLE IF NOT EXISTS conversations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  user2_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  idea_id    UUID REFERENCES ideas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS conversations_pair_idea
  ON conversations (LEAST(user1_id::text, user2_id::text), GREATEST(user1_id::text, user2_id::text), COALESCE(idea_id::text, 'null'));

-- 5. messages
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Seed community_ask on existing ideas (so UI looks full immediately)
UPDATE ideas
SET community_ask = 'Seeking early feedback — does this solve a real pain point for you?'
WHERE community_ask IS NULL;

SELECT 'Migration complete' AS status;
