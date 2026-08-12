-- ============================================================
-- MVP Club Seed — BMC for AI Meal Planner (Shyam's idea)
--
-- Finds the active meal planner idea for t_shyam@yahoo.com
-- and inserts all 9 BMC blocks.
--
-- Run:
--   PGPASSWORD=mvpclub_secret psql -h localhost -p 5433 \
--     -U mvpclub -d mvpclub -f "backend/src/db/seed-meal-planner-bmc.sql"
-- ============================================================

DO $$
DECLARE
  v_user_id UUID;
  v_idea_id UUID;
BEGIN

  -- Find user
  SELECT id INTO v_user_id FROM users WHERE email = 't_shyam@yahoo.com';
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found with email t_shyam@yahoo.com. Run seed-app.sql first.';
  END IF;

  -- Find the meal planner idea
  SELECT id INTO v_idea_id
  FROM ideas
  WHERE user_id = v_user_id
    AND name ILIKE '%meal planner%'
    AND is_active = TRUE
  LIMIT 1;

  -- Fall back to any active idea if name doesn't match exactly
  IF v_idea_id IS NULL THEN
    SELECT id INTO v_idea_id
    FROM ideas WHERE user_id = v_user_id AND is_active = TRUE
    LIMIT 1;
  END IF;

  IF v_idea_id IS NULL THEN
    RAISE EXCEPTION 'No active idea found for this user. Run seed-app.sql first.';
  END IF;

  RAISE NOTICE 'Seeding BMC for user=% idea=%', v_user_id, v_idea_id;

  -- Wipe existing BMC entries for this idea so the script is idempotent
  DELETE FROM stage_entries
  WHERE idea_id = v_idea_id
    AND stage = 'shape'
    AND field_key LIKE 'bmc_%';

  -- ── 9 BMC blocks ────────────────────────────────────────────────────────

  INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content, completed_at) VALUES

  (v_user_id, v_idea_id, 'shape', 'bmc_segments',
   E'Home cooks aged 25–45 who shop weekly but still waste food\nBusy professionals who want to cook but can\'t plan\nParents managing family meals on a budget\nPeople trying to eat healthier without extra shopping\nEco-conscious households trying to reduce food waste\nPrimary: UK/US urban renters who grocery shop 1–2x per week',
   NOW()),

  (v_user_id, v_idea_id, 'shape', 'bmc_value',
   E'Open your fridge — get a full week of meals instantly\nNo extra shopping required: recipes use what you already have\nStop throwing food away: £1,500/year saved on wasted groceries\nHealthier eating without the mental load of meal planning\nAdapts to dietary preferences, allergies, and household size\nOne snap of your fridge, zero decisions to make',
   NOW()),

  (v_user_id, v_idea_id, 'shape', 'bmc_channels',
   E'iOS and Android app (primary)\nOrganic: word of mouth from people sharing meals they made\nSEO: "what to cook with leftover chicken" type searches\nTikTok / Instagram Reels — visual food content is highly shareable\nPartnerships with grocery delivery apps (Ocado, Instacart)\nProductHunt launch for early tech adopters',
   NOW()),

  (v_user_id, v_idea_id, 'shape', 'bmc_cr',
   E'Onboarding: first snap → first meal plan in under 60 seconds\nWeekly meal plan delivered every Sunday morning\nPersonalised over time: learns your tastes and eating patterns\nPush notifications: "You have chicken that expires tomorrow — here\'s tonight\'s dinner"\nIn-app recipe ratings to improve future suggestions\nCommunity: share what you cooked from your fridge this week',
   NOW()),

  (v_user_id, v_idea_id, 'shape', 'bmc_revenue',
   E'Freemium: 3 meal plans/month free, unlimited on paid plan\nSubscription: £6.99/month or £49/year\nAffiliate commissions from grocery delivery partners (Ocado, Instacart)\nPremium: dietitian-verified plans for specific health goals (+£3/month)\nTarget: 2,000 paying subscribers = £14k MRR',
   NOW()),

  (v_user_id, v_idea_id, 'shape', 'bmc_activities',
   E'Computer vision model: identify ingredients from fridge photo\nRecipe matching engine: what can I make from these specific items?\nMeal plan generation and personalisation\nRecipe content creation and curation\nApp development and maintenance (iOS + Android)\nGrocery partner integrations',
   NOW()),

  (v_user_id, v_idea_id, 'shape', 'bmc_resources',
   E'AI / computer vision model for ingredient recognition\nRecipe database (proprietary or licensed)\nMobile app (iOS + Android)\nML pipeline for personalisation\nBrand and content library (food photography, recipe writing)\nUser data: fridge contents + eating patterns over time',
   NOW()),

  (v_user_id, v_idea_id, 'shape', 'bmc_partners',
   E'Grocery delivery platforms (Ocado, Instacart, Tesco) — affiliate + data\nRecipe content partners (BBC Good Food, NYT Cooking)\nNutritionist / dietitian advisors for health plan tier\nCloud AI providers (OpenAI Vision, Google Cloud Vision)\nApp store distribution (Apple, Google)\nFood waste charity partnerships for PR and mission alignment',
   NOW()),

  (v_user_id, v_idea_id, 'shape', 'bmc_costs',
   E'AI API costs (vision + recipe generation — variable with usage)\nApp development and ongoing engineering\nRecipe database licensing or content creation\nServer and cloud infrastructure\nMarketing and user acquisition (paid social + SEO)\nCustomer support\nApp store fees (30% on in-app subscriptions in year 1)',
   NOW());

  RAISE NOTICE '';
  RAISE NOTICE '✅ BMC seeded for AI Meal Planner (idea: %)', v_idea_id;
  RAISE NOTICE '   9 blocks written: segments · value · channels · cr · revenue';
  RAISE NOTICE '                     activities · resources · partners · costs';

END $$;
