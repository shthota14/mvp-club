-- ============================================================
-- MVP Club — 100 Community Pain Points seed
-- ============================================================

DO $PP$ DECLARE
  v_u1 UUID;
  v_p1 UUID;
  v_u2 UUID;
  v_p2 UUID;
  v_u3 UUID;
  v_p3 UUID;
  v_u4 UUID;
  v_p4 UUID;
  v_u5 UUID;
  v_p5 UUID;
  v_u6 UUID;
  v_p6 UUID;
  v_u7 UUID;
  v_p7 UUID;
  v_u8 UUID;
  v_p8 UUID;
  v_u9 UUID;
  v_p9 UUID;
  v_u10 UUID;
  v_p10 UUID;
  v_u11 UUID;
  v_p11 UUID;
  v_u12 UUID;
  v_p12 UUID;
  v_u13 UUID;
  v_p13 UUID;
  v_u14 UUID;
  v_p14 UUID;
  v_u15 UUID;
  v_p15 UUID;
  v_u16 UUID;
  v_p16 UUID;
  v_u17 UUID;
  v_p17 UUID;
  v_u18 UUID;
  v_p18 UUID;
  v_u19 UUID;
  v_p19 UUID;
  v_u20 UUID;
  v_p20 UUID;
  v_u21 UUID;
  v_p21 UUID;
  v_u22 UUID;
  v_p22 UUID;
  v_u23 UUID;
  v_p23 UUID;
  v_u24 UUID;
  v_p24 UUID;
  v_u25 UUID;
  v_p25 UUID;
  v_u26 UUID;
  v_p26 UUID;
  v_u27 UUID;
  v_p27 UUID;
  v_u28 UUID;
  v_p28 UUID;
  v_u29 UUID;
  v_p29 UUID;
  v_u30 UUID;
  v_p30 UUID;
  v_u31 UUID;
  v_p31 UUID;
  v_u32 UUID;
  v_p32 UUID;
  v_u33 UUID;
  v_p33 UUID;
  v_u34 UUID;
  v_p34 UUID;
  v_u35 UUID;
  v_p35 UUID;
  v_u36 UUID;
  v_p36 UUID;
  v_u37 UUID;
  v_p37 UUID;
  v_u38 UUID;
  v_p38 UUID;
  v_u39 UUID;
  v_p39 UUID;
  v_u40 UUID;
  v_p40 UUID;
  v_u41 UUID;
  v_p41 UUID;
  v_u42 UUID;
  v_p42 UUID;
  v_u43 UUID;
  v_p43 UUID;
  v_u44 UUID;
  v_p44 UUID;
  v_u45 UUID;
  v_p45 UUID;
  v_u46 UUID;
  v_p46 UUID;
  v_u47 UUID;
  v_p47 UUID;
  v_u48 UUID;
  v_p48 UUID;
  v_u49 UUID;
  v_p49 UUID;
  v_u50 UUID;
  v_p50 UUID;
  v_u51 UUID;
  v_p51 UUID;
  v_u52 UUID;
  v_p52 UUID;
  v_u53 UUID;
  v_p53 UUID;
  v_u54 UUID;
  v_p54 UUID;
  v_u55 UUID;
  v_p55 UUID;
  v_u56 UUID;
  v_p56 UUID;
  v_u57 UUID;
  v_p57 UUID;
  v_u58 UUID;
  v_p58 UUID;
  v_u59 UUID;
  v_p59 UUID;
  v_u60 UUID;
  v_p60 UUID;
  v_u61 UUID;
  v_p61 UUID;
  v_u62 UUID;
  v_p62 UUID;
  v_u63 UUID;
  v_p63 UUID;
  v_u64 UUID;
  v_p64 UUID;
  v_u65 UUID;
  v_p65 UUID;
  v_u66 UUID;
  v_p66 UUID;
  v_u67 UUID;
  v_p67 UUID;
  v_u68 UUID;
  v_p68 UUID;
  v_u69 UUID;
  v_p69 UUID;
  v_u70 UUID;
  v_p70 UUID;
  v_u71 UUID;
  v_p71 UUID;
  v_u72 UUID;
  v_p72 UUID;
  v_u73 UUID;
  v_p73 UUID;
  v_u74 UUID;
  v_p74 UUID;
  v_u75 UUID;
  v_p75 UUID;
  v_u76 UUID;
  v_p76 UUID;
  v_u77 UUID;
  v_p77 UUID;
  v_u78 UUID;
  v_p78 UUID;
  v_u79 UUID;
  v_p79 UUID;
  v_u80 UUID;
  v_p80 UUID;
  v_u81 UUID;
  v_p81 UUID;
  v_u82 UUID;
  v_p82 UUID;
  v_u83 UUID;
  v_p83 UUID;
  v_u84 UUID;
  v_p84 UUID;
  v_u85 UUID;
  v_p85 UUID;
  v_u86 UUID;
  v_p86 UUID;
  v_u87 UUID;
  v_p87 UUID;
  v_u88 UUID;
  v_p88 UUID;
  v_u89 UUID;
  v_p89 UUID;
  v_u90 UUID;
  v_p90 UUID;
  v_u91 UUID;
  v_p91 UUID;
  v_u92 UUID;
  v_p92 UUID;
  v_u93 UUID;
  v_p93 UUID;
  v_u94 UUID;
  v_p94 UUID;
  v_u95 UUID;
  v_p95 UUID;
  v_u96 UUID;
  v_p96 UUID;
  v_u97 UUID;
  v_p97 UUID;
  v_u98 UUID;
  v_p98 UUID;
  v_u99 UUID;
  v_p99 UUID;
  v_u100 UUID;
  v_p100 UUID;
BEGIN

