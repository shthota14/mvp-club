-- ============================================================
-- MVP Club Seed — Famous Startup Ideas (v2 — full idea data)
-- 4 users × 4 iconic ideas: Uber · Airbnb · Facebook · Twitter
--
-- Each user's idea is fully seeded for their current stage:
--   Travis  (Uber)      → validate · hone entries + 8 outreach contacts
--   Brian   (Airbnb)    → hone     · full hone entries
--   Mark    (Facebook)  → shape    · hone + shape entries + past contacts
--   Jack    (Twitter)   → idea     · idea description + early thoughts
--
-- All accounts use password: password123
--
-- Run:
--   PGPASSWORD=mvpclub_secret psql -h localhost -p 5433 \
--     -U mvpclub -d mvpclub -f "backend/src/db/seed-famous-ideas.sql"
-- ============================================================

DO $$
DECLARE
  -- password hash for "password123" (bcrypt, cost 12)
  v_pw TEXT := '$2a$12$undmfpnOGUw4AGMvv3NWguUGIfWaODarqgnG/oMU5nK4bGyzcw.di';

  v_travis   UUID;
  v_brian    UUID;
  v_mark     UUID;
  v_jack     UUID;

  v_idea_uber     UUID;
  v_idea_airbnb   UUID;
  v_idea_facebook UUID;
  v_idea_twitter  UUID;

