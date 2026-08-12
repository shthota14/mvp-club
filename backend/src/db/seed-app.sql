-- ============================================================
-- MVP Club App Seed — v2 (corrected field keys + community)
--
-- Run this against your local Docker database:
--   PGPASSWORD=mvpclub_secret psql -h localhost -p 5433 -U mvpclub -d mvpclub -f "backend/src/db/seed-app.sql"
-- ============================================================

DO $$
DECLARE
  v_user_id    UUID;
  v_idea_id    UUID;
  v_user2_id   UUID;
  v_user3_id   UUID;
  v_email      TEXT := 't_shyam@yahoo.com';
BEGIN

  -- ── 1. Find your user ────────────────────────────────────
  SELECT id INTO v_user_id FROM users WHERE email = v_email;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found with email %. Register first, then run this script.', v_email;
  END IF;

  SELECT id INTO v_user2_id FROM users WHERE email = 'test@test.com';
  SELECT id INTO v_user3_id FROM users WHERE email = 'S@GMAIL.COM';

  RAISE NOTICE 'Found Shyam: %', v_user_id;

  -- ── 2. Set stage to validate ─────────────────────────────
  UPDATE users SET current_stage = 'validate', updated_at = NOW()
  WHERE id = v_user_id;

  -- ── 3. Create or get idea ────────────────────────────────
  SELECT id INTO v_idea_id
  FROM ideas WHERE user_id = v_user_id AND is_active = TRUE LIMIT 1;

  IF v_idea_id IS NULL THEN
    INSERT INTO ideas (user_id, name, description, stage, is_active)
    VALUES (
      v_user_id,
      'AI meal planner that adapts to what''s already in your fridge',
      'Snap a photo of your fridge, get a week of meals — no extra shopping needed.',
      'validate', TRUE
    ) RETURNING id INTO v_idea_id;
    RAISE NOTICE 'Created idea: %', v_idea_id;
  ELSE
    UPDATE ideas SET
      name = 'AI meal planner that adapts to what''s already in your fridge',
      description = 'Snap a photo of your fridge, get a week of meals — no extra shopping needed.',
      stage = 'validate',
      updated_at = NOW()
    WHERE id = v_idea_id;
    RAISE NOTICE 'Updated existing idea: %', v_idea_id;
  END IF;

  -- ── 4. Hone stage entries (field keys match WorkPage) ────
  -- WorkPage reads: 'what', 'who', 'problem', 'outcome'
  INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content, completed_at)
  VALUES
    (v_user_id, v_idea_id, 'hone', 'what',
     'an AI meal planner that turns your fridge contents into a week of meals',
     NOW() - INTERVAL '12 days'),
    (v_user_id, v_idea_id, 'hone', 'who',
     'home cooks who grocery shop regularly but still throw food out every week',
     NOW() - INTERVAL '10 days'),
    (v_user_id, v_idea_id, 'hone', 'problem',
     'knowing what to cook with random ingredients in their fridge — so they default to delivery instead',
     NOW() - INTERVAL '8 days'),
    (v_user_id, v_idea_id, 'hone', 'outcome',
     'stop wasting $1,500 of food a year and cook more without extra shopping',
     NOW() - INTERVAL '6 days')
  ON CONFLICT (idea_id, stage, field_key) DO UPDATE
    SET content = EXCLUDED.content, updated_at = NOW();

  -- ── 5. Community posts ───────────────────────────────────
  -- Delete existing posts to avoid duplicates on re-run
  DELETE FROM community_posts WHERE content LIKE '%[SEED]%';

  INSERT INTO community_posts (user_id, stage, content, post_type, created_at)
  VALUES
    -- Shyam's own posts
    (v_user_id, 'validate',
     '[SEED] Just finished my 2nd user interview for my fridge meal planner idea. Both people confirmed they throw out vegetables every single week. The emotional trigger is overwhelm — not laziness. Strong signal so far.',
     'win', NOW() - INTERVAL '2 days'),

    (v_user_id, 'validate',
     '[SEED] Insight from today''s interview: one person checks the fridge, doesn''t know what to cook, closes it — then checks again 30 minutes later. That loop is the real problem. The app needs to break that loop, not just suggest recipes.',
     'update', NOW() - INTERVAL '5 days'),

    -- Other users' posts
    (v_user2_id, 'idea',
     '[SEED] New here. I''m building a gym class booking tool that actually guarantees your spot off the waitlist — not just a notification, an actual hold. Anyone here been through the supply-side problem with marketplace ideas?',
     'question', NOW() - INTERVAL '1 day'),

    (v_user2_id, 'hone',
     '[SEED] Spent the morning mapping the gym booking problem. Realised the real pain isn''t waitlists — it''s the uncertainty. You don''t know if you''ll get in, so you can''t plan your week. That''s the thing worth solving.',
     'update', NOW() - INTERVAL '3 days'),

    (v_user3_id, 'validate',
     '[SEED] 5 interviews done on my compliance tool idea. Every single compliance manager said the same thing: audit prep takes 2–3 days of manual work pulling Slack logs and Jira tickets. All 5 said they''d pay to cut that to an hour. Feels like real signal.',
     'win', NOW() - INTERVAL '4 hours'),

    (v_user3_id, 'hone',
     '[SEED] Key lesson from Hone: I started with "compliance automation" which is too broad. Narrowed it to "SOC 2 evidence collection from Slack + Jira." Much easier to explain, much easier to find the right people to talk to.',
     'update', NOW() - INTERVAL '6 days'),

    (v_user2_id, 'idea',
     '[SEED] First week on MVP Club. The Hone stage made me realise I had 3 different ideas bundled into one. Pulled them apart. Now I have one clear problem worth solving. Already feels less overwhelming.',
     'win', NOW() - INTERVAL '8 days');

  RAISE NOTICE '✅ Done. Idea, stage entries, and 7 community posts seeded.';

END $$;