-- Fetch seed user IDs
  SELECT id INTO v_u1 FROM users WHERE email LIKE '%1@seed100.dev' LIMIT 1;
  SELECT id INTO v_u2 FROM users WHERE email LIKE '%2@seed100.dev' LIMIT 1;
  SELECT id INTO v_u3 FROM users WHERE email LIKE '%3@seed100.dev' LIMIT 1;
  SELECT id INTO v_u4 FROM users WHERE email LIKE '%4@seed100.dev' LIMIT 1;
  SELECT id INTO v_u5 FROM users WHERE email LIKE '%5@seed100.dev' LIMIT 1;
  SELECT id INTO v_u6 FROM users WHERE email LIKE '%6@seed100.dev' LIMIT 1;
  SELECT id INTO v_u7 FROM users WHERE email LIKE '%7@seed100.dev' LIMIT 1;
  SELECT id INTO v_u8 FROM users WHERE email LIKE '%8@seed100.dev' LIMIT 1;
  SELECT id INTO v_u9 FROM users WHERE email LIKE '%9@seed100.dev' LIMIT 1;
  SELECT id INTO v_u10 FROM users WHERE email LIKE '%10@seed100.dev' LIMIT 1;
  SELECT id INTO v_u11 FROM users WHERE email LIKE '%11@seed100.dev' LIMIT 1;
  SELECT id INTO v_u12 FROM users WHERE email LIKE '%12@seed100.dev' LIMIT 1;
  SELECT id INTO v_u13 FROM users WHERE email LIKE '%13@seed100.dev' LIMIT 1;
  SELECT id INTO v_u14 FROM users WHERE email LIKE '%14@seed100.dev' LIMIT 1;
  SELECT id INTO v_u15 FROM users WHERE email LIKE '%15@seed100.dev' LIMIT 1;
  SELECT id INTO v_u16 FROM users WHERE email LIKE '%16@seed100.dev' LIMIT 1;
  SELECT id INTO v_u17 FROM users WHERE email LIKE '%17@seed100.dev' LIMIT 1;
  SELECT id INTO v_u18 FROM users WHERE email LIKE '%18@seed100.dev' LIMIT 1;
  SELECT id INTO v_u19 FROM users WHERE email LIKE '%19@seed100.dev' LIMIT 1;
  SELECT id INTO v_u20 FROM users WHERE email LIKE '%20@seed100.dev' LIMIT 1;
  SELECT id INTO v_u21 FROM users WHERE email LIKE '%21@seed100.dev' LIMIT 1;
  SELECT id INTO v_u22 FROM users WHERE email LIKE '%22@seed100.dev' LIMIT 1;
  SELECT id INTO v_u23 FROM users WHERE email LIKE '%23@seed100.dev' LIMIT 1;
  SELECT id INTO v_u24 FROM users WHERE email LIKE '%24@seed100.dev' LIMIT 1;
  SELECT id INTO v_u25 FROM users WHERE email LIKE '%25@seed100.dev' LIMIT 1;
  SELECT id INTO v_u26 FROM users WHERE email LIKE '%26@seed100.dev' LIMIT 1;
  SELECT id INTO v_u27 FROM users WHERE email LIKE '%27@seed100.dev' LIMIT 1;
  SELECT id INTO v_u28 FROM users WHERE email LIKE '%28@seed100.dev' LIMIT 1;
  SELECT id INTO v_u29 FROM users WHERE email LIKE '%29@seed100.dev' LIMIT 1;
  SELECT id INTO v_u30 FROM users WHERE email LIKE '%30@seed100.dev' LIMIT 1;
  SELECT id INTO v_u31 FROM users WHERE email LIKE '%31@seed100.dev' LIMIT 1;
  SELECT id INTO v_u32 FROM users WHERE email LIKE '%32@seed100.dev' LIMIT 1;
  SELECT id INTO v_u33 FROM users WHERE email LIKE '%33@seed100.dev' LIMIT 1;
  SELECT id INTO v_u34 FROM users WHERE email LIKE '%34@seed100.dev' LIMIT 1;
  SELECT id INTO v_u35 FROM users WHERE email LIKE '%35@seed100.dev' LIMIT 1;
  SELECT id INTO v_u36 FROM users WHERE email LIKE '%36@seed100.dev' LIMIT 1;
  SELECT id INTO v_u37 FROM users WHERE email LIKE '%37@seed100.dev' LIMIT 1;
  SELECT id INTO v_u38 FROM users WHERE email LIKE '%38@seed100.dev' LIMIT 1;
  SELECT id INTO v_u39 FROM users WHERE email LIKE '%39@seed100.dev' LIMIT 1;
  SELECT id INTO v_u40 FROM users WHERE email LIKE '%40@seed100.dev' LIMIT 1;
  SELECT id INTO v_u41 FROM users WHERE email LIKE '%41@seed100.dev' LIMIT 1;
  SELECT id INTO v_u42 FROM users WHERE email LIKE '%42@seed100.dev' LIMIT 1;
  SELECT id INTO v_u43 FROM users WHERE email LIKE '%43@seed100.dev' LIMIT 1;
  SELECT id INTO v_u44 FROM users WHERE email LIKE '%44@seed100.dev' LIMIT 1;
  SELECT id INTO v_u45 FROM users WHERE email LIKE '%45@seed100.dev' LIMIT 1;
  SELECT id INTO v_u46 FROM users WHERE email LIKE '%46@seed100.dev' LIMIT 1;
  SELECT id INTO v_u47 FROM users WHERE email LIKE '%47@seed100.dev' LIMIT 1;
  SELECT id INTO v_u48 FROM users WHERE email LIKE '%48@seed100.dev' LIMIT 1;
  SELECT id INTO v_u49 FROM users WHERE email LIKE '%49@seed100.dev' LIMIT 1;
  SELECT id INTO v_u50 FROM users WHERE email LIKE '%50@seed100.dev' LIMIT 1;
  SELECT id INTO v_u51 FROM users WHERE email LIKE '%51@seed100.dev' LIMIT 1;
  SELECT id INTO v_u52 FROM users WHERE email LIKE '%52@seed100.dev' LIMIT 1;
  SELECT id INTO v_u53 FROM users WHERE email LIKE '%53@seed100.dev' LIMIT 1;
  SELECT id INTO v_u54 FROM users WHERE email LIKE '%54@seed100.dev' LIMIT 1;
  SELECT id INTO v_u55 FROM users WHERE email LIKE '%55@seed100.dev' LIMIT 1;
  SELECT id INTO v_u56 FROM users WHERE email LIKE '%56@seed100.dev' LIMIT 1;
  SELECT id INTO v_u57 FROM users WHERE email LIKE '%57@seed100.dev' LIMIT 1;
  SELECT id INTO v_u58 FROM users WHERE email LIKE '%58@seed100.dev' LIMIT 1;
  SELECT id INTO v_u59 FROM users WHERE email LIKE '%59@seed100.dev' LIMIT 1;
  SELECT id INTO v_u60 FROM users WHERE email LIKE '%60@seed100.dev' LIMIT 1;
  SELECT id INTO v_u61 FROM users WHERE email LIKE '%61@seed100.dev' LIMIT 1;
  SELECT id INTO v_u62 FROM users WHERE email LIKE '%62@seed100.dev' LIMIT 1;
  SELECT id INTO v_u63 FROM users WHERE email LIKE '%63@seed100.dev' LIMIT 1;
  SELECT id INTO v_u64 FROM users WHERE email LIKE '%64@seed100.dev' LIMIT 1;
  SELECT id INTO v_u65 FROM users WHERE email LIKE '%65@seed100.dev' LIMIT 1;
  SELECT id INTO v_u66 FROM users WHERE email LIKE '%66@seed100.dev' LIMIT 1;
  SELECT id INTO v_u67 FROM users WHERE email LIKE '%67@seed100.dev' LIMIT 1;
  SELECT id INTO v_u68 FROM users WHERE email LIKE '%68@seed100.dev' LIMIT 1;
  SELECT id INTO v_u69 FROM users WHERE email LIKE '%69@seed100.dev' LIMIT 1;
  SELECT id INTO v_u70 FROM users WHERE email LIKE '%70@seed100.dev' LIMIT 1;
  SELECT id INTO v_u71 FROM users WHERE email LIKE '%71@seed100.dev' LIMIT 1;
  SELECT id INTO v_u72 FROM users WHERE email LIKE '%72@seed100.dev' LIMIT 1;
  SELECT id INTO v_u73 FROM users WHERE email LIKE '%73@seed100.dev' LIMIT 1;
  SELECT id INTO v_u74 FROM users WHERE email LIKE '%74@seed100.dev' LIMIT 1;
  SELECT id INTO v_u75 FROM users WHERE email LIKE '%75@seed100.dev' LIMIT 1;
  SELECT id INTO v_u76 FROM users WHERE email LIKE '%76@seed100.dev' LIMIT 1;
  SELECT id INTO v_u77 FROM users WHERE email LIKE '%77@seed100.dev' LIMIT 1;
  SELECT id INTO v_u78 FROM users WHERE email LIKE '%78@seed100.dev' LIMIT 1;
  SELECT id INTO v_u79 FROM users WHERE email LIKE '%79@seed100.dev' LIMIT 1;
  SELECT id INTO v_u80 FROM users WHERE email LIKE '%80@seed100.dev' LIMIT 1;
  SELECT id INTO v_u81 FROM users WHERE email LIKE '%81@seed100.dev' LIMIT 1;
  SELECT id INTO v_u82 FROM users WHERE email LIKE '%82@seed100.dev' LIMIT 1;
  SELECT id INTO v_u83 FROM users WHERE email LIKE '%83@seed100.dev' LIMIT 1;
  SELECT id INTO v_u84 FROM users WHERE email LIKE '%84@seed100.dev' LIMIT 1;
  SELECT id INTO v_u85 FROM users WHERE email LIKE '%85@seed100.dev' LIMIT 1;
  SELECT id INTO v_u86 FROM users WHERE email LIKE '%86@seed100.dev' LIMIT 1;
  SELECT id INTO v_u87 FROM users WHERE email LIKE '%87@seed100.dev' LIMIT 1;
  SELECT id INTO v_u88 FROM users WHERE email LIKE '%88@seed100.dev' LIMIT 1;
  SELECT id INTO v_u89 FROM users WHERE email LIKE '%89@seed100.dev' LIMIT 1;
  SELECT id INTO v_u90 FROM users WHERE email LIKE '%90@seed100.dev' LIMIT 1;
  SELECT id INTO v_u91 FROM users WHERE email LIKE '%91@seed100.dev' LIMIT 1;
  SELECT id INTO v_u92 FROM users WHERE email LIKE '%92@seed100.dev' LIMIT 1;
  SELECT id INTO v_u93 FROM users WHERE email LIKE '%93@seed100.dev' LIMIT 1;
  SELECT id INTO v_u94 FROM users WHERE email LIKE '%94@seed100.dev' LIMIT 1;
  SELECT id INTO v_u95 FROM users WHERE email LIKE '%95@seed100.dev' LIMIT 1;
  SELECT id INTO v_u96 FROM users WHERE email LIKE '%96@seed100.dev' LIMIT 1;
  SELECT id INTO v_u97 FROM users WHERE email LIKE '%97@seed100.dev' LIMIT 1;
  SELECT id INTO v_u98 FROM users WHERE email LIKE '%98@seed100.dev' LIMIT 1;
  SELECT id INTO v_u99 FROM users WHERE email LIKE '%99@seed100.dev' LIMIT 1;
  SELECT id INTO v_u100 FROM users WHERE email LIKE '%100@seed100.dev' LIMIT 1;

-- Delete existing seeded pain points
  DELETE FROM community_posts WHERE post_type = 'pain_point'
    AND user_id IN (SELECT id FROM users WHERE email LIKE '%@seed100.dev');

