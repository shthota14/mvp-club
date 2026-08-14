-- ============================================================
-- MVP Club — Sample Community Polls seed
-- ============================================================
-- Adds 5 realistic polls (attached to existing seeded founders, by name)
-- plus a handful of sample votes so the Polls tab doesn't launch empty.
-- Purely additive — does not touch users, ideas, or any other table.
--
-- Safe to run once. NOT idempotent — running it twice inserts duplicate
-- polls. If a founder name below doesn't exist in your DB, that poll's
-- INSERT is a harmless no-op (the SELECT just returns zero rows, and the
-- vote INSERTs for that poll then also insert nothing since the poll_id
-- subquery finds no match).
--
-- Run: docker compose exec -T db psql -U mvpclub -d mvpclub < backend/src/db/seed-community-polls.sql

-- Poll 1 — product/tooling opinion, from Sven Volkov (CampaignFlow)
WITH new_poll AS (
  INSERT INTO community_polls (user_id, question, options, created_at, closes_at)
  SELECT i.user_id,
    'Which early-stage validation method has worked best for you?',
    ARRAY['Customer interviews', 'Landing page + waitlist', 'Pre-sales / paid pilots', 'Posting in communities like this one'],
    NOW() - INTERVAL '4 days', NOW() + INTERVAL '3 days'
  FROM ideas i WHERE i.name = 'CampaignFlow' LIMIT 1
  RETURNING id
)
INSERT INTO community_poll_votes (poll_id, user_id, option_index)
SELECT np.id, i.user_id, v.option_index
FROM new_poll np
CROSS JOIN (VALUES
  ('BotBanter', 0), ('KudoBot', 2), ('LifecycleHQ', 0), ('ContactWP', 1),
  ('OpenView', 0), ('QuoteKit', 2), ('SignEasy', 0)
) AS v(idea_name, option_index)
JOIN ideas i ON i.name = v.idea_name;

-- Poll 2 — pricing question, from Priya Gray (QuoteKit)
WITH new_poll AS (
  INSERT INTO community_polls (user_id, question, options, created_at, closes_at)
  SELECT i.user_id,
    'How did you price your MVP for the very first paying customers?',
    ARRAY['Flat monthly subscription', 'Usage-based', 'One-time fee', 'Free, monetizing later'],
    NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days'
  FROM ideas i WHERE i.name = 'QuoteKit' LIMIT 1
  RETURNING id
)
INSERT INTO community_poll_votes (poll_id, user_id, option_index)
SELECT np.id, i.user_id, v.option_index
FROM new_poll np
CROSS JOIN (VALUES
  ('CampaignFlow', 0), ('KudoBot', 0), ('SignEasy', 2), ('ContactWP', 0)
) AS v(idea_name, option_index)
JOIN ideas i ON i.name = v.idea_name;

-- Poll 3 — fundraising sentiment, from Alex Mwangi (OpenView)
WITH new_poll AS (
  INSERT INTO community_polls (user_id, question, options, created_at, closes_at)
  SELECT i.user_id,
    'Are you planning to raise a pre-seed/angel round in the next 6 months?',
    ARRAY['Yes, actively fundraising', 'Yes, but not yet', 'No, bootstrapping', 'Not sure yet'],
    NOW() - INTERVAL '6 days', NOW() + INTERVAL '1 day'
  FROM ideas i WHERE i.name = 'OpenView' LIMIT 1
  RETURNING id
)
INSERT INTO community_poll_votes (poll_id, user_id, option_index)
SELECT np.id, i.user_id, v.option_index
FROM new_poll np
CROSS JOIN (VALUES
  ('BotBanter', 3), ('CampaignFlow', 1), ('LifecycleHQ', 2), ('QuoteKit', 0),
  ('SignEasy', 2), ('ContactWP', 3)
) AS v(idea_name, option_index)
JOIN ideas i ON i.name = v.idea_name;

-- Poll 4 — light community-culture question, from Aisha Costa (SignEasy)
WITH new_poll AS (
  INSERT INTO community_polls (user_id, question, options, created_at, closes_at)
  SELECT i.user_id,
    'What keeps you motivated during the slow weeks?',
    ARRAY['Talking to users, even just one', 'A small metric ticking up', 'Community check-ins like this', 'Just showing up and shipping something'],
    NOW() - INTERVAL '1 day', NOW() + INTERVAL '6 days'
  FROM ideas i WHERE i.name = 'SignEasy' LIMIT 1
  RETURNING id
)
INSERT INTO community_poll_votes (poll_id, user_id, option_index)
SELECT np.id, i.user_id, v.option_index
FROM new_poll np
CROSS JOIN (VALUES
  ('KudoBot', 2), ('OpenView', 1), ('QuoteKit', 0)
) AS v(idea_name, option_index)
JOIN ideas i ON i.name = v.idea_name;

-- Poll 5 — closed/past poll (created 10 days ago, closes_at set to 3 days
-- ago so it already shows as closed), from Luisa Nakamura (ContactWP)
WITH new_poll AS (
  INSERT INTO community_polls (user_id, question, options, created_at, closes_at)
  SELECT i.user_id,
    'Which stage of MVP Club do you spend the most time in?',
    ARRAY['Idea', 'Hone', 'Validate', 'Shape', 'Ship'],
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '3 days'
  FROM ideas i WHERE i.name = 'ContactWP' LIMIT 1
  RETURNING id
)
INSERT INTO community_poll_votes (poll_id, user_id, option_index)
SELECT np.id, i.user_id, v.option_index
FROM new_poll np
CROSS JOIN (VALUES
  ('BotBanter', 2), ('CampaignFlow', 4), ('KudoBot', 4), ('LifecycleHQ', 4),
  ('OpenView', 2), ('QuoteKit', 4), ('SignEasy', 3)
) AS v(idea_name, option_index)
JOIN ideas i ON i.name = v.idea_name;
