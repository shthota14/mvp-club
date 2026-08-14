-- ============================================================
-- MVP Club — Extra Community Activity seed
-- ============================================================
-- Adds ~13 realistic update/win/question posts to EXISTING seeded
-- ideas (by name) so the "All Ideas" activity feed and Community
-- Proof tab feel populated rather than sparse. Purely additive —
-- does not touch users, ideas, or any other table.
--
-- Safe to run once. NOT idempotent — running it twice will insert
-- duplicate posts, since posts have no natural unique key. If an
-- idea name below doesn't exist in your DB, that INSERT is a
-- harmless no-op (the SELECT just returns zero rows).
--
-- Run: docker compose exec -T db psql -U mvpclub -d mvpclub < backend/src/db/seed-community-activity.sql

INSERT INTO community_posts (user_id, idea_id, stage, content, post_type, created_at)
SELECT i.user_id, i.id, i.stage,
  'Just wrapped up 5 customer interviews this week — turns out podcast producers care way more about voice consistency than I expected. Tweaking the script generator now.',
  'update', NOW() - INTERVAL '2 days'
FROM ideas i WHERE i.name = 'BotBanter' LIMIT 1;

INSERT INTO community_posts (user_id, idea_id, stage, content, post_type, created_at)
SELECT i.user_id, i.id, i.stage,
  'Fridge-photo recognition is finally hitting 85% accuracy on common ingredients. Next up: handling blurry phone photos better.',
  'update', NOW() - INTERVAL '5 hours'
FROM ideas i WHERE i.name = 'BotBanter' LIMIT 1;

INSERT INTO community_posts (user_id, idea_id, stage, content, post_type, created_at)
SELECT i.user_id, i.id, i.stage,
  'Hit 50 paying customers on CampaignFlow this month! The abandoned-cart flow alone is driving 30% of new signups.',
  'win', NOW() - INTERVAL '1 day'
FROM ideas i WHERE i.name = 'CampaignFlow' LIMIT 1;

INSERT INTO community_posts (user_id, idea_id, stage, content, post_type, created_at)
SELECT i.user_id, i.id, i.stage,
  'Rebuilt onboarding so the first automated email fires within 60 seconds of signup instead of a day later. Activation is already up.',
  'update', NOW() - INTERVAL '4 days'
FROM ideas i WHERE i.name = 'CampaignFlow' LIMIT 1;

INSERT INTO community_posts (user_id, idea_id, stage, content, post_type, created_at)
SELECT i.user_id, i.id, i.stage,
  'Anyone else building for Slack? Trying to figure out the right balance between automated kudos and feeling too "bot-like." Would love feedback.',
  'question', NOW() - INTERVAL '3 days'
FROM ideas i WHERE i.name = 'KudoBot' LIMIT 1;

INSERT INTO community_posts (user_id, idea_id, stage, content, post_type, created_at)
SELECT i.user_id, i.id, i.stage,
  'Redesigned our trial-expiry email sequence based on last week''s churn data. Open rates already up 12%.',
  'update', NOW() - INTERVAL '6 days'
FROM ideas i WHERE i.name = 'LifecycleHQ' LIMIT 1;

INSERT INTO community_posts (user_id, idea_id, stage, content, post_type, created_at)
SELECT i.user_id, i.id, i.stage,
  'ContactWP just crossed 1,000 WordPress installs! Small milestone but feels huge after 6 months of grinding.',
  'win', NOW() - INTERVAL '8 hours'
FROM ideas i WHERE i.name = 'ContactWP' LIMIT 1;

INSERT INTO community_posts (user_id, idea_id, stage, content, post_type, created_at)
SELECT i.user_id, i.id, i.stage,
  'Self-hosted analytics folks — how are you handling GDPR data requests at scale? Building this out now and could use pointers.',
  'question', NOW() - INTERVAL '2 days'
FROM ideas i WHERE i.name = 'OpenView' LIMIT 1;

INSERT INTO community_posts (user_id, idea_id, stage, content, post_type, created_at)
SELECT i.user_id, i.id, i.stage,
  'First enterprise client signed for QuoteKit this week! Onboarding call is Thursday — nervous and excited.',
  'win', NOW() - INTERVAL '12 hours'
FROM ideas i WHERE i.name = 'QuoteKit' LIMIT 1;

INSERT INTO community_posts (user_id, idea_id, stage, content, post_type, created_at)
SELECT i.user_id, i.id, i.stage,
  'Cut our signature completion time from 4 minutes to 90 seconds by removing the account-creation step. Huge unlock.',
  'update', NOW() - INTERVAL '3 days'
FROM ideas i WHERE i.name = 'SignEasy' LIMIT 1;

INSERT INTO community_posts (user_id, idea_id, stage, content, post_type, created_at)
SELECT i.user_id, i.id, i.stage,
  'Testing three different fridge-scan onboarding flows this week — camera-first, manual-entry-first, and a hybrid. Curious which converts best for anyone who''s run similar experiments.',
  'question', NOW() - INTERVAL '9 hours'
FROM ideas i WHERE i.name LIKE 'AI meal planner%' LIMIT 1;

INSERT INTO community_posts (user_id, idea_id, stage, content, post_type, created_at)
SELECT i.user_id, i.id, i.stage,
  'CampaignFlow: churned two customers this week for the first time. Doing exit interviews now instead of just moving on — want to actually know why.',
  'update', NOW() - INTERVAL '7 days'
FROM ideas i WHERE i.name = 'CampaignFlow' LIMIT 1;

INSERT INTO community_posts (user_id, idea_id, stage, content, post_type, created_at)
SELECT i.user_id, i.id, i.stage,
  'KudoBot hit its first 100 kudos sent in a single workspace today. Founders — what''s the smallest "it''s working" moment that made you believe in the idea?',
  'question', NOW() - INTERVAL '1 day'
FROM ideas i WHERE i.name = 'KudoBot' LIMIT 1;