-- Insert 100 pain points
  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u1, NULL, 'validate', 'pain_point', '||PP||{"description": "Agency client onboarding takes 2 weeks of back-and-forth emails just to collect briefs, assets, and approvals.", "audience": "Agency owner \u00b7 5\u201320 person team", "frequency": "Weekly", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '84 days')
  RETURNING id INTO v_p1;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p1, v_u32, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p1, v_u26, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p1, v_u16, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p1, v_u65, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p1, v_u76, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p1, v_u83, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u2, NULL, 'hone', 'pain_point', '||PP||{"description": "We lose track of which client gave verbal approval vs written approval. Ends up in arguments over scope.", "audience": "Project manager \u00b7 Creative agency", "frequency": "Weekly", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '38 days')
  RETURNING id INTO v_p2;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p2, v_u82, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p2, v_u86, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p2, v_u66, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p2, v_u1, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p2, v_u37, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p2, v_u5, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p2, v_u26, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p2, v_u28, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p2, v_u70, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p2, v_u54, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u3, NULL, 'hone', 'pain_point', '||PP||{"description": "Freelancers quote projects, client agrees, then ghosts when the invoice arrives. No paper trail.", "audience": "Freelancer \u00b7 Solo", "frequency": "Monthly", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '85 days')
  RETURNING id INTO v_p3;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p3, v_u17, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p3, v_u13, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p3, v_u72, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p3, v_u35, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p3, v_u30, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p3, v_u32, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p3, v_u28, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p3, v_u11, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u4, NULL, 'idea', 'pain_point', '||PP||{"description": "Every agency retainer ends up with scope creep because there''s no easy way to log and approve change requests.", "audience": "Account manager \u00b7 Mid-size agency", "frequency": "Weekly", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '52 days')
  RETURNING id INTO v_p4;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p4, v_u73, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p4, v_u58, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p4, v_u78, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p4, v_u92, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p4, v_u70, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p4, v_u11, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p4, v_u14, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p4, v_u46, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p4, v_u15, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u5, NULL, 'idea', 'pain_point', '||PP||{"description": "Chasing client feedback takes longer than doing the actual work. Clients respond on WhatsApp, email, and Slack all at once.", "audience": "Designer \u00b7 Freelancer", "frequency": "Daily", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '148 days')
  RETURNING id INTO v_p5;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p5, v_u12, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p5, v_u70, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p5, v_u15, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p5, v_u36, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p5, v_u58, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p5, v_u49, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u6, NULL, 'done', 'pain_point', '||PP||{"description": "Agency timesheets are filled in on Friday for the whole week from memory. The data is useless.", "audience": "Operations manager \u00b7 Agency", "frequency": "Weekly", "impact": "medium", "domain": "hr-tech"}||END||', 'approved', NOW() - INTERVAL '15 days')
  RETURNING id INTO v_p6;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p6, v_u100, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p6, v_u53, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p6, v_u98, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p6, v_u76, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p6, v_u79, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p6, v_u69, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p6, v_u33, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p6, v_u30, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p6, v_u56, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p6, v_u19, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p6, v_u54, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p6, v_u2, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u7, NULL, 'idea', 'pain_point', '||PP||{"description": "We onboard a new contractor and it takes a full day just to get them access to the tools they need.", "audience": "Studio manager \u00b7 Creative studio", "frequency": "Monthly", "impact": "medium", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '14 days')
  RETURNING id INTO v_p7;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p7, v_u82, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p7, v_u6, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p7, v_u97, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p7, v_u47, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p7, v_u99, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p7, v_u18, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p7, v_u35, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p7, v_u68, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p7, v_u76, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u8, NULL, 'shape', 'pain_point', '||PP||{"description": "Cancellation flows are buried 5 clicks deep so users churn silently without leaving feedback.", "audience": "Founder \u00b7 Early-stage SaaS", "frequency": "Daily", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '15 days')
  RETURNING id INTO v_p8;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p8, v_u62, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p8, v_u90, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p8, v_u85, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p8, v_u14, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p8, v_u20, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p8, v_u40, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p8, v_u69, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p8, v_u3, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u9, NULL, 'shape', 'pain_point', '||PP||{"description": "Trial-to-paid conversion is a black box. We have no idea which features actually drive upgrades.", "audience": "Head of growth \u00b7 B2B SaaS", "frequency": "Daily", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '91 days')
  RETURNING id INTO v_p9;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p9, v_u98, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p9, v_u55, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p9, v_u75, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p9, v_u1, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p9, v_u8, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p9, v_u63, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p9, v_u20, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p9, v_u99, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p9, v_u97, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u10, NULL, 'idea', 'pain_point', '||PP||{"description": "Customer success teams duplicate work \u2014 they manually check Stripe, Intercom, and the CRM separately for every account review.", "audience": "Customer success manager \u00b7 SaaS", "frequency": "Daily", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '62 days')
  RETURNING id INTO v_p10;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p10, v_u87, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p10, v_u61, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p10, v_u51, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u11, NULL, 'shape', 'pain_point', '||PP||{"description": "We have 12 Slack integrations but no single place to see which one triggered an alert and why.", "audience": "CTO \u00b7 Startup", "frequency": "Daily", "impact": "medium", "domain": "devtools"}||END||', 'approved', NOW() - INTERVAL '27 days')
  RETURNING id INTO v_p11;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p11, v_u19, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p11, v_u32, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p11, v_u35, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p11, v_u28, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p11, v_u100, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p11, v_u13, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p11, v_u22, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p11, v_u23, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p11, v_u4, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p11, v_u7, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u12, NULL, 'hone', 'pain_point', '||PP||{"description": "Product roadmap is maintained in Notion but engineering uses Jira. They''re always out of sync.", "audience": "Product manager \u00b7 Scale-up", "frequency": "Weekly", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '172 days')
  RETURNING id INTO v_p12;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p12, v_u100, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p12, v_u50, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p12, v_u75, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p12, v_u93, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p12, v_u95, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p12, v_u78, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p12, v_u65, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p12, v_u67, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p12, v_u36, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p12, v_u81, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u13, NULL, 'idea', 'pain_point', '||PP||{"description": "Onboarding emails go out the same day regardless of whether the user has actually activated. Feels robotic.", "audience": "Growth lead \u00b7 SaaS startup", "frequency": "Daily", "impact": "medium", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '121 days')
  RETURNING id INTO v_p13;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p13, v_u55, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p13, v_u39, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p13, v_u71, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p13, v_u37, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p13, v_u38, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p13, v_u60, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p13, v_u3, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p13, v_u83, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u14, NULL, 'shape', 'pain_point', '||PP||{"description": "We spend more time formatting release notes than writing them. No standard template, no discipline.", "audience": "Engineering manager \u00b7 SaaS", "frequency": "Weekly", "impact": "low", "domain": "devtools"}||END||', 'approved', NOW() - INTERVAL '19 days')
  RETURNING id INTO v_p14;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p14, v_u3, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p14, v_u96, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p14, v_u2, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p14, v_u13, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u15, NULL, 'idea', 'pain_point', '||PP||{"description": "Pricing page A/B tests take 3 weeks to set up because engineering is always busy.", "audience": "Founder \u00b7 Early SaaS", "frequency": "Monthly", "impact": "medium", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '131 days')
  RETURNING id INTO v_p15;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p15, v_u88, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p15, v_u11, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p15, v_u56, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p15, v_u16, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p15, v_u90, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u16, NULL, 'shape', 'pain_point', '||PP||{"description": "Manager 1-on-1 notes are scattered across personal Notion pages. No visibility for HR or continuity when managers leave.", "audience": "HR director \u00b7 50-person company", "frequency": "Weekly", "impact": "high", "domain": "hr-tech"}||END||', 'approved', NOW() - INTERVAL '73 days')
  RETURNING id INTO v_p16;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p16, v_u64, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p16, v_u70, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p16, v_u90, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p16, v_u100, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p16, v_u53, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p16, v_u88, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p16, v_u57, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u17, NULL, 'validate', 'pain_point', '||PP||{"description": "Annual performance reviews take 3 months to complete. By the time feedback is actioned the context is gone.", "audience": "People ops manager \u00b7 Scale-up", "frequency": "Occasionally", "impact": "high", "domain": "hr-tech"}||END||', 'approved', NOW() - INTERVAL '73 days')
  RETURNING id INTO v_p17;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p17, v_u12, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p17, v_u69, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p17, v_u43, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p17, v_u42, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p17, v_u26, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p17, v_u37, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p17, v_u49, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p17, v_u98, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p17, v_u92, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p17, v_u76, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p17, v_u58, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p17, v_u73, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u18, NULL, 'done', 'pain_point', '||PP||{"description": "New hires get a 40-tab onboarding doc and then get left alone. Half the tabs are out of date.", "audience": "HR manager \u00b7 Tech company", "frequency": "Monthly", "impact": "high", "domain": "hr-tech"}||END||', 'approved', NOW() - INTERVAL '103 days')
  RETURNING id INTO v_p18;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p18, v_u34, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p18, v_u50, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p18, v_u97, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p18, v_u73, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p18, v_u92, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p18, v_u86, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p18, v_u41, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p18, v_u11, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p18, v_u95, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p18, v_u15, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p18, v_u21, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u19, NULL, 'hone', 'pain_point', '||PP||{"description": "We run pulse surveys but the results sit in a spreadsheet nobody reads. No action, no follow-through.", "audience": "Head of people \u00b7 Startup", "frequency": "Monthly", "impact": "medium", "domain": "hr-tech"}||END||', 'approved', NOW() - INTERVAL '93 days')
  RETURNING id INTO v_p19;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p19, v_u91, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p19, v_u7, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p19, v_u29, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p19, v_u77, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p19, v_u81, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p19, v_u73, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p19, v_u79, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p19, v_u88, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p19, v_u71, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u20, NULL, 'idea', 'pain_point', '||PP||{"description": "Remote team members don''t know who does what. No simple internal directory that''s actually kept up to date.", "audience": "Operations manager \u00b7 Remote-first startup", "frequency": "Weekly", "impact": "medium", "domain": "hr-tech"}||END||', 'approved', NOW() - INTERVAL '151 days')
  RETURNING id INTO v_p20;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p20, v_u83, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p20, v_u90, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p20, v_u36, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p20, v_u22, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u21, NULL, 'validate', 'pain_point', '||PP||{"description": "Leave requests are still approved over email. Nothing feeds into payroll automatically.", "audience": "Finance manager \u00b7 SMB", "frequency": "Weekly", "impact": "medium", "domain": "hr-tech"}||END||', 'approved', NOW() - INTERVAL '16 days')
  RETURNING id INTO v_p21;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p21, v_u68, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p21, v_u95, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p21, v_u81, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p21, v_u76, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p21, v_u50, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p21, v_u12, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p21, v_u91, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p21, v_u11, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p21, v_u49, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p21, v_u62, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u22, NULL, 'done', 'pain_point', '||PP||{"description": "Contractors vs employees have completely different access needs but we manage them the same way \u2014 badly.", "audience": "HR manager \u00b7 Fast-growing startup", "frequency": "Monthly", "impact": "high", "domain": "hr-tech"}||END||', 'approved', NOW() - INTERVAL '2 days')
  RETURNING id INTO v_p22;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p22, v_u59, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p22, v_u97, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p22, v_u66, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p22, v_u53, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u23, NULL, 'done', 'pain_point', '||PP||{"description": "Reconciling expense receipts at month end takes 2 full days. Half the receipts are missing.", "audience": "Finance manager \u00b7 30-person company", "frequency": "Monthly", "impact": "high", "domain": "fintech"}||END||', 'approved', NOW() - INTERVAL '20 days')
  RETURNING id INTO v_p23;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p23, v_u1, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p23, v_u15, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p23, v_u5, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p23, v_u50, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p23, v_u17, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p23, v_u88, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u24, NULL, 'validate', 'pain_point', '||PP||{"description": "We invoice in 3 currencies and our accountant manually converts everything in a spreadsheet every quarter.", "audience": "CFO \u00b7 Scale-up", "frequency": "Monthly", "impact": "high", "domain": "fintech"}||END||', 'approved', NOW() - INTERVAL '154 days')
  RETURNING id INTO v_p24;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p24, v_u83, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p24, v_u23, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p24, v_u71, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p24, v_u87, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p24, v_u9, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u25, NULL, 'idea', 'pain_point', '||PP||{"description": "SaaS subscriptions show up differently on every card statement. Hard to categorise correctly for tax.", "audience": "Founder \u00b7 Bootstrapped startup", "frequency": "Monthly", "impact": "medium", "domain": "fintech"}||END||', 'approved', NOW() - INTERVAL '141 days')
  RETURNING id INTO v_p25;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p25, v_u51, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p25, v_u67, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p25, v_u93, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p25, v_u10, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p25, v_u23, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p25, v_u96, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p25, v_u63, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p25, v_u76, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p25, v_u79, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u26, NULL, 'validate', 'pain_point', '||PP||{"description": "We have no way to see which clients are profitable until we close the books 6 weeks after the quarter ends.", "audience": "Agency owner \u00b7 15-person studio", "frequency": "Monthly", "impact": "high", "domain": "fintech"}||END||', 'approved', NOW() - INTERVAL '84 days')
  RETURNING id INTO v_p26;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p26, v_u31, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p26, v_u25, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p26, v_u64, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p26, v_u75, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p26, v_u57, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p26, v_u91, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p26, v_u78, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p26, v_u28, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p26, v_u55, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u27, NULL, 'idea', 'pain_point', '||PP||{"description": "Approving purchase orders still happens over email with no audit trail. Nightmare at year-end.", "audience": "Finance director \u00b7 Mid-size company", "frequency": "Weekly", "impact": "high", "domain": "fintech"}||END||', 'approved', NOW() - INTERVAL '55 days')
  RETURNING id INTO v_p27;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p27, v_u80, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p27, v_u85, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p27, v_u84, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p27, v_u41, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p27, v_u87, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p27, v_u44, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p27, v_u45, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p27, v_u56, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p27, v_u70, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p27, v_u50, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u28, NULL, 'hone', 'pain_point', '||PP||{"description": "UTM parameters are created inconsistently across 4 team members. Attribution data is a mess.", "audience": "Marketing manager \u00b7 B2B company", "frequency": "Daily", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '66 days')
  RETURNING id INTO v_p28;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p28, v_u30, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p28, v_u21, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p28, v_u46, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p28, v_u87, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p28, v_u37, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p28, v_u72, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u29, NULL, 'shape', 'pain_point', '||PP||{"description": "Creating a new landing page requires a developer. Marketing waits 2 weeks for every test.", "audience": "Head of marketing \u00b7 SaaS", "frequency": "Weekly", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '75 days')
  RETURNING id INTO v_p29;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p29, v_u65, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p29, v_u32, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p29, v_u91, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p29, v_u13, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p29, v_u80, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p29, v_u93, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p29, v_u9, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p29, v_u39, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u30, NULL, 'validate', 'pain_point', '||PP||{"description": "Social media scheduling tools don''t let you reuse evergreen content automatically. Everything gets posted once and forgotten.", "audience": "Content manager \u00b7 Media brand", "frequency": "Weekly", "impact": "medium", "domain": "consumer"}||END||', 'approved', NOW() - INTERVAL '45 days')
  RETURNING id INTO v_p30;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p30, v_u39, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p30, v_u76, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p30, v_u58, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p30, v_u69, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p30, v_u70, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p30, v_u82, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u31, NULL, 'shape', 'pain_point', '||PP||{"description": "Monthly marketing report takes 2 days to pull together from GA, LinkedIn, HubSpot, and Stripe separately.", "audience": "Marketing director \u00b7 Scale-up", "frequency": "Monthly", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '177 days')
  RETURNING id INTO v_p31;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p31, v_u14, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p31, v_u89, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p31, v_u58, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p31, v_u71, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p31, v_u47, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p31, v_u67, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p31, v_u52, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p31, v_u23, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p31, v_u53, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u32, NULL, 'shape', 'pain_point', '||PP||{"description": "We write the same email in 4 variants for 4 segments. No tool makes personalisation easy without a developer.", "audience": "CRM manager \u00b7 eCommerce brand", "frequency": "Weekly", "impact": "medium", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '142 days')
  RETURNING id INTO v_p32;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p32, v_u80, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p32, v_u98, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p32, v_u35, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p32, v_u4, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p32, v_u78, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p32, v_u40, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p32, v_u60, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p32, v_u69, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u33, NULL, 'shape', 'pain_point', '||PP||{"description": "Influencer campaigns have no standard contract or deliverable tracker. Every campaign is managed differently.", "audience": "Brand manager \u00b7 Consumer startup", "frequency": "Monthly", "impact": "medium", "domain": "consumer"}||END||', 'approved', NOW() - INTERVAL '175 days')
  RETURNING id INTO v_p33;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p33, v_u3, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p33, v_u75, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p33, v_u10, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p33, v_u51, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p33, v_u44, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p33, v_u49, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p33, v_u84, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p33, v_u17, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p33, v_u50, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u34, NULL, 'validate', 'pain_point', '||PP||{"description": "Support tickets get answered by whoever sees them first. No routing, no SLAs, no visibility.", "audience": "Head of support \u00b7 SMB", "frequency": "Daily", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '38 days')
  RETURNING id INTO v_p34;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p34, v_u59, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p34, v_u91, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p34, v_u22, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p34, v_u7, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u35, NULL, 'shape', 'pain_point', '||PP||{"description": "Customers submit the same support request in 3 channels \u2014 email, chat, and Twitter. We answer the same thing 3 times.", "audience": "Customer support lead \u00b7 SaaS", "frequency": "Daily", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '148 days')
  RETURNING id INTO v_p35;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p35, v_u45, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p35, v_u47, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p35, v_u12, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p35, v_u86, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p35, v_u19, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p35, v_u24, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p35, v_u46, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u36, NULL, 'shape', 'pain_point', '||PP||{"description": "Escalated support tickets have no owner. They bounce between CS and engineering with no resolution.", "audience": "VP Customer Success \u00b7 SaaS", "frequency": "Weekly", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '179 days')
  RETURNING id INTO v_p36;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p36, v_u62, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p36, v_u77, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p36, v_u68, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u37, NULL, 'shape', 'pain_point', '||PP||{"description": "New support reps take 3 months to get productive because there''s no single source of truth for product knowledge.", "audience": "Support manager \u00b7 Scale-up", "frequency": "Monthly", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '60 days')
  RETURNING id INTO v_p37;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p37, v_u94, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p37, v_u83, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p37, v_u77, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p37, v_u63, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u38, NULL, 'idea', 'pain_point', '||PP||{"description": "We have 3 years of support ticket data and have never mined it to find product improvements.", "audience": "CTO \u00b7 SaaS startup", "frequency": "Occasionally", "impact": "medium", "domain": "devtools"}||END||', 'approved', NOW() - INTERVAL '157 days')
  RETURNING id INTO v_p38;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p38, v_u3, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p38, v_u12, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p38, v_u4, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p38, v_u8, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p38, v_u94, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p38, v_u68, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p38, v_u65, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p38, v_u41, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u39, NULL, 'shape', 'pain_point', '||PP||{"description": "Sales reps log CRM notes manually after calls. Half forget and the data is always 2 days stale.", "audience": "Sales manager \u00b7 B2B company", "frequency": "Daily", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '138 days')
  RETURNING id INTO v_p39;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p39, v_u25, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p39, v_u67, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p39, v_u70, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p39, v_u31, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p39, v_u78, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u40, NULL, 'idea', 'pain_point', '||PP||{"description": "Proposal templates are stored in Google Drive but everyone has their own version. No consistency.", "audience": "Account executive \u00b7 SaaS company", "frequency": "Weekly", "impact": "medium", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '170 days')
  RETURNING id INTO v_p40;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p40, v_u75, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p40, v_u93, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p40, v_u94, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p40, v_u22, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p40, v_u23, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p40, v_u73, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p40, v_u28, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p40, v_u49, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p40, v_u43, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p40, v_u7, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u41, NULL, 'done', 'pain_point', '||PP||{"description": "Demos take 45 minutes but we never record which objections came up. No way to learn across the team.", "audience": "Head of sales \u00b7 Early-stage SaaS", "frequency": "Weekly", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '138 days')
  RETURNING id INTO v_p41;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p41, v_u68, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p41, v_u25, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p41, v_u85, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p41, v_u60, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p41, v_u94, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u42, NULL, 'shape', 'pain_point', '||PP||{"description": "Leads from events go into a spreadsheet and get followed up by whoever remembers. Most go cold.", "audience": "Business development \u00b7 SMB", "frequency": "Monthly", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '63 days')
  RETURNING id INTO v_p42;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p42, v_u71, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p42, v_u63, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p42, v_u97, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p42, v_u51, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p42, v_u96, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p42, v_u54, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u43, NULL, 'done', 'pain_point', '||PP||{"description": "Our sales deck is updated once a quarter. Reps are presenting slides with old pricing and old case studies.", "audience": "VP Sales \u00b7 Scale-up", "frequency": "Monthly", "impact": "medium", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '119 days')
  RETURNING id INTO v_p43;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p43, v_u49, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p43, v_u22, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p43, v_u85, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u44, NULL, 'shape', 'pain_point', '||PP||{"description": "Deploying to staging is 4 manual steps that we forget to document every time someone new joins.", "audience": "Software engineer \u00b7 Startup", "frequency": "Weekly", "impact": "medium", "domain": "devtools"}||END||', 'approved', NOW() - INTERVAL '60 days')
  RETURNING id INTO v_p44;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p44, v_u66, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p44, v_u41, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p44, v_u97, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p44, v_u34, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p44, v_u65, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p44, v_u50, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p44, v_u100, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u45, NULL, 'validate', 'pain_point', '||PP||{"description": "We review PRs 48 hours after they''re opened because nobody has context by then.", "audience": "Engineering manager \u00b7 10-person team", "frequency": "Daily", "impact": "medium", "domain": "devtools"}||END||', 'approved', NOW() - INTERVAL '59 days')
  RETURNING id INTO v_p45;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p45, v_u4, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p45, v_u6, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p45, v_u73, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p45, v_u32, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p45, v_u78, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p45, v_u56, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p45, v_u12, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p45, v_u27, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p45, v_u35, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p45, v_u87, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p45, v_u70, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p45, v_u37, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u46, NULL, 'validate', 'pain_point', '||PP||{"description": "Local dev setup takes a new engineer a full day to get working. The README is always out of date.", "audience": "Senior engineer \u00b7 SaaS startup", "frequency": "Monthly", "impact": "medium", "domain": "devtools"}||END||', 'approved', NOW() - INTERVAL '85 days')
  RETURNING id INTO v_p46;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p46, v_u99, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p46, v_u15, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p46, v_u84, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p46, v_u65, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p46, v_u79, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p46, v_u76, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u47, NULL, 'shape', 'pain_point', '||PP||{"description": "On-call rota is managed in a shared Google Sheet. People miss shifts and nobody notices until production breaks.", "audience": "DevOps engineer \u00b7 Scale-up", "frequency": "Weekly", "impact": "high", "domain": "devtools"}||END||', 'approved', NOW() - INTERVAL '47 days')
  RETURNING id INTO v_p47;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p47, v_u63, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p47, v_u54, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p47, v_u20, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p47, v_u24, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p47, v_u4, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p47, v_u8, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u48, NULL, 'hone', 'pain_point', '||PP||{"description": "Postmortems get written but never reviewed. We keep having the same incidents.", "audience": "SRE \u00b7 Mid-size SaaS", "frequency": "Monthly", "impact": "high", "domain": "devtools"}||END||', 'approved', NOW() - INTERVAL '5 days')
  RETURNING id INTO v_p48;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p48, v_u64, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p48, v_u33, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p48, v_u73, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p48, v_u61, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p48, v_u37, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u49, NULL, 'shape', 'pain_point', '||PP||{"description": "Database migrations in production are terrifying because there''s no rollback plan documented.", "audience": "Backend engineer \u00b7 Startup", "frequency": "Monthly", "impact": "high", "domain": "devtools"}||END||', 'approved', NOW() - INTERVAL '140 days')
  RETURNING id INTO v_p49;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p49, v_u80, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p49, v_u61, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p49, v_u18, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u50, NULL, 'validate', 'pain_point', '||PP||{"description": "Feature flags are toggled in production by whichever engineer remembers the environment variable name.", "audience": "Senior engineer \u00b7 Scale-up", "frequency": "Weekly", "impact": "medium", "domain": "devtools"}||END||', 'approved', NOW() - INTERVAL '119 days')
  RETURNING id INTO v_p50;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p50, v_u24, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p50, v_u14, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p50, v_u99, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p50, v_u21, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p50, v_u73, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p50, v_u35, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p50, v_u98, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p50, v_u38, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p50, v_u96, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u51, NULL, 'validate', 'pain_point', '||PP||{"description": "Podcast production involves 12 tools. Nothing talks to each other. Scheduling, editing, publishing, and promotion are siloed.", "audience": "Podcast producer \u00b7 Independent", "frequency": "Weekly", "impact": "high", "domain": "media"}||END||', 'approved', NOW() - INTERVAL '134 days')
  RETURNING id INTO v_p51;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p51, v_u2, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p51, v_u21, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p51, v_u38, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p51, v_u35, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p51, v_u31, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p51, v_u58, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p51, v_u36, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p51, v_u98, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u52, NULL, 'validate', 'pain_point', '||PP||{"description": "Newsletter writers have no idea which past editions performed well before writing the next one.", "audience": "Newsletter creator \u00b7 Solo", "frequency": "Weekly", "impact": "medium", "domain": "consumer"}||END||', 'approved', NOW() - INTERVAL '45 days')
  RETURNING id INTO v_p52;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p52, v_u1, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p52, v_u73, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p52, v_u86, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p52, v_u98, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p52, v_u63, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p52, v_u89, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p52, v_u24, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p52, v_u99, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u53, NULL, 'idea', 'pain_point', '||PP||{"description": "Journalists pitch stories in one tool, editors approve in email, and legal reviews in a PDF. No single workflow.", "audience": "Editor \u00b7 Digital media company", "frequency": "Daily", "impact": "high", "domain": "media"}||END||', 'approved', NOW() - INTERVAL '112 days')
  RETURNING id INTO v_p53;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p53, v_u50, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p53, v_u28, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p53, v_u51, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p53, v_u17, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p53, v_u16, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p53, v_u40, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p53, v_u14, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p53, v_u45, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p53, v_u32, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p53, v_u90, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u54, NULL, 'done', 'pain_point', '||PP||{"description": "Video content is shot, edited, uploaded \u2014 then nobody tracks if it actually drove any business outcome.", "audience": "Head of content \u00b7 SaaS", "frequency": "Monthly", "impact": "medium", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '120 days')
  RETURNING id INTO v_p54;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p54, v_u71, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p54, v_u35, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p54, v_u89, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p54, v_u14, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p54, v_u17, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p54, v_u90, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p54, v_u4, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u55, NULL, 'idea', 'pain_point', '||PP||{"description": "Guest booking for podcasts is managed in email threads. Follow-ups get missed and slots go unfilled.", "audience": "Podcast host \u00b7 Media startup", "frequency": "Weekly", "impact": "medium", "domain": "media"}||END||', 'approved', NOW() - INTERVAL '132 days')
  RETURNING id INTO v_p55;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p55, v_u4, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p55, v_u18, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p55, v_u40, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p55, v_u54, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p55, v_u15, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p55, v_u59, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p55, v_u87, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p55, v_u20, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p55, v_u34, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u56, NULL, 'done', 'pain_point', '||PP||{"description": "Returns processing is manual. CS reads each return request, approves by email, and updates inventory by hand.", "audience": "Operations manager \u00b7 eCommerce brand", "frequency": "Daily", "impact": "high", "domain": "marketplace"}||END||', 'approved', NOW() - INTERVAL '39 days')
  RETURNING id INTO v_p56;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p56, v_u65, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p56, v_u12, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p56, v_u92, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p56, v_u44, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p56, v_u79, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p56, v_u95, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p56, v_u68, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p56, v_u29, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p56, v_u55, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p56, v_u52, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p56, v_u100, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p56, v_u54, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u57, NULL, 'idea', 'pain_point', '||PP||{"description": "Product descriptions are written once and never updated even when specs change. Customer complaints follow.", "audience": "eCommerce manager \u00b7 DTC brand", "frequency": "Monthly", "impact": "medium", "domain": "marketplace"}||END||', 'approved', NOW() - INTERVAL '52 days')
  RETURNING id INTO v_p57;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p57, v_u5, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p57, v_u81, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p57, v_u27, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p57, v_u58, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p57, v_u16, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p57, v_u14, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p57, v_u74, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u58, NULL, 'hone', 'pain_point', '||PP||{"description": "Abandoned cart emails go to everyone uniformly. No segmentation by product category or cart size.", "audience": "Growth manager \u00b7 eCommerce", "frequency": "Daily", "impact": "medium", "domain": "marketplace"}||END||', 'approved', NOW() - INTERVAL '135 days')
  RETURNING id INTO v_p58;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p58, v_u77, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p58, v_u46, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p58, v_u79, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p58, v_u66, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p58, v_u75, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p58, v_u68, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p58, v_u97, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p58, v_u20, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p58, v_u40, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p58, v_u61, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u59, NULL, 'hone', 'pain_point', '||PP||{"description": "We sell across 3 marketplaces but manage inventory in each separately. Overselling is a weekly occurrence.", "audience": "Founder \u00b7 eCommerce", "frequency": "Weekly", "impact": "high", "domain": "marketplace"}||END||', 'approved', NOW() - INTERVAL '18 days')
  RETURNING id INTO v_p59;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p59, v_u9, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p59, v_u10, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p59, v_u1, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p59, v_u54, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p59, v_u35, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p59, v_u51, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p59, v_u22, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p59, v_u75, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p59, v_u33, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u60, NULL, 'shape', 'pain_point', '||PP||{"description": "Coaches track client progress in personal Google Sheets. Nothing is shared with the client consistently.", "audience": "Business coach \u00b7 Solo practitioner", "frequency": "Weekly", "impact": "medium", "domain": "edtech"}||END||', 'approved', NOW() - INTERVAL '5 days')
  RETURNING id INTO v_p60;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p60, v_u59, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p60, v_u53, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p60, v_u52, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p60, v_u33, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p60, v_u47, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p60, v_u16, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u61, NULL, 'hone', 'pain_point', '||PP||{"description": "Online course creators record content but have no way to see where students drop off within a lesson.", "audience": "Course creator \u00b7 Solopreneur", "frequency": "Weekly", "impact": "medium", "domain": "edtech"}||END||', 'approved', NOW() - INTERVAL '80 days')
  RETURNING id INTO v_p61;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p61, v_u69, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p61, v_u81, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p61, v_u39, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u62, NULL, 'validate', 'pain_point', '||PP||{"description": "Tutoring sessions are booked via WhatsApp and paid via bank transfer. No automation anywhere.", "audience": "Private tutor \u00b7 Solo", "frequency": "Daily", "impact": "high", "domain": "edtech"}||END||', 'approved', NOW() - INTERVAL '25 days')
  RETURNING id INTO v_p62;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p62, v_u99, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p62, v_u56, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p62, v_u28, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p62, v_u41, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p62, v_u10, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p62, v_u39, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u63, NULL, 'shape', 'pain_point', '||PP||{"description": "Corporate L&D teams commission training but have no way to measure if behaviours actually changed.", "audience": "L&D manager \u00b7 Enterprise", "frequency": "Monthly", "impact": "high", "domain": "edtech"}||END||', 'approved', NOW() - INTERVAL '82 days')
  RETURNING id INTO v_p63;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p63, v_u38, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p63, v_u39, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p63, v_u4, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p63, v_u40, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p63, v_u90, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p63, v_u85, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p63, v_u36, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p63, v_u12, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p63, v_u27, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p63, v_u88, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u64, NULL, 'idea', 'pain_point', '||PP||{"description": "NDAs are signed in DocuSign but the signed copy never makes it into the project folder. Tracking is manual.", "audience": "Legal ops manager \u00b7 Scale-up", "frequency": "Weekly", "impact": "medium", "domain": "legaltech"}||END||', 'approved', NOW() - INTERVAL '128 days')
  RETURNING id INTO v_p64;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p64, v_u61, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p64, v_u16, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p64, v_u90, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p64, v_u44, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p64, v_u50, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p64, v_u87, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p64, v_u78, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u65, NULL, 'shape', 'pain_point', '||PP||{"description": "GDPR data subject access requests arrive via email with no centralised way to track response deadlines.", "audience": "Compliance officer \u00b7 Mid-size company", "frequency": "Monthly", "impact": "high", "domain": "legaltech"}||END||', 'approved', NOW() - INTERVAL '80 days')
  RETURNING id INTO v_p65;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p65, v_u87, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p65, v_u84, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p65, v_u73, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p65, v_u77, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p65, v_u29, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u66, NULL, 'idea', 'pain_point', '||PP||{"description": "Contract renewals sneak up on the team because reminders are set in personal calendars, not a shared system.", "audience": "Procurement manager \u00b7 Enterprise", "frequency": "Monthly", "impact": "high", "domain": "legaltech"}||END||', 'approved', NOW() - INTERVAL '101 days')
  RETURNING id INTO v_p66;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p66, v_u5, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p66, v_u56, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p66, v_u86, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p66, v_u52, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p66, v_u48, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p66, v_u12, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p66, v_u7, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p66, v_u3, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u67, NULL, 'done', 'pain_point', '||PP||{"description": "Small businesses use Word templates for client contracts but never version-control them. Old terms go out by mistake.", "audience": "Founder \u00b7 Consultancy", "frequency": "Monthly", "impact": "medium", "domain": "legaltech"}||END||', 'approved', NOW() - INTERVAL '59 days')
  RETURNING id INTO v_p67;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p67, v_u66, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p67, v_u37, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p67, v_u2, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p67, v_u32, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p67, v_u51, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p67, v_u63, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p67, v_u94, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p67, v_u72, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u68, NULL, 'validate', 'pain_point', '||PP||{"description": "GPs have no way to flag patients who missed follow-up appointments unless they check manually.", "audience": "GP practice manager \u00b7 Healthcare", "frequency": "Daily", "impact": "high", "domain": "healthtech"}||END||', 'approved', NOW() - INTERVAL '103 days')
  RETURNING id INTO v_p68;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p68, v_u98, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p68, v_u67, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p68, v_u77, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p68, v_u3, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p68, v_u54, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p68, v_u89, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p68, v_u75, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p68, v_u55, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p68, v_u26, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p68, v_u2, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p68, v_u84, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p68, v_u8, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u69, NULL, 'idea', 'pain_point', '||PP||{"description": "Mental health practitioners track session notes in personal notebooks. No backup, no handover.", "audience": "Therapist \u00b7 Private practice", "frequency": "Weekly", "impact": "high", "domain": "healthtech"}||END||', 'approved', NOW() - INTERVAL '24 days')
  RETURNING id INTO v_p69;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p69, v_u61, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p69, v_u38, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p69, v_u26, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p69, v_u44, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p69, v_u35, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p69, v_u29, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p69, v_u60, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p69, v_u72, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p69, v_u48, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p69, v_u17, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u70, NULL, 'done', 'pain_point', '||PP||{"description": "Corporate wellness programmes have participation data but no link to absenteeism or productivity metrics.", "audience": "HR director \u00b7 Enterprise", "frequency": "Occasionally", "impact": "medium", "domain": "healthtech"}||END||', 'approved', NOW() - INTERVAL '95 days')
  RETURNING id INTO v_p70;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p70, v_u79, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p70, v_u8, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p70, v_u21, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p70, v_u54, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p70, v_u58, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p70, v_u51, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u71, NULL, 'shape', 'pain_point', '||PP||{"description": "Letting agents manually chase tenants for rent by text every month. Nothing is automated.", "audience": "Letting agent \u00b7 Independent", "frequency": "Monthly", "impact": "high", "domain": "proptech"}||END||', 'approved', NOW() - INTERVAL '48 days')
  RETURNING id INTO v_p71;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p71, v_u76, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p71, v_u72, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p71, v_u65, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u72, NULL, 'done', 'pain_point', '||PP||{"description": "Property managers track maintenance requests on a whiteboard. Nothing is assigned, timed, or closed formally.", "audience": "Property manager \u00b7 50-unit portfolio", "frequency": "Weekly", "impact": "high", "domain": "proptech"}||END||', 'approved', NOW() - INTERVAL '109 days')
  RETURNING id INTO v_p72;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p72, v_u98, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p72, v_u91, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p72, v_u28, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p72, v_u17, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p72, v_u53, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u73, NULL, 'idea', 'pain_point', '||PP||{"description": "Commercial lease renewals are tracked in a spreadsheet with no alerts. Several have lapsed unnoticed.", "audience": "Head of real estate \u00b7 Corporate", "frequency": "Occasionally", "impact": "high", "domain": "proptech"}||END||', 'approved', NOW() - INTERVAL '168 days')
  RETURNING id INTO v_p73;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p73, v_u65, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p73, v_u3, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p73, v_u90, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p73, v_u26, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p73, v_u85, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p73, v_u32, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u74, NULL, 'shape', 'pain_point', '||PP||{"description": "Delivery driver routes are planned by a dispatcher calling drivers on the phone every morning.", "audience": "Operations manager \u00b7 SMB logistics", "frequency": "Daily", "impact": "high", "domain": "logistics"}||END||', 'approved', NOW() - INTERVAL '6 days')
  RETURNING id INTO v_p74;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p74, v_u7, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p74, v_u86, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p74, v_u81, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p74, v_u98, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p74, v_u90, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p74, v_u63, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p74, v_u61, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p74, v_u64, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p74, v_u16, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p74, v_u5, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p74, v_u77, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u75, NULL, 'validate', 'pain_point', '||PP||{"description": "Supplier invoices arrive by post and email in mixed formats. Someone manually enters them into the accounting system.", "audience": "Finance manager \u00b7 Manufacturer", "frequency": "Weekly", "impact": "high", "domain": "logistics"}||END||', 'approved', NOW() - INTERVAL '41 days')
  RETURNING id INTO v_p75;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p75, v_u36, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p75, v_u3, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p75, v_u8, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p75, v_u13, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p75, v_u96, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p75, v_u66, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p75, v_u19, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u76, NULL, 'validate', 'pain_point', '||PP||{"description": "Stock counts are done by walking the warehouse with a clipboard once a month. Shrinkage is discovered too late.", "audience": "Warehouse manager \u00b7 Mid-size retailer", "frequency": "Monthly", "impact": "high", "domain": "logistics"}||END||', 'approved', NOW() - INTERVAL '79 days')
  RETURNING id INTO v_p76;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p76, v_u93, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p76, v_u49, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p76, v_u69, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u77, NULL, 'done', 'pain_point', '||PP||{"description": "Event organisers track RSVPs in Eventbrite but sponsor deliverables in email. Post-event reporting is a nightmare.", "audience": "Event manager \u00b7 Independent", "frequency": "Monthly", "impact": "medium", "domain": "consumer"}||END||', 'approved', NOW() - INTERVAL '59 days')
  RETURNING id INTO v_p77;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p77, v_u9, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p77, v_u15, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p77, v_u62, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p77, v_u80, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p77, v_u17, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p77, v_u35, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u78, NULL, 'validate', 'pain_point', '||PP||{"description": "Online community managers have no way to identify disengaged members before they leave quietly.", "audience": "Community manager \u00b7 SaaS company", "frequency": "Weekly", "impact": "medium", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '108 days')
  RETURNING id INTO v_p78;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p78, v_u41, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p78, v_u40, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p78, v_u91, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p78, v_u15, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p78, v_u86, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p78, v_u60, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p78, v_u89, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p78, v_u16, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p78, v_u20, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u79, NULL, 'idea', 'pain_point', '||PP||{"description": "Meetup organisers manually email speakers, venues, and attendees from a personal Gmail. Nothing is templated.", "audience": "Community organiser \u00b7 Tech meetup", "frequency": "Monthly", "impact": "medium", "domain": "consumer"}||END||', 'approved', NOW() - INTERVAL '77 days')
  RETURNING id INTO v_p79;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p79, v_u1, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p79, v_u4, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p79, v_u62, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p79, v_u55, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p79, v_u14, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u80, NULL, 'done', 'pain_point', '||PP||{"description": "Restaurant managers create rotas in Excel and send them by WhatsApp. Staff swap shifts informally with no record.", "audience": "Restaurant manager \u00b7 Independent", "frequency": "Weekly", "impact": "high", "domain": "foodtech"}||END||', 'approved', NOW() - INTERVAL '116 days')
  RETURNING id INTO v_p80;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p80, v_u74, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p80, v_u31, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p80, v_u39, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p80, v_u68, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p80, v_u58, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p80, v_u43, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p80, v_u14, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u81, NULL, 'done', 'pain_point', '||PP||{"description": "Catering businesses quote jobs manually with no standard pricing model. Margins are unknown until after delivery.", "audience": "Catering founder \u00b7 Solo to small team", "frequency": "Monthly", "impact": "high", "domain": "foodtech"}||END||', 'approved', NOW() - INTERVAL '9 days')
  RETURNING id INTO v_p81;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p81, v_u71, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p81, v_u20, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p81, v_u22, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p81, v_u24, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p81, v_u18, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p81, v_u64, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p81, v_u68, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p81, v_u80, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p81, v_u11, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u82, NULL, 'hone', 'pain_point', '||PP||{"description": "Food suppliers send weekly price lists by PDF. Buyers update their own spreadsheets manually every week.", "audience": "Procurement manager \u00b7 Restaurant group", "frequency": "Weekly", "impact": "medium", "domain": "foodtech"}||END||', 'approved', NOW() - INTERVAL '90 days')
  RETURNING id INTO v_p82;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p82, v_u23, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p82, v_u42, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p82, v_u78, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p82, v_u7, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p82, v_u57, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p82, v_u5, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u83, NULL, 'shape', 'pain_point', '||PP||{"description": "Small business owners don''t know if they''ll be cash-flow positive next month without calling their accountant.", "audience": "SMB founder \u00b7 Bootstrapped", "frequency": "Monthly", "impact": "high", "domain": "fintech"}||END||', 'approved', NOW() - INTERVAL '95 days')
  RETURNING id INTO v_p83;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p83, v_u23, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p83, v_u14, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p83, v_u89, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p83, v_u76, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p83, v_u85, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p83, v_u5, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u84, NULL, 'validate', 'pain_point', '||PP||{"description": "Business owners get their first clue a key employee is leaving when they hand in their notice. No early warning.", "audience": "Founder \u00b7 10-person company", "frequency": "Occasionally", "impact": "high", "domain": "hr-tech"}||END||', 'approved', NOW() - INTERVAL '112 days')
  RETURNING id INTO v_p84;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p84, v_u25, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p84, v_u43, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p84, v_u10, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p84, v_u48, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p84, v_u42, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p84, v_u86, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p84, v_u8, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p84, v_u6, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p84, v_u7, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u85, NULL, 'hone', 'pain_point', '||PP||{"description": "Growing startups outgrow their tools every 6 months and spend weeks migrating data with no clear framework.", "audience": "COO \u00b7 Scale-up", "frequency": "Occasionally", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '141 days')
  RETURNING id INTO v_p85;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p85, v_u6, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p85, v_u7, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p85, v_u63, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p85, v_u21, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p85, v_u87, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p85, v_u42, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p85, v_u89, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p85, v_u86, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u86, NULL, 'hone', 'pain_point', '||PP||{"description": "Subscriptions and SaaS tools accumulate until someone does an audit at year-end. Usually \u00a320k+ wasted annually.", "audience": "CFO \u00b7 50-person startup", "frequency": "Occasionally", "impact": "high", "domain": "fintech"}||END||', 'approved', NOW() - INTERVAL '27 days')
  RETURNING id INTO v_p86;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p86, v_u94, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p86, v_u63, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p86, v_u9, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p86, v_u33, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p86, v_u88, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p86, v_u75, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p86, v_u21, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p86, v_u91, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u87, NULL, 'idea', 'pain_point', '||PP||{"description": "Admin tasks (scheduling, filing, updating records) take a founder 10 hours a week that could go to growth.", "audience": "Founder \u00b7 Early-stage", "frequency": "Daily", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '120 days')
  RETURNING id INTO v_p87;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p87, v_u66, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p87, v_u95, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p87, v_u85, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p87, v_u13, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p87, v_u27, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p87, v_u9, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p87, v_u62, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p87, v_u24, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p87, v_u63, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u88, NULL, 'validate', 'pain_point', '||PP||{"description": "AI-generated content from the team is never reviewed for accuracy before publishing. Errors erode trust.", "audience": "Content director \u00b7 Media brand", "frequency": "Weekly", "impact": "high", "domain": "media"}||END||', 'approved', NOW() - INTERVAL '139 days')
  RETURNING id INTO v_p88;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p88, v_u47, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p88, v_u18, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p88, v_u77, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p88, v_u57, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p88, v_u67, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p88, v_u71, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p88, v_u60, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p88, v_u92, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u89, NULL, 'done', 'pain_point', '||PP||{"description": "Sales and marketing define ''lead'' differently. The handoff is a constant source of conflict.", "audience": "Revenue operations \u00b7 SaaS", "frequency": "Weekly", "impact": "medium", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '135 days')
  RETURNING id INTO v_p89;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p89, v_u23, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p89, v_u56, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p89, v_u49, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p89, v_u79, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p89, v_u40, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p89, v_u92, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p89, v_u78, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p89, v_u65, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u90, NULL, 'validate', 'pain_point', '||PP||{"description": "Customer interview recordings sit in a shared Dropbox folder that nobody revisits. Insights are lost.", "audience": "Product manager \u00b7 Startup", "frequency": "Monthly", "impact": "medium", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '60 days')
  RETURNING id INTO v_p90;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p90, v_u58, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p90, v_u23, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p90, v_u63, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p90, v_u74, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p90, v_u81, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p90, v_u99, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p90, v_u3, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u91, NULL, 'idea', 'pain_point', '||PP||{"description": "Team retrospectives surface the same issues every sprint but nothing gets tracked as a follow-up action.", "audience": "Engineering lead \u00b7 Agile team", "frequency": "Weekly", "impact": "medium", "domain": "devtools"}||END||', 'approved', NOW() - INTERVAL '161 days')
  RETURNING id INTO v_p91;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p91, v_u67, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p91, v_u51, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p91, v_u30, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p91, v_u77, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p91, v_u57, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p91, v_u76, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u92, NULL, 'done', 'pain_point', '||PP||{"description": "Founders have no structured way to collect and prioritise feature requests from multiple customers.", "audience": "Founder \u00b7 Early SaaS", "frequency": "Daily", "impact": "medium", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '159 days')
  RETURNING id INTO v_p92;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p92, v_u62, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p92, v_u21, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p92, v_u24, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u93, NULL, 'hone', 'pain_point', '||PP||{"description": "Investor updates are written from scratch every quarter with no template or running log of progress.", "audience": "Founder \u00b7 Seed-stage startup", "frequency": "Monthly", "impact": "medium", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '5 days')
  RETURNING id INTO v_p93;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p93, v_u43, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p93, v_u30, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p93, v_u100, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p93, v_u60, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p93, v_u55, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p93, v_u50, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p93, v_u22, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p93, v_u80, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p93, v_u84, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p93, v_u19, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p93, v_u64, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u94, NULL, 'shape', 'pain_point', '||PP||{"description": "Remote employees feel disconnected from company decisions but there''s no async mechanism to include them.", "audience": "Head of people \u00b7 Remote-first", "frequency": "Weekly", "impact": "medium", "domain": "hr-tech"}||END||', 'approved', NOW() - INTERVAL '103 days')
  RETURNING id INTO v_p94;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p94, v_u84, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p94, v_u76, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p94, v_u2, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p94, v_u75, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p94, v_u82, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u95, NULL, 'shape', 'pain_point', '||PP||{"description": "Startup financial models are built in Excel and break every time someone changes a cell reference.", "audience": "Founder \u00b7 Pre-seed", "frequency": "Monthly", "impact": "high", "domain": "fintech"}||END||', 'approved', NOW() - INTERVAL '141 days')
  RETURNING id INTO v_p95;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p95, v_u38, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p95, v_u100, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p95, v_u34, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p95, v_u66, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p95, v_u46, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p95, v_u31, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p95, v_u64, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p95, v_u9, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p95, v_u8, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p95, v_u26, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p95, v_u58, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u96, NULL, 'hone', 'pain_point', '||PP||{"description": "Vendor contracts are renewed automatically because nobody set a review reminder 90 days in advance.", "audience": "COO \u00b7 30-person company", "frequency": "Monthly", "impact": "medium", "domain": "legaltech"}||END||', 'approved', NOW() - INTERVAL '177 days')
  RETURNING id INTO v_p96;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p96, v_u98, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p96, v_u65, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p96, v_u5, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p96, v_u31, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p96, v_u19, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p96, v_u7, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u97, NULL, 'validate', 'pain_point', '||PP||{"description": "B2B SaaS companies have no structured process to identify expansion opportunities within existing accounts.", "audience": "Customer success manager \u00b7 SaaS", "frequency": "Monthly", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '117 days')
  RETURNING id INTO v_p97;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p97, v_u11, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p97, v_u54, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p97, v_u70, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p97, v_u56, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u98, NULL, 'idea', 'pain_point', '||PP||{"description": "Startup ops teams re-answer the same 10 questions from new hires every month because the FAQ doc is never maintained.", "audience": "Head of people \u00b7 Early-stage startup", "frequency": "Weekly", "impact": "medium", "domain": "hr-tech"}||END||', 'approved', NOW() - INTERVAL '47 days')
  RETURNING id INTO v_p98;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p98, v_u78, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p98, v_u36, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p98, v_u93, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p98, v_u45, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p98, v_u16, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p98, v_u42, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p98, v_u46, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p98, v_u72, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p98, v_u20, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p98, v_u84, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p98, v_u47, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u99, NULL, 'validate', 'pain_point', '||PP||{"description": "Agencies have no standard way to hand off a project to a new account manager when someone leaves mid-engagement.", "audience": "Operations director \u00b7 Agency", "frequency": "Monthly", "impact": "high", "domain": "b2b-saas"}||END||', 'approved', NOW() - INTERVAL '6 days')
  RETURNING id INTO v_p99;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p99, v_u76, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p99, v_u88, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p99, v_u97, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p99, v_u63, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p99, v_u10, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p99, v_u55, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p99, v_u12, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p99, v_u93, 'ask') ON CONFLICT DO NOTHING;

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)
  VALUES (v_u100, NULL, 'validate', 'pain_point', '||PP||{"description": "SaaS founders can''t tell which support issues are bugs vs user errors vs documentation gaps without manual triage.", "audience": "Founder \u00b7 Self-funded SaaS", "frequency": "Daily", "impact": "medium", "domain": "devtools"}||END||', 'approved', NOW() - INTERVAL '130 days')
  RETURNING id INTO v_p100;

  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p100, v_u71, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p100, v_u65, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p100, v_u87, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p100, v_u14, 'encourage') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p100, v_u15, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p100, v_u32, 'ask') ON CONFLICT DO NOTHING;
  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p100, v_u2, 'ask') ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Pain points seed complete: 100 pain points with reactions inserted.';
END $PP$;
