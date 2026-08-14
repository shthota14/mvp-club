-- MVP Club — Community Polls Migration
-- Run: docker compose exec -T db psql -U mvpclub -d mvpclub < backend/src/db/migrations/add-community-polls.sql
--
-- Any community member can create a poll (question + 2-6 options). Polls
-- auto-close 7 days after creation (closes_at, computed at creation time —
-- no background job needed, "closed" is just closes_at < NOW() at query
-- time). One vote per user per poll, changeable until the poll closes.

CREATE TABLE IF NOT EXISTS community_polls (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  options     TEXT[] NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closes_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE TABLE IF NOT EXISTS community_poll_votes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id       UUID REFERENCES community_polls(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  option_index  INT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_polls_created ON community_polls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON community_poll_votes(poll_id);