BEGIN

  -- ── 1. Upsert users ──────────────────────────────────────────────────────

  INSERT INTO users (email, name, password_hash, current_stage, community_opt,
                     avatar_initials, help_types)
  VALUES ('travis@uber-idea.com', 'Travis Kalanick', v_pw,
          'validate', TRUE, 'TK', ARRAY['validation','finding_users'])
  ON CONFLICT (email) DO UPDATE
    SET current_stage = 'validate', updated_at = NOW();
  SELECT id INTO v_travis FROM users WHERE email = 'travis@uber-idea.com';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt,
                     avatar_initials, help_types)
  VALUES ('brian@airbnb-idea.com', 'Brian Chesky', v_pw,
          'hone', TRUE, 'BC', ARRAY['finding_users','pricing'])
  ON CONFLICT (email) DO UPDATE
    SET current_stage = 'hone', updated_at = NOW();
  SELECT id INTO v_brian FROM users WHERE email = 'brian@airbnb-idea.com';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt,
                     avatar_initials, help_types)
  VALUES ('mark@facebook-idea.com', 'Mark Zuckerberg', v_pw,
          'shape', TRUE, 'MZ', ARRAY['technical','mvp_scope'])
  ON CONFLICT (email) DO UPDATE
    SET current_stage = 'shape', updated_at = NOW();
  SELECT id INTO v_mark FROM users WHERE email = 'mark@facebook-idea.com';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt,
                     avatar_initials, help_types)
  VALUES ('jack@twitter-idea.com', 'Jack Dorsey', v_pw,
          'idea', TRUE, 'JD', ARRAY['finding_users'])
  ON CONFLICT (email) DO UPDATE
    SET current_stage = 'idea', updated_at = NOW();
  SELECT id INTO v_jack FROM users WHERE email = 'jack@twitter-idea.com';

  RAISE NOTICE 'Users: travis=% brian=% mark=% jack=%', v_travis, v_brian, v_mark, v_jack;

  -- ── 2. Wipe & recreate ideas ─────────────────────────────────────────────

  DELETE FROM validation_contacts WHERE user_id IN (v_travis, v_brian, v_mark, v_jack);
  DELETE FROM stage_entries        WHERE user_id IN (v_travis, v_brian, v_mark, v_jack);
  DELETE FROM community_posts      WHERE content LIKE '%[FAMOUS]%';
  DELETE FROM ideas                WHERE user_id IN (v_travis, v_brian, v_mark, v_jack);

  -- Uber
  INSERT INTO ideas (user_id, name, description, stage, is_active)
  VALUES (v_travis,
    'On-demand private car rides via a mobile app',
    'Tap your phone, a licensed driver arrives in minutes. No cash, no hailing — transparent pricing, rated drivers, every time.',
    'validate', TRUE)
  RETURNING id INTO v_idea_uber;

  -- Airbnb
  INSERT INTO ideas (user_id, name, description, stage, is_active)
  VALUES (v_brian,
    'Rent out your spare room or apartment to travellers',
    'Let homeowners rent their space to short-term guests — cheaper than hotels, more personal than hostels, income for the host.',
    'hone', TRUE)
  RETURNING id INTO v_idea_airbnb;

  -- Facebook
  INSERT INTO ideas (user_id, name, description, stage, is_active)
  VALUES (v_mark,
    'Online social network for university students',
    'A private, verified network for students to connect with classmates, share what they''re up to, and see what friends are working on.',
    'shape', TRUE)
  RETURNING id INTO v_idea_facebook;

  -- Twitter
  INSERT INTO ideas (user_id, name, description, stage, is_active)
  VALUES (v_jack,
    'Public micro-blogging: share what you''re doing right now in 140 characters',
    'A simple status update tool — short, public, real-time. Like a text message sent to the whole world at once.',
    'idea', TRUE)
  RETURNING id INTO v_idea_twitter;

  RAISE NOTICE 'Ideas: uber=% airbnb=% facebook=% twitter=%',
    v_idea_uber, v_idea_airbnb, v_idea_facebook, v_idea_twitter;

  -- ── 3. Stage entries ─────────────────────────────────────────────────────
  --
  --  hone  field_keys: what · who · problem · outcome
  --  shape field_keys: mvp_features · launch_target
  --  (validate uses validation_contacts table, not stage_entries)

  INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content, completed_at) VALUES

  -- ── Uber · hone (Travis is at validate, so hone is fully complete) ──────
  (v_travis, v_idea_uber, 'hone', 'what',
   'an app that lets you tap a button on your phone and a licensed driver picks you up within minutes',
   NOW() - INTERVAL '25 days'),
  (v_travis, v_idea_uber, 'hone', 'who',
   'urban professionals aged 25–45 who rely on getting around cities — especially late at night, in bad weather, or in unfamiliar areas where taxis are unreliable',
   NOW() - INTERVAL '22 days'),
  (v_travis, v_idea_uber, 'hone', 'problem',
   'finding a reliable, comfortable ride on demand — you never know if a taxi will show up, how long it will take, or what it will cost. The uncertainty is the real problem, not just the ride itself',
   NOW() - INTERVAL '19 days'),
  (v_travis, v_idea_uber, 'hone', 'outcome',
   'a car at your door in under 5 minutes, every time, at a transparent price, with a rated driver — so you never feel stranded again',
   NOW() - INTERVAL '17 days'),

  -- ── Airbnb · hone (Brian is mid-hone) ────────────────────────────────────
  (v_brian, v_idea_airbnb, 'hone', 'what',
   'a marketplace where homeowners can rent their spare room or entire apartment to travellers for short stays, directly and without an agent',
   NOW() - INTERVAL '8 days'),
  (v_brian, v_idea_airbnb, 'hone', 'who',
   'budget-conscious travellers and curious tourists who want a more affordable, authentic alternative to hotels — especially during peak events when hotels are sold out or triple their prices',
   NOW() - INTERVAL '6 days'),
  (v_brian, v_idea_airbnb, 'hone', 'problem',
   'finding affordable accommodation that feels personal and local rather than generic — hotel rooms are expensive, impersonal, and often fully booked during events and conferences',
   NOW() - INTERVAL '4 days'),
  (v_brian, v_idea_airbnb, 'hone', 'outcome',
   'stay in a real home in the right neighbourhood for 40% less than a hotel, hosted by a local who knows the area — and earn money from your spare space when you''re not using it',
   NOW() - INTERVAL '2 days'),

  -- ── Facebook · hone (Mark has passed through hone + validate) ────────────
  (v_mark, v_idea_facebook, 'hone', 'what',
   'a private, real-name social network where university students can find and connect with people they know on campus — classmates, roommates, friends from other colleges',
   NOW() - INTERVAL '45 days'),
  (v_mark, v_idea_facebook, 'hone', 'who',
   'university students who want to stay connected with the people they meet at uni without exchanging phone numbers — and who want a more trusted, campus-verified alternative to MySpace',
   NOW() - INTERVAL '42 days'),
  (v_mark, v_idea_facebook, 'hone', 'problem',
   'staying connected with people you meet at uni — you can''t always get their number, and public social networks like MySpace feel too anonymous and unverified to use for real social connections',
   NOW() - INTERVAL '40 days'),
  (v_mark, v_idea_facebook, 'hone', 'outcome',
   'a trusted, university-verified space where you can find anyone from your campus, see what they''re up to, and stay connected without exchanging numbers',
   NOW() - INTERVAL '38 days'),

  -- ── Facebook · shape (Mark is actively shaping the MVP) ──────────────────
  (v_mark, v_idea_facebook, 'shape', 'mvp_features',
   E'3 features only for v1:\n1. Real-name profile with photo, university, and year\n2. Friend connections — both sides must approve\n3. News feed showing updates from your confirmed friends\n\nCut from v1: groups, events, direct messaging, pages, photo albums, wall posts from others.',
   NOW() - INTERVAL '10 days'),
  (v_mark, v_idea_facebook, 'shape', 'launch_target',
   'Harvard students only — 19,000 students, one campus, close enough to get feedback face-to-face. Lock it down, fix the bugs, then expand to Yale, Columbia, and Stanford once it''s stable. Exclusivity creates demand.',
   NOW() - INTERVAL '8 days'),

  -- ── Twitter · idea (Jack is still forming the concept) ───────────────────
  -- No hone entries yet — idea stage is just the raw description on the idea card.
  -- The stage_entries for 'idea' stage aren't used by WorkPage, so nothing to add here.
  -- Jack's idea lives in the ideas table description field above.

  -- Suppress the implicit last value issue with a dummy that won't conflict
  (v_jack, v_idea_twitter, 'hone', 'what',
   '', -- not yet written — Jack is still at idea stage
   NULL);

  -- Remove the blank Twitter hone entry — Jack hasn't reached hone yet
  DELETE FROM stage_entries
  WHERE idea_id = v_idea_twitter AND field_key = 'what' AND content = '';

  -- ── 4. BMC entries (stage = 'shape', field_key = 'bmc_<block>') ──────────
  --
  --  Blocks: partners · activities · resources · value · cr · channels
  --          segments · costs · revenue
  --
  --  All 4 ideas get a fully filled BMC. Travis + Mark are further along so
  --  theirs are more detailed; Brian and Jack are earlier-stage but have
  --  thought through the model.

  INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content, completed_at) VALUES

  -- ════════════════════════════════════════════════════════════════════════
  -- UBER (Travis · validate stage)
  -- ════════════════════════════════════════════════════════════════════════
  (v_travis, v_idea_uber, 'shape', 'bmc_segments',
   E'Urban professionals aged 25–45 who commute daily\nLate-night city workers who can\'t rely on taxis\nBusiness travellers expensing rides\nPeople who don\'t own a car but live in cities\nCompanies wanting managed employee transport',
   NOW() - INTERVAL '12 days'),

  (v_travis, v_idea_uber, 'shape', 'bmc_value',
   E'A car at your door in under 5 minutes, every time\nComplete price transparency before you confirm\nRated, licensed drivers — not anonymous cabs\nReal-time GPS tracking so you\'re never in the dark\nCashless — card charged automatically on arrival\nNever feel stranded again',
   NOW() - INTERVAL '12 days'),

  (v_travis, v_idea_uber, 'shape', 'bmc_channels',
   E'iOS and Android app (primary)\nWord of mouth — first riders become evangelists\nCorporate accounts via direct B2B sales\nPromo codes for first rides\nAirport and hotel partnerships',
   NOW() - INTERVAL '12 days'),

  (v_travis, v_idea_uber, 'shape', 'bmc_cr',
   E'Self-serve app experience — no human needed\nIn-app rating system builds trust on both sides\nDriver + rider feedback loop\nEmail receipts and trip history\n24/7 support for disputes\nLoyalty through consistency (same great experience every time)',
   NOW() - INTERVAL '12 days'),

  (v_travis, v_idea_uber, 'shape', 'bmc_revenue',
   E'Take rate: ~20% commission on every ride\nRider pays per trip (dynamic pricing / surge)\nCorporate accounts: monthly invoicing\nCancellation fees\nSurge pricing during peak demand',
   NOW() - INTERVAL '12 days'),

  (v_travis, v_idea_uber, 'shape', 'bmc_activities',
   E'Driver acquisition and vetting\nApp development and reliability\nMarket-by-market city launches\nDynamic pricing algorithm\nRegulatory navigation and licensing\nPayment processing',
   NOW() - INTERVAL '12 days'),

  (v_travis, v_idea_uber, 'shape', 'bmc_resources',
   E'Mobile app (iOS + Android)\nDriver network (supply side)\nGPS and mapping infrastructure\nPayment processing system\nBackground check partner\nSupport team',
   NOW() - INTERVAL '12 days'),

  (v_travis, v_idea_uber, 'shape', 'bmc_partners',
   E'Licensed private hire vehicle operators\nBackground check providers (Checkr etc.)\nPayment processors (Stripe / Braintree)\nMapping APIs (Google Maps)\nInsurance providers for driver coverage\nCorporate travel management companies',
   NOW() - INTERVAL '12 days'),

  (v_travis, v_idea_uber, 'shape', 'bmc_costs',
   E'Driver incentives and bonuses (biggest cost)\nApp development and infrastructure\nCity-by-city launch operations\nMarketing and rider acquisition\nPayment processing fees (~2.9%)\nCustomer support\nRegulatory and legal',
   NOW() - INTERVAL '12 days'),

  -- ════════════════════════════════════════════════════════════════════════
  -- AIRBNB (Brian · hone stage — BMC drafted but not final)
  -- ════════════════════════════════════════════════════════════════════════
  (v_brian, v_idea_airbnb, 'shape', 'bmc_segments',
   E'Guests: budget travellers wanting affordable, local stays\nGuests: travellers during peak events (conferences, festivals) when hotels are full\nHosts: homeowners with spare rooms or empty apartments\nHosts: people wanting passive income from their property',
   NOW() - INTERVAL '3 days'),

  (v_brian, v_idea_airbnb, 'shape', 'bmc_value',
   E'For guests: stay in a real home for 40% less than a hotel\nFor guests: authentic, local experience — not a generic room\nFor hosts: earn money from space you\'re already not using\nFor hosts: simple listing and calendar management\nTrust layer: reviews on both sides, verified profiles',
   NOW() - INTERVAL '3 days'),

  (v_brian, v_idea_airbnb, 'shape', 'bmc_channels',
   E'Web platform (search, book, list)\nWord of mouth from early hosts and guests\nCraigslist cross-posting (growth hack for supply)\nSEO for "cheap accommodation [city]" searches\nTravel blogs and press coverage',
   NOW() - INTERVAL '3 days'),

  (v_brian, v_idea_airbnb, 'shape', 'bmc_cr',
   E'Two-sided review system — guests review hosts and vice versa\nMessaging between host and guest before booking\nHost dashboard for calendar and pricing\nGuest trip history and wishlist\n24/7 support for disputes and emergencies\nHost guarantee program to build supply-side trust',
   NOW() - INTERVAL '3 days'),

  (v_brian, v_idea_airbnb, 'shape', 'bmc_revenue',
   E'Guest service fee: ~12% on top of host price\nHost service fee: ~3% of booking value\nNo listing fee — hosts list for free\nRevenue only when a booking is completed',
   NOW() - INTERVAL '3 days'),

  (v_brian, v_idea_airbnb, 'shape', 'bmc_activities',
   E'Platform development (search, booking, payments)\nHost and guest trust and safety\nSupply growth: onboarding new hosts city by city\nCustomer support and dispute resolution\nPhotography service for top listings (quality lever)',
   NOW() - INTERVAL '3 days'),

  (v_brian, v_idea_airbnb, 'shape', 'bmc_resources',
   E'Web and mobile platform\nHost community (the supply — hardest to build)\nReview and trust system\nPayment processing and escrow\nContent: listing photos, city guides\nSupport team',
   NOW() - INTERVAL '3 days'),

  (v_brian, v_idea_airbnb, 'shape', 'bmc_partners',
   E'Payment processors (Stripe for escrow)\nProfessional photographers (listing quality)\nInsurance providers (host guarantee)\nLegal and regulatory advisors per market\nTravel aggregators and metasearch sites',
   NOW() - INTERVAL '3 days'),

  (v_brian, v_idea_airbnb, 'shape', 'bmc_costs',
   E'Platform development and hosting\nPayment processing fees\nCustomer support (scales with bookings)\nHost photography programme\nMarketing and guest acquisition\nTrust and safety operations\nCity-by-city regulatory compliance',
   NOW() - INTERVAL '3 days'),

  -- ════════════════════════════════════════════════════════════════════════
  -- FACEBOOK (Mark · shape stage — BMC fully thought through)
  -- ════════════════════════════════════════════════════════════════════════
  (v_mark, v_idea_facebook, 'shape', 'bmc_segments',
   E'Primary: university students (18–24) at top US universities\nSecondary: recent graduates wanting to stay connected\nAdvertisers targeting 18–24 demographics (later monetisation)\nFirst target: Harvard (19,000 students)',
   NOW() - INTERVAL '7 days'),

  (v_mark, v_idea_facebook, 'shape', 'bmc_value',
   E'Find and connect with anyone from your university by real name\nSee what your friends are actually doing\nVerified by .edu email — trusted and campus-specific\nNot open to strangers — feels safe and curated\nReplaces the broken university directory',
   NOW() - INTERVAL '7 days'),

  (v_mark, v_idea_facebook, 'shape', 'bmc_channels',
   E'Campus-by-campus rollout — exclusivity drives demand\nWord of mouth (primary — fastest growth lever)\n.edu email invitations\nCampus newspaper coverage\nFlyers and physical presence on campus',
   NOW() - INTERVAL '7 days'),

  (v_mark, v_idea_facebook, 'shape', 'bmc_cr',
   E'News feed — daily habit creation\nFriend requests and notifications pull users back\nProfile completeness encourages investment in the platform\nExclusivity per campus makes it feel like YOUR network\nNo ads in v1 — clean experience builds trust and habit first',
   NOW() - INTERVAL '7 days'),

  (v_mark, v_idea_facebook, 'shape', 'bmc_revenue',
   E'v1: no revenue — growth first\nv2: targeted advertising to 18–24 demographic\nv3: brand pages and sponsored posts\nLong-term: data-driven ad targeting at scale\nGoal: reach critical mass before monetising',
   NOW() - INTERVAL '7 days'),

  (v_mark, v_idea_facebook, 'shape', 'bmc_activities',
   E'Platform development (profiles, feed, connections)\nCampus-by-campus rollout operations\nContent moderation and trust & safety\nPerformance and uptime (viral products need to stay up)\nNew feature development based on usage patterns',
   NOW() - INTERVAL '7 days'),

  (v_mark, v_idea_facebook, 'shape', 'bmc_resources',
   E'Engineering talent (small team, high output)\nServer infrastructure (Eduardo\'s $19k covers early hosting)\n.edu email verification system\nMark\'s coding ability — built v1 alone in 2 weeks\nHarvard student network as initial supply of users',
   NOW() - INTERVAL '7 days'),

  (v_mark, v_idea_facebook, 'shape', 'bmc_partners',
   E'University IT departments (for .edu verification)\nServer hosting providers (initially rented servers)\nCo-founders: Dustin (engineering), Chris (outreach), Eduardo (funding)\nNo external partners needed for v1 — keep it simple',
   NOW() - INTERVAL '7 days'),

  (v_mark, v_idea_facebook, 'shape', 'bmc_costs',
   E'Server costs (funded by Eduardo — $19k)\nDomain and infrastructure\nNo salaries in v1 — all co-founders working for equity\nMarketing cost: $0 — word of mouth only\nMain cost is engineering time',
   NOW() - INTERVAL '7 days'),

  -- ════════════════════════════════════════════════════════════════════════
  -- TWITTER (Jack · idea stage — early BMC thinking)
  -- ════════════════════════════════════════════════════════════════════════
  (v_jack, v_idea_twitter, 'shape', 'bmc_segments',
   E'Early adopters: tech community and journalists\nPeople who want to broadcast their status publicly\nAnyone who wants to follow interesting people in real-time\nBusinesses wanting a real-time customer communication channel\nNot sure yet — this is a question worth exploring',
   NOW() - INTERVAL '1 day'),

  (v_jack, v_idea_twitter, 'shape', 'bmc_value',
   E'Share what you\'re doing right now in 140 characters\nFollow anyone — celebrities, friends, experts, brands\nReal-time public conversation around any topic\nNo long-form content — radical simplicity\nThe pulse of what\'s happening right now, anywhere in the world',
   NOW() - INTERVAL '1 day'),

  (v_jack, v_idea_twitter, 'shape', 'bmc_channels',
   E'Web app (primary)\nSMS integration — tweet via text message\nAPI — let developers build on top of it\nViral: public tweets are shareable and searchable\nPress and blogger coverage (tech community)',
   NOW() - INTERVAL '1 day'),

  (v_jack, v_idea_twitter, 'shape', 'bmc_cr',
   E'Following/follower model — asymmetric, like a broadcast channel\nReplies create conversation without requiring friendship\nRetweet mechanic spreads content virally\nNotifications bring users back\nPublic by default — builds ambient awareness',
   NOW() - INTERVAL '1 day'),

  (v_jack, v_idea_twitter, 'shape', 'bmc_revenue',
   E'v1: no revenue — user growth first\nHypothesis: promoted tweets (ads in the feed)\nPossible: premium accounts for businesses\nPossible: data licensing (firehose of real-time public content)\nHonest note: monetisation is unclear — need to validate usage first',
   NOW() - INTERVAL '1 day'),

  (v_jack, v_idea_twitter, 'shape', 'bmc_activities',
   E'Core product: real-time tweet delivery at scale\nSMS gateway integration\nAPI platform for third-party developers\nAbuse and spam moderation\nTrending topics algorithm',
   NOW() - INTERVAL '1 day'),

  (v_jack, v_idea_twitter, 'shape', 'bmc_resources',
   E'Engineering team (real-time infrastructure is hard)\nServer infrastructure capable of handling massive tweet volume\nSMS gateway partnerships\nStrong API and developer ecosystem\nBrand recognition once public figures join',
   NOW() - INTERVAL '1 day'),

  (v_jack, v_idea_twitter, 'shape', 'bmc_partners',
   E'SMS carriers and gateway providers\nODEO (parent company at the time)\nThird-party app developers building on the API\nMedia companies wanting real-time news distribution',
   NOW() - INTERVAL '1 day'),

  (v_jack, v_idea_twitter, 'shape', 'bmc_costs',
   E'Server and infrastructure (real-time at scale is expensive)\nEngineering team salaries\nSMS gateway costs\nCustomer support and abuse moderation\nAPI infrastructure and developer support',
   NOW() - INTERVAL '1 day');

  -- ── 4. Validation contacts (the outreach tracker) ─────────────────────────
  --
  --  Travis (Uber) · validate stage — active outreach in progress
  --  Mark (Facebook) · shape stage  — outreach already completed

  -- Travis: 8 contacts across all 3 sources, varied statuses
  INSERT INTO validation_contacts (user_id, idea_id, source, name, contact, status, notes) VALUES

  -- Community (people Travis found in startup communities)
  (v_travis, v_idea_uber, 'community', 'Ryan Park',
   'rpark@community.mvpclub',
   'Done',
   'Strong signal. Ryan commutes daily and misses trains regularly. Said he''d pay $20/ride for guaranteed pickup. Hates the uncertainty of taxis more than the price. Key quote: "I don''t care what it costs — I just need to know it''ll be there."'),

  (v_travis, v_idea_uber, 'community', 'Priya Nair',
   'priya.n@community.mvpclub',
   'Done',
   'Confirmed the late-night pain. Leaves the office after midnight regularly — taxis are unreliable and she doesn''t feel safe waiting. Would pay a premium for a rated driver she can track in real-time.'),

  (v_travis, v_idea_uber, 'community', 'James Liu',
   'jliu@community.mvpclub',
   'Call booked',
   'Sales exec who travels between SF offices. Interested but wants to know about surge pricing — concerned it would be unpredictable. Call booked for Thursday.'),

  -- LinkedIn (found through professional network)
  (v_travis, v_idea_uber, 'linkedin', 'Sarah Mitchell',
   'linkedin.com/in/sarah-m',
   'Done',
   'Consultant who expenses rides. She said the corporate card approval process for taxis is a nightmare — receipts often missing, amounts inconsistent. Would love an app that auto-generates expense reports. New angle worth exploring.'),

  (v_travis, v_idea_uber, 'linkedin', 'David Chen',
   'linkedin.com/in/dchen-sf',
   'Replied',
   'Replied positively. Works in SOMA, lives in the Mission. Says Muni is unreliable for his hours. Keen to chat — scheduling a call next week.'),

  (v_travis, v_idea_uber, 'linkedin', 'Monica Torres',
   'linkedin.com/in/moni-t',
   'Sent',
   'Sent connection request + message. Profile looks perfect — product manager at a tech company, posts about SF commuting pain. Waiting to hear back.'),

  -- Email (cold outreach)
  (v_travis, v_idea_uber, 'email', 'Tom Aldridge',
   'tom.aldridge@email.com',
   'Done',
   'Runs a small team of 6 in downtown SF. Pays for his team''s taxis manually — messy and time-consuming. Most valuable insight so far: the B2B angle. Companies would pay monthly for employee rides. Business account could be a wedge.'),

  (v_travis, v_idea_uber, 'email', 'Kenji Watanabe',
   'k.watanabe@email.com',
   'Not sent',
   'Found via a startup forum thread complaining about SF transit. Plan to reach out this week — his profile says he commutes from Oakland daily.');

  -- Mark: completed validation contacts (shape stage — validation is done)
  INSERT INTO validation_contacts (user_id, idea_id, source, name, contact, status, notes) VALUES

  (v_mark, v_idea_facebook, 'community', 'Dustin Moskovitz',
   'dustin@harvard.edu',
   'Done',
   'Roommate and closest friend. Very positive — confirmed that keeping in touch with people from other dorms and high school is a genuine pain. Offered to help build it. Now co-founder.'),

  (v_mark, v_idea_facebook, 'community', 'Chris Hughes',
   'chughes@harvard.edu',
   'Done',
   'In the same social circle. Confirmed the pattern: you meet someone at a party or in class, you don''t get their number, and you lose touch. Said he''d use a Harvard directory that actually works. Now co-founder.'),

  (v_mark, v_idea_facebook, 'linkedin', 'Eduardo Saverin',
   'linkedin.com/in/esaverin',
   'Done',
   'Finance student. Validated the idea from a business angle — sees the advertising potential if we can get the whole campus. Willing to invest $19k to cover server costs. Now CFO / co-founder.'),

  (v_mark, v_idea_facebook, 'email', 'Ashley Richardson',
   'ashley.r@harvard.edu',
   'Done',
   'Random student emailed after the Facemash incident. Said the core desire is real — students want to know who''s who on campus in a way that feels safe and verified. Strong signal from an unexpected source.'),

  (v_mark, v_idea_facebook, 'email', 'Tyler Winklevoss',
   'tyler.w@harvard.edu',
   'Done',
   'Approached me about a similar project called HarvardConnection. Confirmed there is real demand — multiple teams trying to solve the same problem is a signal, not a threat. Parted ways to build independently.');

  -- ── 5. Community posts ───────────────────────────────────────────────────

  INSERT INTO community_posts (user_id, idea_id, stage, content, post_type, created_at) VALUES

  -- Travis · Uber
  (v_travis, v_idea_uber, 'validate',
   '[FAMOUS] Just finished interview #7 for my ride-on-demand idea. Pattern is undeniable: people don''t hate taxis because they''re slow. They hate the uncertainty — will one show up? What will it cost? Can I track it? That''s the product. Solve certainty, not speed.',
   'win', NOW() - INTERVAL '3 days'),

  (v_travis, v_idea_uber, 'validate',
   '[FAMOUS] Unexpected B2B signal from today''s interview. A founder I spoke to pays his 6-person team''s taxi receipts manually every month — it''s a nightmare of missing receipts and reimbursement forms. A business account with auto-receipts could be a serious wedge into the market.',
   'update', NOW() - INTERVAL '6 days'),

  (v_travis, v_idea_uber, 'validate',
   '[FAMOUS] Did a manual experiment last Friday. Texted 10 people: "I can get you a car to your door in 8 min for $1.25/mile. Yes or no?" 7 said yes immediately. No app. No signup. Just a text. That''s the most validating thing I''ve done so far — before I''ve built anything.',
   'win', NOW() - INTERVAL '9 days'),

  (v_travis, v_idea_uber, 'hone',
   '[FAMOUS] Spent a week in Paris — noticed you could always get a private car from the airport. In SF you can''t. Why is this not a thing everywhere? Started researching the licensing rules for private hire vehicles. The regulatory angle is going to be the hardest part of this.',
   'update', NOW() - INTERVAL '20 days'),

  -- Brian · Airbnb
  (v_brian, v_idea_airbnb, 'hone',
   '[FAMOUS] Honing the idea this week. Started with "platform for renting rooms" — way too broad. Narrowed it to: homeowners renting their spare space to short-term travellers, specifically during peak events when hotels are sold out or unaffordable. That''s the moment the pain is sharpest.',
   'update', NOW() - INTERVAL '4 days'),

  (v_brian, v_idea_airbnb, 'hone',
   '[FAMOUS] The original proof point: we rented out 3 air mattresses in our apartment during a design conference in SF. Hotels were fully booked. We made $1,000 in a weekend hosting complete strangers. If strangers would pay us, strangers would pay anyone with a spare room.',
   'win', NOW() - INTERVAL '10 days'),

  (v_brian, v_idea_airbnb, 'idea',
   '[FAMOUS] Question for anyone who''s done marketplace ideas: which side do you solve first — supply (hosts) or demand (guests)? My instinct is supply — if I can get 10 quality listings in SF, the guests will come. But I''d love to hear how others approached the chicken-and-egg problem.',
   'question', NOW() - INTERVAL '14 days'),

  -- Mark · Facebook
  (v_mark, v_idea_facebook, 'shape',
   '[FAMOUS] MVP scope locked after two weeks of painful cutting. 3 features: real-name profile, friend connections (mutual approval required), news feed. That''s it. Everything else — groups, events, messages, photo albums — is out for v1. The hardest product decisions are what NOT to build.',
   'win', NOW() - INTERVAL '1 day'),

  (v_mark, v_idea_facebook, 'shape',
   '[FAMOUS] Launch plan confirmed: Harvard only. 19,000 students, one campus, close enough to watch people use it in real time and fix things the same day. The exclusivity isn''t a limitation — it''s the feature. People want to be in a network that feels curated, not open to everyone.',
   'update', NOW() - INTERVAL '5 days'),

  (v_mark, v_idea_facebook, 'validate',
   '[FAMOUS] Validated demand the fast way: built a side project called Facemash — let Harvard students rate photos. 450 students used it in 4 hours before the university shut it down. The lesson wasn''t the product — it was the proof that students will engage with a social product about their own campus.',
   'win', NOW() - INTERVAL '22 days'),

  (v_mark, v_idea_facebook, 'hone',
   '[FAMOUS] The problem I''m solving is clearer than I thought: it''s not "social networking" in the abstract. It''s the very specific moment where you meet someone at uni, want to stay in touch, and have no good way to do it. The campus directory is broken. I''m fixing the campus directory.',
   'update', NOW() - INTERVAL '38 days'),

  -- Jack · Twitter
  (v_jack, v_idea_twitter, 'idea',
   '[FAMOUS] Raw idea, thinking out loud: what if there was a service that was purely "what are you doing right now?" — 140 characters max, public by default, real-time. Like a text message sent to everyone at once. Is this a product, a feature, or just a weird thought?',
   'question', NOW() - INTERVAL '1 day'),

  (v_jack, v_idea_twitter, 'idea',
   '[FAMOUS] The inspiration: I''ve been watching how dispatch systems work — bike messengers, taxi fleets, emergency services. They use short, real-time status updates to coordinate. That same mechanic, but for everyday life and open to everyone. "I''m at the café on 5th." "Just landed." "Working late tonight." Does anyone else find that interesting?',
   'update', NOW() - INTERVAL '3 days'),

  (v_jack, v_idea_twitter, 'idea',
   '[FAMOUS] Constraint as product design: limiting posts to 140 characters isn''t a bug — it''s what makes it usable. SMS messages are 160 characters. Leave 20 for the username. That limit forces clarity. You can''t ramble. You can only say what matters right now. Thinking this constraint might be the entire point.',
   'update', NOW() - INTERVAL '5 days');

  RAISE NOTICE '';
  RAISE NOTICE '✅ Seed complete.';
  RAISE NOTICE '';
  RAISE NOTICE 'Travis  (travis@uber-idea.com)      → validate · 4 hone entries · 8 outreach contacts · full BMC';
  RAISE NOTICE 'Brian   (brian@airbnb-idea.com)     → hone     · 4 hone entries · full BMC';
  RAISE NOTICE 'Mark    (mark@facebook-idea.com)    → shape    · 4 hone + 2 shape entries · 5 contacts · full BMC';
  RAISE NOTICE 'Jack    (jack@twitter-idea.com)     → idea     · raw idea + 3 community posts · early BMC draft';
  RAISE NOTICE '';
  RAISE NOTICE 'All passwords: password123';

END $$;
