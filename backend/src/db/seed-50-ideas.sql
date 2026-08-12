-- ============================================================
-- MVP Club Seed — 50 Startup Ideas across stages and sectors
--
-- Stages: idea(10) · hone(10) · validate(15) · shape(10) · done(5)
-- Sectors: B2B SaaS, consumer, marketplace, fintech, healthtech,
--          edtech, cleantech, proptech, devtools, foodtech, legaltech
--
-- All accounts use password: password123
--
-- Run:
--   PGPASSWORD=mvpclub_secret psql -h localhost -p 5433 \
--     -U mvpclub -d mvpclub -f "backend/src/db/seed-50-ideas.sql"
-- ============================================================

DO $$
DECLARE
  v_pw TEXT := '$2a$12$undmfpnOGUw4AGMvv3NWguUGIfWaODarqgnG/oMU5nK4bGyzcw.di';

  -- user UUIDs
  v_u1  UUID; v_u2  UUID; v_u3  UUID; v_u4  UUID; v_u5  UUID;
  v_u6  UUID; v_u7  UUID; v_u8  UUID; v_u9  UUID; v_u10 UUID;
  v_u11 UUID; v_u12 UUID; v_u13 UUID; v_u14 UUID; v_u15 UUID;
  v_u16 UUID; v_u17 UUID; v_u18 UUID; v_u19 UUID; v_u20 UUID;
  v_u21 UUID; v_u22 UUID; v_u23 UUID; v_u24 UUID; v_u25 UUID;
  v_u26 UUID; v_u27 UUID; v_u28 UUID; v_u29 UUID; v_u30 UUID;
  v_u31 UUID; v_u32 UUID; v_u33 UUID; v_u34 UUID; v_u35 UUID;
  v_u36 UUID; v_u37 UUID; v_u38 UUID; v_u39 UUID; v_u40 UUID;
  v_u41 UUID; v_u42 UUID; v_u43 UUID; v_u44 UUID; v_u45 UUID;
  v_u46 UUID; v_u47 UUID; v_u48 UUID; v_u49 UUID; v_u50 UUID;

  -- idea UUIDs
  v_i1  UUID; v_i2  UUID; v_i3  UUID; v_i4  UUID; v_i5  UUID;
  v_i6  UUID; v_i7  UUID; v_i8  UUID; v_i9  UUID; v_i10 UUID;
  v_i11 UUID; v_i12 UUID; v_i13 UUID; v_i14 UUID; v_i15 UUID;
  v_i16 UUID; v_i17 UUID; v_i18 UUID; v_i19 UUID; v_i20 UUID;
  v_i21 UUID; v_i22 UUID; v_i23 UUID; v_i24 UUID; v_i25 UUID;
  v_i26 UUID; v_i27 UUID; v_i28 UUID; v_i29 UUID; v_i30 UUID;
  v_i31 UUID; v_i32 UUID; v_i33 UUID; v_i34 UUID; v_i35 UUID;
  v_i36 UUID; v_i37 UUID; v_i38 UUID; v_i39 UUID; v_i40 UUID;
  v_i41 UUID; v_i42 UUID; v_i43 UUID; v_i44 UUID; v_i45 UUID;
  v_i46 UUID; v_i47 UUID; v_i48 UUID; v_i49 UUID; v_i50 UUID;

BEGIN

  -- ── 1. Users ─────────────────────────────────────────────────────────────

  -- IDEA STAGE (1–10)
  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('aisha.m@seed50.dev','Aisha Mwangi',v_pw,'idea',TRUE,'AM',ARRAY['finding_users'])
  ON CONFLICT (email) DO UPDATE SET current_stage='idea', updated_at=NOW();
  SELECT id INTO v_u1 FROM users WHERE email='aisha.m@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('carlos.v@seed50.dev','Carlos Vega',v_pw,'idea',TRUE,'CV',ARRAY['validation'])
  ON CONFLICT (email) DO UPDATE SET current_stage='idea', updated_at=NOW();
  SELECT id INTO v_u2 FROM users WHERE email='carlos.v@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('priya.n@seed50.dev','Priya Nair',v_pw,'idea',TRUE,'PN',ARRAY['pricing'])
  ON CONFLICT (email) DO UPDATE SET current_stage='idea', updated_at=NOW();
  SELECT id INTO v_u3 FROM users WHERE email='priya.n@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('james.o@seed50.dev','James Okafor',v_pw,'idea',TRUE,'JO',ARRAY['technical'])
  ON CONFLICT (email) DO UPDATE SET current_stage='idea', updated_at=NOW();
  SELECT id INTO v_u4 FROM users WHERE email='james.o@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('mei.l@seed50.dev','Mei Lin',v_pw,'idea',TRUE,'ML',ARRAY['finding_users'])
  ON CONFLICT (email) DO UPDATE SET current_stage='idea', updated_at=NOW();
  SELECT id INTO v_u5 FROM users WHERE email='mei.l@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('felix.b@seed50.dev','Felix Brandt',v_pw,'idea',TRUE,'FB',ARRAY['mvp_scope'])
  ON CONFLICT (email) DO UPDATE SET current_stage='idea', updated_at=NOW();
  SELECT id INTO v_u6 FROM users WHERE email='felix.b@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('yuki.t@seed50.dev','Yuki Tanaka',v_pw,'idea',TRUE,'YT',ARRAY['validation'])
  ON CONFLICT (email) DO UPDATE SET current_stage='idea', updated_at=NOW();
  SELECT id INTO v_u7 FROM users WHERE email='yuki.t@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('sarah.k@seed50.dev','Sarah Kowalski',v_pw,'idea',TRUE,'SK',ARRAY['pricing'])
  ON CONFLICT (email) DO UPDATE SET current_stage='idea', updated_at=NOW();
  SELECT id INTO v_u8 FROM users WHERE email='sarah.k@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('david.r@seed50.dev','David Reyes',v_pw,'idea',TRUE,'DR',ARRAY['finding_users'])
  ON CONFLICT (email) DO UPDATE SET current_stage='idea', updated_at=NOW();
  SELECT id INTO v_u9 FROM users WHERE email='david.r@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('amara.s@seed50.dev','Amara Sow',v_pw,'idea',TRUE,'AS',ARRAY['technical'])
  ON CONFLICT (email) DO UPDATE SET current_stage='idea', updated_at=NOW();
  SELECT id INTO v_u10 FROM users WHERE email='amara.s@seed50.dev';

  -- HONE STAGE (11–20)
  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('noah.p@seed50.dev','Noah Park',v_pw,'hone',TRUE,'NP',ARRAY['finding_users','validation'])
  ON CONFLICT (email) DO UPDATE SET current_stage='hone', updated_at=NOW();
  SELECT id INTO v_u11 FROM users WHERE email='noah.p@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('lena.f@seed50.dev','Lena Fischer',v_pw,'hone',TRUE,'LF',ARRAY['pricing','mvp_scope'])
  ON CONFLICT (email) DO UPDATE SET current_stage='hone', updated_at=NOW();
  SELECT id INTO v_u12 FROM users WHERE email='lena.f@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('omar.h@seed50.dev','Omar Hassan',v_pw,'hone',TRUE,'OH',ARRAY['technical'])
  ON CONFLICT (email) DO UPDATE SET current_stage='hone', updated_at=NOW();
  SELECT id INTO v_u13 FROM users WHERE email='omar.h@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('isabella.c@seed50.dev','Isabella Costa',v_pw,'hone',TRUE,'IC',ARRAY['finding_users'])
  ON CONFLICT (email) DO UPDATE SET current_stage='hone', updated_at=NOW();
  SELECT id INTO v_u14 FROM users WHERE email='isabella.c@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('raj.m@seed50.dev','Raj Mehta',v_pw,'hone',TRUE,'RM',ARRAY['pricing'])
  ON CONFLICT (email) DO UPDATE SET current_stage='hone', updated_at=NOW();
  SELECT id INTO v_u15 FROM users WHERE email='raj.m@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('chloe.d@seed50.dev','Chloe Dubois',v_pw,'hone',TRUE,'CD',ARRAY['validation','finding_users'])
  ON CONFLICT (email) DO UPDATE SET current_stage='hone', updated_at=NOW();
  SELECT id INTO v_u16 FROM users WHERE email='chloe.d@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('kwame.a@seed50.dev','Kwame Asante',v_pw,'hone',TRUE,'KA',ARRAY['technical','mvp_scope'])
  ON CONFLICT (email) DO UPDATE SET current_stage='hone', updated_at=NOW();
  SELECT id INTO v_u17 FROM users WHERE email='kwame.a@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('nina.v@seed50.dev','Nina Volkov',v_pw,'hone',TRUE,'NV',ARRAY['pricing'])
  ON CONFLICT (email) DO UPDATE SET current_stage='hone', updated_at=NOW();
  SELECT id INTO v_u18 FROM users WHERE email='nina.v@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('lucas.a@seed50.dev','Lucas Andrade',v_pw,'hone',TRUE,'LA',ARRAY['finding_users'])
  ON CONFLICT (email) DO UPDATE SET current_stage='hone', updated_at=NOW();
  SELECT id INTO v_u19 FROM users WHERE email='lucas.a@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('fatima.z@seed50.dev','Fatima Zahra',v_pw,'hone',TRUE,'FZ',ARRAY['validation'])
  ON CONFLICT (email) DO UPDATE SET current_stage='hone', updated_at=NOW();
  SELECT id INTO v_u20 FROM users WHERE email='fatima.z@seed50.dev';

  -- VALIDATE STAGE (21–35)
  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('alex.j@seed50.dev','Alex Jensen',v_pw,'validate',TRUE,'AJ',ARRAY['validation','finding_users'])
  ON CONFLICT (email) DO UPDATE SET current_stage='validate', updated_at=NOW();
  SELECT id INTO v_u21 FROM users WHERE email='alex.j@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('mia.c@seed50.dev','Mia Chen',v_pw,'validate',TRUE,'MC',ARRAY['pricing'])
  ON CONFLICT (email) DO UPDATE SET current_stage='validate', updated_at=NOW();
  SELECT id INTO v_u22 FROM users WHERE email='mia.c@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('tom.w@seed50.dev','Tom Walsh',v_pw,'validate',TRUE,'TW',ARRAY['finding_users'])
  ON CONFLICT (email) DO UPDATE SET current_stage='validate', updated_at=NOW();
  SELECT id INTO v_u23 FROM users WHERE email='tom.w@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('zara.i@seed50.dev','Zara Ibrahim',v_pw,'validate',TRUE,'ZI',ARRAY['validation'])
  ON CONFLICT (email) DO UPDATE SET current_stage='validate', updated_at=NOW();
  SELECT id INTO v_u24 FROM users WHERE email='zara.i@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('ben.t@seed50.dev','Ben Thornton',v_pw,'validate',TRUE,'BT',ARRAY['technical','mvp_scope'])
  ON CONFLICT (email) DO UPDATE SET current_stage='validate', updated_at=NOW();
  SELECT id INTO v_u25 FROM users WHERE email='ben.t@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('elena.r@seed50.dev','Elena Rossi',v_pw,'validate',TRUE,'ER',ARRAY['pricing','finding_users'])
  ON CONFLICT (email) DO UPDATE SET current_stage='validate', updated_at=NOW();
  SELECT id INTO v_u26 FROM users WHERE email='elena.r@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('kai.n@seed50.dev','Kai Nakamura',v_pw,'validate',TRUE,'KN',ARRAY['validation'])
  ON CONFLICT (email) DO UPDATE SET current_stage='validate', updated_at=NOW();
  SELECT id INTO v_u27 FROM users WHERE email='kai.n@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('sofia.l@seed50.dev','Sofia Lopez',v_pw,'validate',TRUE,'SL',ARRAY['finding_users'])
  ON CONFLICT (email) DO UPDATE SET current_stage='validate', updated_at=NOW();
  SELECT id INTO v_u28 FROM users WHERE email='sofia.l@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('hans.m@seed50.dev','Hans Mueller',v_pw,'validate',TRUE,'HM',ARRAY['pricing'])
  ON CONFLICT (email) DO UPDATE SET current_stage='validate', updated_at=NOW();
  SELECT id INTO v_u29 FROM users WHERE email='hans.m@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('nia.b@seed50.dev','Nia Brown',v_pw,'validate',TRUE,'NB',ARRAY['validation','technical'])
  ON CONFLICT (email) DO UPDATE SET current_stage='validate', updated_at=NOW();
  SELECT id INTO v_u30 FROM users WHERE email='nia.b@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('ravi.s@seed50.dev','Ravi Sharma',v_pw,'validate',TRUE,'RS',ARRAY['finding_users'])
  ON CONFLICT (email) DO UPDATE SET current_stage='validate', updated_at=NOW();
  SELECT id INTO v_u31 FROM users WHERE email='ravi.s@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('camille.b@seed50.dev','Camille Bernard',v_pw,'validate',TRUE,'CB',ARRAY['pricing'])
  ON CONFLICT (email) DO UPDATE SET current_stage='validate', updated_at=NOW();
  SELECT id INTO v_u32 FROM users WHERE email='camille.b@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('ethan.g@seed50.dev','Ethan Gray',v_pw,'validate',TRUE,'EG',ARRAY['mvp_scope'])
  ON CONFLICT (email) DO UPDATE SET current_stage='validate', updated_at=NOW();
  SELECT id INTO v_u33 FROM users WHERE email='ethan.g@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('ada.o@seed50.dev','Ada Osei',v_pw,'validate',TRUE,'AO',ARRAY['validation','finding_users'])
  ON CONFLICT (email) DO UPDATE SET current_stage='validate', updated_at=NOW();
  SELECT id INTO v_u34 FROM users WHERE email='ada.o@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('marco.f@seed50.dev','Marco Ferrari',v_pw,'validate',TRUE,'MF',ARRAY['pricing'])
  ON CONFLICT (email) DO UPDATE SET current_stage='validate', updated_at=NOW();
  SELECT id INTO v_u35 FROM users WHERE email='marco.f@seed50.dev';

  -- SHAPE STAGE (36–45)
  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('liam.o@seed50.dev','Liam O''Brien',v_pw,'shape',TRUE,'LO',ARRAY['technical','mvp_scope'])
  ON CONFLICT (email) DO UPDATE SET current_stage='shape', updated_at=NOW();
  SELECT id INTO v_u36 FROM users WHERE email='liam.o@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('hana.k@seed50.dev','Hana Kim',v_pw,'shape',TRUE,'HK',ARRAY['finding_users','pricing'])
  ON CONFLICT (email) DO UPDATE SET current_stage='shape', updated_at=NOW();
  SELECT id INTO v_u37 FROM users WHERE email='hana.k@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('pierre.m@seed50.dev','Pierre Martin',v_pw,'shape',TRUE,'PM',ARRAY['validation'])
  ON CONFLICT (email) DO UPDATE SET current_stage='shape', updated_at=NOW();
  SELECT id INTO v_u38 FROM users WHERE email='pierre.m@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('grace.n@seed50.dev','Grace Nguyen',v_pw,'shape',TRUE,'GN',ARRAY['technical'])
  ON CONFLICT (email) DO UPDATE SET current_stage='shape', updated_at=NOW();
  SELECT id INTO v_u39 FROM users WHERE email='grace.n@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('aaron.l@seed50.dev','Aaron Levy',v_pw,'shape',TRUE,'AL',ARRAY['mvp_scope','pricing'])
  ON CONFLICT (email) DO UPDATE SET current_stage='shape', updated_at=NOW();
  SELECT id INTO v_u40 FROM users WHERE email='aaron.l@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('diana.p@seed50.dev','Diana Petrov',v_pw,'shape',TRUE,'DP',ARRAY['finding_users'])
  ON CONFLICT (email) DO UPDATE SET current_stage='shape', updated_at=NOW();
  SELECT id INTO v_u41 FROM users WHERE email='diana.p@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('sam.a@seed50.dev','Sam Adeyemi',v_pw,'shape',TRUE,'SA',ARRAY['technical','mvp_scope'])
  ON CONFLICT (email) DO UPDATE SET current_stage='shape', updated_at=NOW();
  SELECT id INTO v_u42 FROM users WHERE email='sam.a@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('julia.w@seed50.dev','Julia Weber',v_pw,'shape',TRUE,'JW',ARRAY['pricing'])
  ON CONFLICT (email) DO UPDATE SET current_stage='shape', updated_at=NOW();
  SELECT id INTO v_u43 FROM users WHERE email='julia.w@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('mike.t@seed50.dev','Mike Tran',v_pw,'shape',TRUE,'MT',ARRAY['finding_users','validation'])
  ON CONFLICT (email) DO UPDATE SET current_stage='shape', updated_at=NOW();
  SELECT id INTO v_u44 FROM users WHERE email='mike.t@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('ines.c@seed50.dev','Inês Carvalho',v_pw,'shape',TRUE,'IC',ARRAY['mvp_scope'])
  ON CONFLICT (email) DO UPDATE SET current_stage='shape', updated_at=NOW();
  SELECT id INTO v_u45 FROM users WHERE email='ines.c@seed50.dev';

  -- DONE STAGE (46–50)
  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('jake.h@seed50.dev','Jake Harrison',v_pw,'done',TRUE,'JH',ARRAY['finding_users'])
  ON CONFLICT (email) DO UPDATE SET current_stage='done', updated_at=NOW();
  SELECT id INTO v_u46 FROM users WHERE email='jake.h@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('yemi.a@seed50.dev','Yemi Adeleke',v_pw,'done',TRUE,'YA',ARRAY['pricing'])
  ON CONFLICT (email) DO UPDATE SET current_stage='done', updated_at=NOW();
  SELECT id INTO v_u47 FROM users WHERE email='yemi.a@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('anna.b@seed50.dev','Anna Berg',v_pw,'done',TRUE,'AB',ARRAY['validation'])
  ON CONFLICT (email) DO UPDATE SET current_stage='done', updated_at=NOW();
  SELECT id INTO v_u48 FROM users WHERE email='anna.b@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('leo.c@seed50.dev','Leo Chang',v_pw,'done',TRUE,'LC',ARRAY['technical'])
  ON CONFLICT (email) DO UPDATE SET current_stage='done', updated_at=NOW();
  SELECT id INTO v_u49 FROM users WHERE email='leo.c@seed50.dev';

  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types)
  VALUES ('sara.m@seed50.dev','Sara Madani',v_pw,'done',TRUE,'SM',ARRAY['mvp_scope'])
  ON CONFLICT (email) DO UPDATE SET current_stage='done', updated_at=NOW();
  SELECT id INTO v_u50 FROM users WHERE email='sara.m@seed50.dev';

  -- ── 2. Clean up existing data ──────────────────────────────────────────────

  DELETE FROM validation_contacts WHERE user_id IN (
    v_u1,v_u2,v_u3,v_u4,v_u5,v_u6,v_u7,v_u8,v_u9,v_u10,
    v_u11,v_u12,v_u13,v_u14,v_u15,v_u16,v_u17,v_u18,v_u19,v_u20,
    v_u21,v_u22,v_u23,v_u24,v_u25,v_u26,v_u27,v_u28,v_u29,v_u30,
    v_u31,v_u32,v_u33,v_u34,v_u35,v_u36,v_u37,v_u38,v_u39,v_u40,
    v_u41,v_u42,v_u43,v_u44,v_u45,v_u46,v_u47,v_u48,v_u49,v_u50
  );
  DELETE FROM stage_entries WHERE user_id IN (
    v_u1,v_u2,v_u3,v_u4,v_u5,v_u6,v_u7,v_u8,v_u9,v_u10,
    v_u11,v_u12,v_u13,v_u14,v_u15,v_u16,v_u17,v_u18,v_u19,v_u20,
    v_u21,v_u22,v_u23,v_u24,v_u25,v_u26,v_u27,v_u28,v_u29,v_u30,
    v_u31,v_u32,v_u33,v_u34,v_u35,v_u36,v_u37,v_u38,v_u39,v_u40,
    v_u41,v_u42,v_u43,v_u44,v_u45,v_u46,v_u47,v_u48,v_u49,v_u50
  );
  DELETE FROM community_posts WHERE content LIKE '%[SEED50]%';
  DELETE FROM ideas WHERE user_id IN (
    v_u1,v_u2,v_u3,v_u4,v_u5,v_u6,v_u7,v_u8,v_u9,v_u10,
    v_u11,v_u12,v_u13,v_u14,v_u15,v_u16,v_u17,v_u18,v_u19,v_u20,
    v_u21,v_u22,v_u23,v_u24,v_u25,v_u26,v_u27,v_u28,v_u29,v_u30,
    v_u31,v_u32,v_u33,v_u34,v_u35,v_u36,v_u37,v_u38,v_u39,v_u40,
    v_u41,v_u42,v_u43,v_u44,v_u45,v_u46,v_u47,v_u48,v_u49,v_u50
  );

  -- ── 3. Ideas ───────────────────────────────────────────────────────────────

  -- IDEA STAGE
  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u1,'AI-powered personal finance coach for Gen Z',
   'A conversational app that reads your bank transactions and gives blunt, jargon-free money advice — no spreadsheets, no shame.','idea',TRUE)
  RETURNING id INTO v_i1;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u2,'On-demand mobile car wash',
   'Book a waterless car wash that comes to your parking spot at work or home — done in 20 minutes while you''re inside.','idea',TRUE)
  RETURNING id INTO v_i2;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u3,'Legal contract review tool for freelancers',
   'Upload any client contract and get plain-English explanations of risky clauses plus suggested edits — in under 60 seconds.','idea',TRUE)
  RETURNING id INTO v_i3;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u4,'Anonymous peer support app for teenagers',
   'A safe space for teens to share what they''re going through and receive empathetic, moderated replies from peers who''ve been there.','idea',TRUE)
  RETURNING id INTO v_i4;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u5,'Hyperlocal grocery co-op marketplace',
   'Neighbours pool their grocery orders to unlock wholesale prices and share one delivery slot — everyone saves, nobody shops alone.','idea',TRUE)
  RETURNING id INTO v_i5;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u6,'Carbon footprint tracker for SMEs',
   'Plug into your accounting software and automatically calculate your business carbon footprint, with a clear reduction roadmap.','idea',TRUE)
  RETURNING id INTO v_i6;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u7,'Sleep optimisation coaching via wearable data',
   'Connect your Oura or Whoop ring and get a weekly 5-minute audio coaching session based on your actual sleep patterns.','idea',TRUE)
  RETURNING id INTO v_i7;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u8,'B2B procurement marketplace for African manufacturers',
   'A verified catalogue of African-made components and materials for international buyers — cutting out middlemen and reducing lead times.','idea',TRUE)
  RETURNING id INTO v_i8;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u9,'No-code internal tool builder for ops teams',
   'Drag-and-drop builder to create internal dashboards, approval workflows, and data forms without writing a line of code.','idea',TRUE)
  RETURNING id INTO v_i9;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u10,'Personalised vitamin subscription based on blood tests',
   'Order a home blood test, get results in 48 hours, and receive a monthly pack of exactly the supplements your body actually needs.','idea',TRUE)
  RETURNING id INTO v_i10;

  -- HONE STAGE
  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u11,'AI meeting notes and action tracker',
   'Joins your calls silently, transcribes in real time, and sends everyone a clean summary with named action items — before the meeting even ends.','hone',TRUE)
  RETURNING id INTO v_i11;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u12,'Peer-to-peer language exchange with structured lessons',
   'Match with a native speaker who wants to learn your language — each session is 30 minutes each way with guided conversation prompts.','hone',TRUE)
  RETURNING id INTO v_i12;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u13,'Construction site safety monitoring via computer vision',
   'Mount a camera on site and get real-time alerts when workers enter danger zones or aren''t wearing required PPE.','hone',TRUE)
  RETURNING id INTO v_i13;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u14,'Subscription recipe box for allergy-safe families',
   'Weekly meal kits designed entirely around your family''s specific allergen profile — everything pre-checked, nothing to worry about.','hone',TRUE)
  RETURNING id INTO v_i14;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u15,'Real estate data API for emerging markets',
   'Aggregated, normalised property price and rental yield data for cities in South/Southeast Asia — via a simple REST API.','hone',TRUE)
  RETURNING id INTO v_i15;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u16,'Micro-pension savings app for gig workers',
   'Auto-rounds up every payment received and sweeps the difference into a pension pot — saving for retirement one job at a time.','hone',TRUE)
  RETURNING id INTO v_i16;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u17,'Developer docs search engine powered by semantic AI',
   'Search across all major dev docs at once with natural language — find the right answer without reading five Stack Overflow threads.','hone',TRUE)
  RETURNING id INTO v_i17;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u18,'Secondhand luxury goods authentication service',
   'Send photos of any luxury item and receive a verified certificate of authenticity within 24 hours from ex-brand specialists.','hone',TRUE)
  RETURNING id INTO v_i18;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u19,'Mental health journaling app with therapist escalation',
   'Daily check-in prompts with mood tracking — if patterns indicate distress, your linked therapist is notified immediately.','hone',TRUE)
  RETURNING id INTO v_i19;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u20,'Vertical farm management SaaS',
   'IoT sensor dashboard plus automated grow-cycle scheduling for indoor vertical farms — reduce waste and maximise yield per m².','hone',TRUE)
  RETURNING id INTO v_i20;

  -- VALIDATE STAGE
  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u21,'B2B spend analytics for finance teams',
   'Connect to Xero or QuickBooks and automatically surface anomalous spend, duplicate vendors, and savings opportunities in a weekly digest.','validate',TRUE)
  RETURNING id INTO v_i21;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u22,'On-demand personal styling via video call',
   'Book a 30-minute video session with a certified stylist who shops your wardrobe virtually and tells you exactly what to buy next.','validate',TRUE)
  RETURNING id INTO v_i22;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u23,'EV fleet management software for logistics SMEs',
   'Route optimisation, charge scheduling, and driver behaviour scoring for small fleets of electric delivery vehicles.','validate',TRUE)
  RETURNING id INTO v_i23;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u24,'Freelance invoice financing marketplace',
   'Upload unpaid invoices and get cash advance within 24 hours — repaid automatically when your client pays.','validate',TRUE)
  RETURNING id INTO v_i24;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u25,'AI code review tool for open source maintainers',
   'Automatically reviews incoming PRs for security issues, breaking changes, and style violations — and posts a structured comment.','validate',TRUE)
  RETURNING id INTO v_i25;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u26,'Community-owned renewable energy co-op platform',
   'Tools for local communities to pool investment, buy solar panels, and share the generated income — renewable energy as a co-op.','validate',TRUE)
  RETURNING id INTO v_i26;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u27,'Pet health records and vet communication app',
   'One place for all your pet''s health history, vaccination reminders, and direct messaging with your vet practice.','validate',TRUE)
  RETURNING id INTO v_i27;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u28,'Neighbourhood skills exchange network',
   'A local platform where neighbours trade skills — plumbing for piano lessons, photography for gardening help.','validate',TRUE)
  RETURNING id INTO v_i28;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u29,'White-label loyalty programme for independent retailers',
   'Plug-in loyalty card system that independent shops can brand and configure in an hour — no technical knowledge needed.','validate',TRUE)
  RETURNING id INTO v_i29;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u30,'Remote physiotherapy via video and motion tracking',
   'Physio sessions over video with AI motion analysis that flags when patients are performing exercises incorrectly in real time.','validate',TRUE)
  RETURNING id INTO v_i30;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u31,'Childcare matching platform for working parents',
   'Vet and match parents with DBS-checked local childminders, with instant booking, reviews, and automatic payment.','validate',TRUE)
  RETURNING id INTO v_i31;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u32,'SaaS tool for restaurant menu profitability analysis',
   'Plug in your POS data and see which dishes are actually profitable after food cost, prep time, and waste — and what to cut.','validate',TRUE)
  RETURNING id INTO v_i32;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u33,'Gamified sustainability challenges for corporate teams',
   'Monthly sustainability challenges for office teams — track collective impact, compete with other companies, and earn badges.','validate',TRUE)
  RETURNING id INTO v_i33;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u34,'Micro-learning app for tradespeople',
   'Short video lessons on new building regulations, materials, and techniques — designed to be watched in a work van, not a classroom.','validate',TRUE)
  RETURNING id INTO v_i34;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u35,'API aggregator for African payment gateways',
   'One API that routes payments across 20+ African payment providers — automatic fallback, currency conversion, and reconciliation.','validate',TRUE)
  RETURNING id INTO v_i35;

  -- SHAPE STAGE
  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u36,'Automated grant writing assistant for charities',
   'Enter your charity''s mission and past work, and get a first draft of grant applications tailored to specific funders in minutes.','shape',TRUE)
  RETURNING id INTO v_i36;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u37,'Marketplace for short-term commercial kitchen rental',
   'Book professional kitchen space by the hour for catering, pop-up restaurants, and food product testing.','shape',TRUE)
  RETURNING id INTO v_i37;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u38,'AI-powered contract lifecycle management for startups',
   'Create, negotiate, sign, and track contracts with automatic renewal reminders and clause risk scoring.','shape',TRUE)
  RETURNING id INTO v_i38;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u39,'Biodegradable packaging marketplace for e-commerce brands',
   'Browse, compare, and order certified sustainable packaging from vetted suppliers — filtered by size, material, and MOQ.','shape',TRUE)
  RETURNING id INTO v_i39;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u40,'Subscription platform for independent music producers',
   'Fans pay a monthly fee to access unreleased stems, beat packs, and monthly production masterclasses from their favourite producers.','shape',TRUE)
  RETURNING id INTO v_i40;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u41,'Home energy management system for renters',
   'A plug-in device and app that monitors and controls all smart devices in a rented flat — cutting bills without needing landlord permission.','shape',TRUE)
  RETURNING id INTO v_i41;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u42,'Interview coaching platform powered by AI feedback',
   'Practice technical or behavioural interviews with an AI interviewer that gives scored, specific feedback on every answer.','shape',TRUE)
  RETURNING id INTO v_i42;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u43,'Telemedicine platform for rural maternal health',
   'Video consultations with midwives and OBs for expectant mothers in areas more than 30 minutes from the nearest hospital.','shape',TRUE)
  RETURNING id INTO v_i43;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u44,'SaaS for managing short-term rental properties',
   'Unified inbox, pricing automation, and maintenance management for hosts managing 2–20 Airbnb and Booking.com properties.','shape',TRUE)
  RETURNING id INTO v_i44;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u45,'AI nutritionist for sports performance',
   'Athletes log meals and training sessions; the AI adjusts macros and micronutrients in real time based on performance data.','shape',TRUE)
  RETURNING id INTO v_i45;

  -- DONE STAGE
  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u46,'E-signature tool built for sole traders',
   'Send a document, get it signed, store it — no accounts needed for signers, no monthly fee for under 10 docs.','done',TRUE)
  RETURNING id INTO v_i46;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u47,'Micro-SaaS for podcast show notes automation',
   'Upload your audio file and get SEO-optimised show notes, timestamps, and a transcript in 3 minutes.','done',TRUE)
  RETURNING id INTO v_i47;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u48,'Fleet tyre monitoring service for hauliers',
   'IoT sensors on every tyre send real-time pressure and temperature data — alerting drivers before a blowout happens.','done',TRUE)
  RETURNING id INTO v_i48;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u49,'SaaS analytics for Shopify subscription brands',
   'Churn prediction, cohort analysis, and LTV modelling built specifically for Shopify merchants using subscription billing.','done',TRUE)
  RETURNING id INTO v_i49;

  INSERT INTO ideas (user_id, name, description, stage, is_active) VALUES
  (v_u50,'Remote notarisation platform for property transactions',
   'Complete notarisation of property documents via video call with a certified notary — approved in 12 EU jurisdictions.','done',TRUE)
  RETURNING id INTO v_i50;

  -- ── 4. Stage entries — HONE (users 11–20) ─────────────────────────────────

  INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content, completed_at) VALUES

  -- u11 · AI meeting notes
  (v_u11,v_i11,'hone','what',
   'an AI assistant that silently joins any video call and delivers structured meeting notes with named action items to all attendees before the call ends',
   NOW()-INTERVAL '12 days'),
  (v_u11,v_i11,'hone','who',
   'busy managers and team leads in companies of 10–200 people who spend 4+ hours per day in meetings and lose track of decisions and follow-ups',
   NOW()-INTERVAL '10 days'),
  (v_u11,v_i11,'hone','problem',
   'no-one knows who agreed to do what after a meeting — notes are patchy, incomplete, or never written at all, and action items get lost in Slack or email',
   NOW()-INTERVAL '8 days'),
  (v_u11,v_i11,'hone','outcome',
   'every attendee receives a clean summary and their own action items in their inbox within 2 minutes of the call ending — zero manual effort',
   NOW()-INTERVAL '6 days'),

  -- u12 · Language exchange
  (v_u12,v_i12,'hone','what',
   'a structured peer language exchange platform that matches you with a native speaker of your target language who wants to learn yours — each 60-min session is split equally',
   NOW()-INTERVAL '15 days'),
  (v_u12,v_i12,'hone','who',
   'adults aged 22–40 learning a language for career progression or relocation who find apps like Duolingo too gamified and tutors too expensive',
   NOW()-INTERVAL '13 days'),
  (v_u12,v_i12,'hone','problem',
   'language apps don''t give you real conversation practice, and finding a language partner yourself is hit-and-miss — most exchanges die after one or two sessions',
   NOW()-INTERVAL '11 days'),
  (v_u12,v_i12,'hone','outcome',
   'a committed language partner matched on schedule, level, and goals — with structured prompts so the session is productive even if you''re a beginner',
   NOW()-INTERVAL '9 days'),

  -- u13 · Construction safety
  (v_u13,v_i13,'hone','what',
   'a computer vision SaaS that monitors construction site cameras in real time and triggers instant alerts when PPE violations or zone breaches are detected',
   NOW()-INTERVAL '20 days'),
  (v_u13,v_i13,'hone','who',
   'health and safety managers at mid-size construction firms (50–500 workers) who are liable for compliance and currently rely on manual spot-checks',
   NOW()-INTERVAL '18 days'),
  (v_u13,v_i13,'hone','problem',
   'manual PPE checks are infrequent, inconsistent, and entirely dependent on people being in the right place at the right time — serious incidents happen in the gaps',
   NOW()-INTERVAL '16 days'),
  (v_u13,v_i13,'hone','outcome',
   'continuous 24/7 site monitoring that catches violations in under 3 seconds and creates a full audit trail — reducing reportable incidents and insurance premiums',
   NOW()-INTERVAL '14 days'),

  -- u14 · Allergy recipe box
  (v_u14,v_i14,'hone','what',
   'a weekly meal kit subscription entirely designed around your family''s specific combination of food allergies — every ingredient triple-checked, every recipe tested',
   NOW()-INTERVAL '18 days'),
  (v_u14,v_i14,'hone','who',
   'parents with one or more children with serious food allergies who currently spend hours checking labels and worry constantly about cross-contamination in meal kits',
   NOW()-INTERVAL '16 days'),
  (v_u14,v_i14,'hone','problem',
   'generic meal kits can''t handle complex or combined allergen profiles — parents either cook everything from scratch or risk a serious reaction from ambiguous ingredients',
   NOW()-INTERVAL '14 days'),
  (v_u14,v_i14,'hone','outcome',
   'a family meal kit that''s genuinely safe for your exact allergen combination — so parents can cook interesting meals without the constant background anxiety',
   NOW()-INTERVAL '12 days'),

  -- u15 · Real estate data API
  (v_u15,v_i15,'hone','what',
   'a REST API delivering aggregated, normalised residential property price and rental yield data for 50+ cities across South and Southeast Asia',
   NOW()-INTERVAL '22 days'),
  (v_u15,v_i15,'hone','who',
   'proptech startups, real estate investment platforms, and analyst teams at private equity firms who need reliable market data from Asian emerging markets',
   NOW()-INTERVAL '20 days'),
  (v_u15,v_i15,'hone','problem',
   'property data in emerging Asian markets is fragmented across dozens of local portals in different languages and formats — gathering it takes weeks of manual scraping',
   NOW()-INTERVAL '18 days'),
  (v_u15,v_i15,'hone','outcome',
   'a single API call returns clean, comparable property price and yield data for any of 50+ cities — updated weekly, with a full 5-year history',
   NOW()-INTERVAL '16 days'),

  -- u16 · Micro-pension for gig workers
  (v_u16,v_i16,'hone','what',
   'a mobile app for gig and freelance workers that automatically rounds up every payment received and invests the spare change into a low-cost pension wrapper',
   NOW()-INTERVAL '25 days'),
  (v_u16,v_i16,'hone','who',
   'freelancers and gig economy workers aged 20–40 in the UK and EU who have no employer pension and haven''t started saving — because it feels too complicated and unaffordable',
   NOW()-INTERVAL '23 days'),
  (v_u16,v_i16,'hone','problem',
   'gig workers have no default pension and find it psychologically hard to save a lump sum each month — irregular income makes traditional pension saving feel impossible',
   NOW()-INTERVAL '21 days'),
  (v_u16,v_i16,'hone','outcome',
   'a pension pot that grows automatically in the background, without any active decision — most users save £800–1,200 per year without noticing the money leave',
   NOW()-INTERVAL '19 days'),

  -- u17 · Developer docs search
  (v_u17,v_i17,'hone','what',
   'a semantic search engine that indexes all major developer documentation sources and lets you search in natural language across all of them simultaneously',
   NOW()-INTERVAL '14 days'),
  (v_u17,v_i17,'hone','who',
   'software developers who spend 20–40% of their working day hunting for the right answer across fragmented official docs, Stack Overflow, and GitHub issues',
   NOW()-INTERVAL '12 days'),
  (v_u17,v_i17,'hone','problem',
   'finding the right answer in developer docs is slow and frustrating — keyword search misses context, results are outdated, and the answer is often spread across 3 different pages',
   NOW()-INTERVAL '10 days'),
  (v_u17,v_i17,'hone','outcome',
   'type a question in plain English and get the correct, version-specific answer from the right docs page in under 5 seconds — no tab-switching, no guessing',
   NOW()-INTERVAL '8 days'),

  -- u18 · Luxury authentication
  (v_u18,v_i18,'hone','what',
   'a remote luxury goods authentication service where specialist ex-brand employees review photo submissions and issue tamper-proof digital certificates within 24 hours',
   NOW()-INTERVAL '30 days'),
  (v_u18,v_i18,'hone','who',
   'buyers and sellers on secondhand luxury marketplaces who don''t trust basic AI-only checks and want a credible human expert opinion before completing a high-value transaction',
   NOW()-INTERVAL '28 days'),
  (v_u18,v_i18,'hone','problem',
   'counterfeits are increasingly convincing and AI authentication tools can be fooled — buyers have no trustworthy way to verify a luxury item before paying without sending it in person',
   NOW()-INTERVAL '26 days'),
  (v_u18,v_i18,'hone','outcome',
   'a verified human expert opinion with a digital certificate you can share with buyers — increasing your sale price by an average of 18% and eliminating chargeback disputes',
   NOW()-INTERVAL '24 days'),

  -- u19 · Mental health journaling
  (v_u19,v_i19,'hone','what',
   'a daily mental health journaling app with structured prompts and mood tracking that automatically flags distress patterns to a linked therapist or crisis contact',
   NOW()-INTERVAL '16 days'),
  (v_u19,v_i19,'hone','who',
   'people in therapy aged 18–35 who want to maintain mental health between sessions but struggle to journal consistently without structure or accountability',
   NOW()-INTERVAL '14 days'),
  (v_u19,v_i19,'hone','problem',
   'there''s a long gap between therapy sessions where people can spiral — journaling helps but nobody does it without prompts, and therapists can''t see what''s happening in between',
   NOW()-INTERVAL '12 days'),
  (v_u19,v_i19,'hone','outcome',
   'consistent daily check-ins that give your therapist visibility between sessions — and alert them immediately if your pattern indicates a crisis before it escalates',
   NOW()-INTERVAL '10 days'),

  -- u20 · Vertical farm SaaS
  (v_u20,v_i20,'hone','what',
   'a SaaS platform for indoor vertical farm operators that aggregates IoT sensor data, automates grow-cycle scheduling, and surfaces yield and waste analytics in one dashboard',
   NOW()-INTERVAL '20 days'),
  (v_u20,v_i20,'hone','who',
   'operators of small to mid-size indoor vertical farms (under 5,000 m²) who currently manage their grow cycles manually in spreadsheets and miss yield optimisation opportunities',
   NOW()-INTERVAL '18 days'),
  (v_u20,v_i20,'hone','problem',
   'managing a vertical farm across dozens of IoT sensors, grow lights, and irrigation systems using spreadsheets leads to missed optimal harvest windows and preventable crop loss',
   NOW()-INTERVAL '16 days'),
  (v_u20,v_i20,'hone','outcome',
   'fully automated grow-cycle management that increases yield per m² by 15–25% and reduces crop loss — all visible in a single real-time dashboard',
   NOW()-INTERVAL '14 days');

  -- ── 5. Stage entries — VALIDATE hone phase (users 21–35) ──────────────────

  INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content, completed_at) VALUES

  (v_u21,v_i21,'hone','what','a spend analytics SaaS that connects to accounting tools and surfaces anomalous spend, duplicate vendors, and savings opportunities in a weekly digest for finance teams',NOW()-INTERVAL '30 days'),
  (v_u21,v_i21,'hone','who','finance managers and CFOs at SMEs with 10–150 employees who have a messy supplier list and no visibility into where budget is actually going',NOW()-INTERVAL '28 days'),
  (v_u21,v_i21,'hone','problem','finance teams at SMEs have no systematic way to spot wasteful or duplicate spend — they rely on ad-hoc reviews or end-of-quarter surprises when it''s too late to act',NOW()-INTERVAL '26 days'),
  (v_u21,v_i21,'hone','outcome','a weekly automated digest that flags exactly where money is being wasted and how much can be saved — average finding: £8k in recoverable spend per quarter',NOW()-INTERVAL '24 days'),

  (v_u22,v_i22,'hone','what','an on-demand personal styling service delivered via 30-minute video call — a certified stylist reviews your existing wardrobe virtually and gives specific, budget-aware shopping recommendations',NOW()-INTERVAL '22 days'),
  (v_u22,v_i22,'hone','who','women aged 28–45 who feel stuck in a style rut, waste money on clothes they never wear, and can''t afford an in-person personal stylist but want expert advice',NOW()-INTERVAL '20 days'),
  (v_u22,v_i22,'hone','problem','people buy clothes impulsively and end up with a wardrobe full of things that don''t work together — they need expert advice but personal styling feels inaccessible and expensive',NOW()-INTERVAL '18 days'),
  (v_u22,v_i22,'hone','outcome','a wardrobe that actually works, specific items to buy next, and the confidence to get dressed in the morning — delivered in 30 minutes for £35',NOW()-INTERVAL '16 days'),

  (v_u23,v_i23,'hone','what','a fleet management SaaS purpose-built for small EV delivery fleets — route optimisation, charge scheduling, and driver behaviour scoring in a single mobile-first dashboard',NOW()-INTERVAL '25 days'),
  (v_u23,v_i23,'hone','who','logistics SMEs with 5–50 electric delivery vehicles who are transitioning from diesel and struggling to manage charge scheduling alongside delivery routes',NOW()-INTERVAL '23 days'),
  (v_u23,v_i23,'hone','problem','EV fleet managers can''t use conventional route planning tools because they don''t account for charge state, charge point availability, or range anxiety — drivers get stranded',NOW()-INTERVAL '21 days'),
  (v_u23,v_i23,'hone','outcome','every vehicle completes its route without range anxiety — charge scheduling is automatic, and managers see live fleet status from a single screen',NOW()-INTERVAL '19 days'),

  (v_u24,v_i24,'hone','what','an invoice financing marketplace where freelancers and small agencies upload unpaid invoices and receive a cash advance within 24 hours — repaid automatically when the client pays',NOW()-INTERVAL '28 days'),
  (v_u24,v_i24,'hone','who','freelancers and boutique agencies with 30–90 day payment terms who have regular cashflow gaps and don''t qualify for traditional business loans',NOW()-INTERVAL '26 days'),
  (v_u24,v_i24,'hone','problem','60-day invoice terms mean freelancers often can''t pay themselves or their suppliers on time — traditional invoice financing requires long contracts, high minimums, and credit checks they fail',NOW()-INTERVAL '24 days'),
  (v_u24,v_i24,'hone','outcome','get paid today for work you''ve already done — no credit check, no lock-in, 2% fee per 30 days, repaid automatically the moment your client settles',NOW()-INTERVAL '22 days'),

  (v_u25,v_i25,'hone','what','an AI-powered GitHub bot that reviews incoming pull requests for security vulnerabilities, breaking API changes, and style violations — and posts a structured, actionable comment',NOW()-INTERVAL '18 days'),
  (v_u25,v_i25,'hone','who','open source project maintainers who receive 10+ PRs per week and spend hours reviewing contributions that often introduce regressions or security issues',NOW()-INTERVAL '16 days'),
  (v_u25,v_i25,'hone','problem','open source maintainers are overwhelmed — reviewing every PR thoroughly takes hours they don''t have, and bad code ships because reviewing everything manually is unsustainable',NOW()-INTERVAL '14 days'),
  (v_u25,v_i25,'hone','outcome','every PR gets a thorough first-pass review within 2 minutes — maintainers only need to focus on judgement calls, not catching obvious issues',NOW()-INTERVAL '12 days'),

  (v_u26,v_i26,'hone','what','a platform that gives local communities the tools to pool investment, acquire solar panels, and distribute generated energy income as dividends — community renewable energy as a co-op',NOW()-INTERVAL '35 days'),
  (v_u26,v_i26,'hone','who','environmentally motivated residents in suburban and rural communities who want to move to renewables but can''t install panels on their own property',NOW()-INTERVAL '33 days'),
  (v_u26,v_i26,'hone','problem','transitioning to renewable energy requires capital and property access that individuals don''t have — community energy schemes exist but setting one up requires legal and financial expertise most communities lack',NOW()-INTERVAL '31 days'),
  (v_u26,v_i26,'hone','outcome','a community solar co-op live in 90 days — members invest from £250, earn quarterly dividends, and collectively reduce their carbon footprint without needing a south-facing roof',NOW()-INTERVAL '29 days'),

  (v_u27,v_i27,'hone','what','a pet health app that stores all medical records and vaccination history, sends proactive reminders, and lets you message your vet practice directly — all in one place',NOW()-INTERVAL '14 days'),
  (v_u27,v_i27,'hone','who','dog and cat owners aged 25–50 with 1–3 pets who struggle to remember vaccination dates, can''t find old records at the vet, and want faster access to their vet practice',NOW()-INTERVAL '12 days'),
  (v_u27,v_i27,'hone','problem','pet health records are scattered across paper letters, PDFs, and old emails — owners miss vaccination reminders and vets spend appointment time asking for history the owner can''t recall',NOW()-INTERVAL '10 days'),
  (v_u27,v_i27,'hone','outcome','one place for every piece of pet health information — vet visits are faster, nothing is missed, and messaging your vet is as simple as texting',NOW()-INTERVAL '8 days'),

  (v_u28,v_i28,'hone','what','a hyperlocal platform where neighbours exchange skills and services for free — a plumber fixes a tap in exchange for piano lessons, a gardener gets photography help',NOW()-INTERVAL '20 days'),
  (v_u28,v_i28,'hone','who','residents in suburban neighbourhoods aged 30–65 who have valuable skills to offer and would love to access local skills without paying market rate',NOW()-INTERVAL '18 days'),
  (v_u28,v_i28,'hone','problem','neighbours have skills others need but there''s no easy way to match them — people pay full rate for tradespeople when a neighbour would happily help in exchange for something they offer',NOW()-INTERVAL '16 days'),
  (v_u28,v_i28,'hone','outcome','a thriving local skills network where members save an average of £200/month on services — and build real connections with people who live nearby',NOW()-INTERVAL '14 days'),

  (v_u29,v_i29,'hone','what','a white-label digital loyalty programme that independent retailers can set up in under an hour — customers collect stamps digitally, retailers see redemption analytics',NOW()-INTERVAL '22 days'),
  (v_u29,v_i29,'hone','who','independent coffee shops, bakeries, and boutiques with 1–5 locations who currently use paper stamp cards or nothing — and know they''re losing repeat customers',NOW()-INTERVAL '20 days'),
  (v_u29,v_i29,'hone','problem','paper stamp cards get lost, can''t be tracked, and give the retailer no data — but enterprise loyalty platforms are too complex and expensive for a shop with 3 staff',NOW()-INTERVAL '18 days'),
  (v_u29,v_i29,'hone','outcome','a branded digital stamp card live in an afternoon, customers loving it from day one, and a dashboard showing which regulars haven''t visited in 3 weeks',NOW()-INTERVAL '16 days'),

  (v_u30,v_i30,'hone','what','a telehealth physiotherapy service that delivers video sessions with live AI motion analysis — flagging exercise errors in real time so patients improve faster and therapists scale their practice',NOW()-INTERVAL '26 days'),
  (v_u30,v_i30,'hone','who','post-surgery or injury recovery patients who need regular physio but can''t get to a clinic due to mobility, distance, or appointment availability',NOW()-INTERVAL '24 days'),
  (v_u30,v_i30,'hone','problem','patients skip physio sessions because travelling to a clinic is hard — and when they do exercises at home unsupervised, they do them wrong and don''t recover properly',NOW()-INTERVAL '22 days'),
  (v_u30,v_i30,'hone','outcome','regular physio sessions from home with real-time form correction — recovery times 30% faster than unsupervised home exercise, and physio practices earn 3× more per therapist hour',NOW()-INTERVAL '20 days'),

  (v_u31,v_i31,'hone','what','a childcare matching platform that vets and connects working parents with local DBS-checked childminders — with instant booking, transparent reviews, and automatic weekly payment',NOW()-INTERVAL '18 days'),
  (v_u31,v_i31,'hone','who','dual-income parents with children aged 0–8 in mid-size UK cities who need reliable weekday childcare and find the current process of finding and vetting childminders exhausting',NOW()-INTERVAL '16 days'),
  (v_u31,v_i31,'hone','problem','finding a trustworthy local childminder takes weeks of searching, WhatsApp messages, and gut-feel decisions — and when someone cancels you''re completely stuck',NOW()-INTERVAL '14 days'),
  (v_u31,v_i31,'hone','outcome','a verified childminder booked in under 20 minutes — with a backup option built in, weekly auto-payment, and a direct line to their profile, reviews, and qualifications',NOW()-INTERVAL '12 days'),

  (v_u32,v_i32,'hone','what','a SaaS tool for restaurant owners that connects to their POS system and shows dish-level profitability after food cost, prep time, and waste — with clear recommendations on what to cut or promote',NOW()-INTERVAL '22 days'),
  (v_u32,v_i32,'hone','who','independent restaurant owners and small chain operators who struggle to know which menu items are actually profitable versus just popular',NOW()-INTERVAL '20 days'),
  (v_u32,v_i32,'hone','problem','most restaurant owners price by gut feel and competitor benchmarking — they have no visibility into true dish profitability after all costs, and carry loss-making items for years',NOW()-INTERVAL '18 days'),
  (v_u32,v_i32,'hone','outcome','a clear profitability rank for every dish on your menu — owners typically find 3–4 dishes that are losing money and 2–3 underpriced winners they didn''t know about',NOW()-INTERVAL '16 days'),

  (v_u33,v_i33,'hone','what','a workplace sustainability platform where office teams complete monthly challenges, track their collective environmental impact, and compete with other companies on a public leaderboard',NOW()-INTERVAL '15 days'),
  (v_u33,v_i33,'hone','who','sustainability leads and HR teams at companies of 50–500 people who want to engage employees around ESG commitments but find internal initiatives fall flat',NOW()-INTERVAL '13 days'),
  (v_u33,v_i33,'hone','problem','corporate sustainability initiatives are top-down and boring — employees don''t feel personal connection to company ESG goals and engagement drops within weeks of launch',NOW()-INTERVAL '11 days'),
  (v_u33,v_i33,'hone','outcome','a team sustainability habit that sticks — 80% monthly active engagement, measurable CO2 reduction employees can see personally, and ESG data for annual reporting',NOW()-INTERVAL '9 days'),

  (v_u34,v_i34,'hone','what','a mobile micro-learning app for tradespeople with 5-minute video lessons on new building regulations, material innovations, and trade techniques — designed for use during a lunch break or in a van',NOW()-INTERVAL '18 days'),
  (v_u34,v_i34,'hone','who','tradespeople aged 25–50 (plumbers, electricians, carpenters) who need to keep up with regulation changes and new materials but can''t attend day-long courses',NOW()-INTERVAL '16 days'),
  (v_u34,v_i34,'hone','problem','regulation changes in construction happen constantly but training is delivered through full-day courses tradespeople can''t afford to attend — resulting in expensive compliance errors on site',NOW()-INTERVAL '14 days'),
  (v_u34,v_i34,'hone','outcome','stay compliant and up to date with 5 minutes of learning a day — no courses, no travel, no full-day shutdowns, directly applicable to the job they''re on tomorrow',NOW()-INTERVAL '12 days'),

  (v_u35,v_i35,'hone','what','a single REST API that routes payments across 20+ African payment providers — with automatic fallback, local currency conversion, and built-in reconciliation for international businesses',NOW()-INTERVAL '28 days'),
  (v_u35,v_i35,'hone','who','international SaaS companies and e-commerce platforms wanting to accept payments across multiple African markets without integrating a separate provider for each country',NOW()-INTERVAL '26 days'),
  (v_u35,v_i35,'hone','problem','expanding payment acceptance across Africa means integrating with a different provider in each country — each with different APIs, compliance requirements, and settlement timelines, taking months per market',NOW()-INTERVAL '24 days'),
  (v_u35,v_i35,'hone','outcome','go live across 15 African markets in one afternoon — one API, automatic provider routing, local currency settlement, and unified reconciliation in your home currency',NOW()-INTERVAL '22 days');

  -- ── 6. Shape entries (users 36–45) ────────────────────────────────────────

  INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content, completed_at) VALUES

  -- also include hone for shape-stage users
  (v_u36,v_i36,'hone','what','an AI writing assistant that generates first-draft grant applications for charities and non-profits, tailored to specific funders and their stated priorities',NOW()-INTERVAL '45 days'),
  (v_u36,v_i36,'hone','who','fundraising officers at small-to-medium charities (£50k–£2m income) who spend 60% of their time writing grant applications and still struggle to hit funder-specific tone and criteria',NOW()-INTERVAL '42 days'),
  (v_u36,v_i36,'hone','problem','writing tailored grant applications is enormously time-consuming — each funder has different criteria, tone preferences, and word limits, and small charities don''t have the capacity to do it well',NOW()-INTERVAL '40 days'),
  (v_u36,v_i36,'hone','outcome','a fundable first draft in 15 minutes instead of 3 days — fundraisers spend their time refining and relationship-building rather than staring at blank pages',NOW()-INTERVAL '38 days'),
  (v_u36,v_i36,'shape','mvp_features',E'3 features only:\n1. Charity profile builder — mission, past impact, key stats\n2. Funder selection with criteria import from funder database\n3. One-click first draft generation with editable sections\n\nCut from v1: multi-user collaboration, submission tracking, AI follow-up emails, funder relationship CRM.',NOW()-INTERVAL '14 days'),
  (v_u36,v_i36,'shape','launch_target','10 small charities in London and Manchester — recruited via charity sector Slack communities and LinkedIn outreach to fundraising officers. Run free for 60 days, gather 3 submitted applications per charity, measure success rate vs their baseline.',NOW()-INTERVAL '10 days'),

  (v_u37,v_i37,'hone','what','a marketplace where food entrepreneurs, caterers, and pop-up restaurant operators can book certified commercial kitchen space by the hour or day',NOW()-INTERVAL '38 days'),
  (v_u37,v_i37,'hone','who','food entrepreneurs in early-stage product development, private caterers, and pop-up dining operators who need professional kitchen access without the cost of a long-term lease',NOW()-INTERVAL '36 days'),
  (v_u37,v_i37,'hone','problem','starting a food business requires a certified commercial kitchen but leasing one is expensive and long-term — there''s no flexible, affordable way to access professional kitchen space on demand',NOW()-INTERVAL '34 days'),
  (v_u37,v_i37,'hone','outcome','book a commercial kitchen within 24 hours at 30% of the cost of a private lease — no contract, no minimum term, certification included',NOW()-INTERVAL '32 days'),
  (v_u37,v_i37,'shape','mvp_features',E'3 features:\n1. Kitchen listing with photos, certifications, available slots, and hourly rate\n2. Real-time booking calendar with instant confirmation\n3. Secure payment on booking with cancellation policy\n\nCut from v1: kitchen host dashboard analytics, group bookings, equipment add-ons, insurance brokering.',NOW()-INTERVAL '12 days'),
  (v_u37,v_i37,'shape','launch_target','Start in one city — Manchester. Onboard 8 kitchen hosts (restaurant off-hours, catering colleges, church halls with certified kitchens). Target first 20 bookings within 30 days from food entrepreneur Facebook groups and local food market networks.',NOW()-INTERVAL '8 days'),

  (v_u38,v_i38,'hone','what','a contract lifecycle management tool for startups that lets you create, negotiate, sign, and track all contracts in one place — with automatic renewal alerts and AI clause risk scoring',NOW()-INTERVAL '40 days'),
  (v_u38,v_i38,'hone','who','founders and ops leads at startups of 5–50 people who are drowning in supplier, employee, and client contracts stored across Google Drive, DocuSign, and email',NOW()-INTERVAL '38 days'),
  (v_u38,v_i38,'hone','problem','startups miss contract renewals, sign risky clauses they don''t understand, and waste hours searching for the right version of a contract buried in shared drives',NOW()-INTERVAL '36 days'),
  (v_u38,v_i38,'hone','outcome','every contract in one searchable place, flagged 60 days before renewal, with a risk score on every clause that matters — never be surprised by a renewing contract again',NOW()-INTERVAL '34 days'),
  (v_u38,v_i38,'shape','mvp_features',E'3 features:\n1. Contract upload and central repository with search\n2. Renewal date tracking with 60/30/7 day email alerts\n3. AI clause risk flag (NDA mutual/one-way, auto-renew, liability caps, IP assignment)\n\nCut from v1: in-app negotiation, e-signature, template library, multi-user permissions.',NOW()-INTERVAL '15 days'),
  (v_u38,v_i38,'shape','launch_target','Seed with 15 YC/Antler alumni startups from personal network. Offer free for 90 days in exchange for weekly feedback calls. Target: 10 contracts uploaded per company in first 30 days.',NOW()-INTERVAL '11 days'),

  (v_u39,v_i39,'hone','what','a B2B marketplace where e-commerce brands browse, compare, and order certified sustainable packaging from vetted suppliers — filtered by material, size, MOQ, and delivery region',NOW()-INTERVAL '42 days'),
  (v_u39,v_i39,'hone','who','e-commerce brands shipping 500–50,000 parcels per month who want to switch to sustainable packaging but don''t know where to find verified, affordable options at their volume',NOW()-INTERVAL '40 days'),
  (v_u39,v_i39,'hone','problem','finding sustainable packaging suppliers requires weeks of RFQ emails, sample requests, and sustainability claim verification — most brands give up and stay with plastic because it''s easier',NOW()-INTERVAL '38 days'),
  (v_u39,v_i39,'hone','outcome','find, compare, and order certified sustainable packaging in under an hour — with verified sustainability credentials, sample packs, and live stock availability',NOW()-INTERVAL '36 days'),
  (v_u39,v_i39,'shape','mvp_features',E'3 features:\n1. Searchable supplier catalogue with certification badges and filters\n2. Sample pack ordering (£15 flat fee, deducted from first order)\n3. Direct quote request to supplier with 24h response SLA\n\nCut from v1: in-platform ordering/payment, supplier analytics dashboard, bulk RFQ tool.',NOW()-INTERVAL '13 days'),
  (v_u39,v_i39,'shape','launch_target','Onboard 20 packaging suppliers first (outreach via packaging trade associations). Then launch to e-commerce brands via Shopify app store listing and DTC brand Slack communities. Target 50 quote requests in first 30 days.',NOW()-INTERVAL '9 days'),

  (v_u40,v_i40,'hone','what','a subscription platform where independent music producers offer fans exclusive access to unreleased stems, sample packs, and monthly production masterclasses',NOW()-INTERVAL '35 days'),
  (v_u40,v_i40,'hone','who','independent music producers with 5k–200k followers who earn inconsistently from beats and want a direct recurring income stream from their most engaged fans',NOW()-INTERVAL '33 days'),
  (v_u40,v_i40,'hone','problem','producers earn money per beat sale but have no recurring income — licensing is complex, Spotify pays almost nothing, and there''s no direct way to monetise the audience they''ve built on YouTube or Instagram',NOW()-INTERVAL '31 days'),
  (v_u40,v_i40,'hone','outcome','a predictable monthly income from your most loyal fans — producers earning £800–£3,000/month from 100–400 subscribers at £8–£15/month',NOW()-INTERVAL '29 days'),
  (v_u40,v_i40,'shape','mvp_features',E'3 features:\n1. Producer profile with subscription tier setup (price, what''s included)\n2. Content upload: stems, samples, lesson videos (stored, not live)\n3. Fan subscription and payment with instant access on subscribe\n\nCut from v1: live streaming, community forum, collab requests, revenue analytics dashboard.',NOW()-INTERVAL '11 days'),
  (v_u40,v_i40,'shape','launch_target','Recruit 5 independent producers from YouTube/IG with 10k–100k followers who already have engaged audiences. Run free for 60 days. Target: each producer gets 30 paying subscribers in month 1.',NOW()-INTERVAL '7 days'),

  (v_u41,v_i41,'hone','what','a plug-in smart home energy management device and companion app for renters — monitors all smart devices, optimises energy use, and cuts bills without requiring any landlord modifications',NOW()-INTERVAL '38 days'),
  (v_u41,v_i41,'hone','who','renters in the UK aged 22–40 paying high energy bills who can''t install solar panels or a smart thermostat but want to cut costs and reduce their carbon footprint',NOW()-INTERVAL '36 days'),
  (v_u41,v_i41,'hone','problem','renters can''t make structural energy improvements to their homes — they pay full energy bills with no control over insulation, heating systems, or installed appliances, leaving them stuck with high bills',NOW()-INTERVAL '34 days'),
  (v_u41,v_i41,'hone','outcome','plug in and cut your energy bill by 15–25% within 60 days — no landlord permission, no installation, works with any smart devices you already own',NOW()-INTERVAL '32 days'),
  (v_u41,v_i41,'shape','mvp_features',E'3 features:\n1. Plug-in hub that monitors energy draw from connected devices\n2. App dashboard showing real-time usage by device and daily cost\n3. Automated schedules: shift high-draw appliances to off-peak tariff windows\n\nCut from v1: landlord portal, AI energy coaching, Octopus API integration, multi-property.',NOW()-INTERVAL '12 days'),
  (v_u41,v_i41,'shape','launch_target','Pilot with 25 renters in London recruited via Reddit r/UKPersonalFinance and Rightmove tenant forums. Ship 25 hardware units, measure bill reduction after 60 days. Need £15k for first hardware batch.',NOW()-INTERVAL '8 days'),

  (v_u42,v_i42,'hone','what','an AI-powered interview practice platform where candidates do mock technical and behavioural interviews and receive scored, specific feedback on every answer — not just generic tips',NOW()-INTERVAL '32 days'),
  (v_u42,v_i42,'hone','who','software engineers and product managers in job searches who want to practice interviews but find generic prep guides useless and can''t get feedback from real interviewers',NOW()-INTERVAL '30 days'),
  (v_u42,v_i42,'hone','problem','interview preparation is passive — people read guides and watch videos but never practice actually answering questions out loud, and when they do, they have no way to get honest, specific feedback',NOW()-INTERVAL '28 days'),
  (v_u42,v_i42,'hone','outcome','score 30% higher in mock interviews after 5 sessions — specific, actionable feedback on answer structure, technical accuracy, and communication style that actually changes how you perform',NOW()-INTERVAL '26 days'),
  (v_u42,v_i42,'shape','mvp_features',E'3 features:\n1. Role and level selector (e.g., Senior SWE at FAANG / PM at Series B)\n2. AI interview session: 6 questions, voice input, real-time transcript\n3. Post-session scorecard: STAR structure, relevance, technical accuracy, clarity\n\nCut from v1: live interviewer option, scheduling, company-specific question banks, peer mock sessions.',NOW()-INTERVAL '10 days'),
  (v_u42,v_i42,'shape','launch_target','Launch as free beta on Product Hunt and Hacker News. Target 500 sign-ups in first 2 weeks. Charge £19/month after 3 free sessions. Aim for 50 paying users in month 1.',NOW()-INTERVAL '6 days'),

  (v_u43,v_i43,'hone','what','a telemedicine platform connecting expectant mothers in rural and remote areas with certified midwives and OBs for video consultations throughout pregnancy and the postnatal period',NOW()-INTERVAL '50 days'),
  (v_u43,v_i43,'hone','who','pregnant women in rural UK and US counties more than 30 minutes from the nearest obstetric unit — facing long travel times, appointment shortages, and higher maternal complication rates',NOW()-INTERVAL '48 days'),
  (v_u43,v_i43,'hone','problem','rural expectant mothers attend fewer antenatal appointments because of distance and travel cost — missing check-ups that catch complications early, leading to worse maternal and neonatal outcomes',NOW()-INTERVAL '46 days'),
  (v_u43,v_i43,'hone','outcome','attend every antenatal appointment from home — rural mothers get the same frequency and quality of care as urban mothers, with physical appointments reserved only for essential interventions',NOW()-INTERVAL '44 days'),
  (v_u43,v_i43,'shape','mvp_features',E'3 features:\n1. Patient onboarding with EDD, risk factors, and GP/midwife details\n2. Video consultation booking with available midwives (48h booking window)\n3. Post-consultation care notes sent to patient''s GP automatically\n\nCut from v1: fetal monitoring device integration, community forums, prescription, emergency escalation protocol (v2).',NOW()-INTERVAL '18 days'),
  (v_u43,v_i43,'shape','launch_target','Pilot in 2 rural NHS trusts in Wales and Yorkshire — already in conversation with Head of Midwifery at both. Need NHS governance sign-off. Target 30 patients in pilot cohort, 6 appointments per patient over 12 weeks.',NOW()-INTERVAL '14 days'),

  (v_u44,v_i44,'hone','what','a property management SaaS for short-term rental hosts managing 2–20 properties — unified messaging inbox, dynamic pricing automation, and maintenance request tracking across Airbnb and Booking.com',NOW()-INTERVAL '36 days'),
  (v_u44,v_i44,'hone','who','semi-professional Airbnb hosts with 3–15 properties who are spending 2–3 hours per day on guest messages, manual pricing updates, and chasing contractors',NOW()-INTERVAL '34 days'),
  (v_u44,v_i44,'hone','problem','managing multiple STR properties manually is exhausting — guest messages come from 3 platforms, pricing is set once and forgotten, and maintenance issues fall through the cracks when you''re managing everything in WhatsApp',NOW()-INTERVAL '32 days'),
  (v_u44,v_i44,'hone','outcome','manage 10 properties in 30 minutes a day — unified inbox, pricing that adjusts automatically to occupancy and local events, and a maintenance log that keeps contractors accountable',NOW()-INTERVAL '30 days'),
  (v_u44,v_i44,'shape','mvp_features',E'3 features:\n1. Unified messaging inbox (Airbnb + Booking.com + direct) with AI suggested replies\n2. Dynamic pricing rules engine (base price, weekend uplift, event detection)\n3. Maintenance request log with contractor assignment and photo evidence\n\nCut from v1: owner financial dashboard, cleaner scheduling, guidebook builder, channel manager API.',NOW()-INTERVAL '12 days'),
  (v_u44,v_i44,'shape','launch_target','Recruit 15 hosts from Airbnb host Facebook groups and local property investor meetups. Offer free for 3 months. Target: hosts save 1+ hour per day within first 2 weeks.',NOW()-INTERVAL '8 days'),

  (v_u45,v_i45,'hone','what','an AI nutritionist app for competitive and amateur athletes that adjusts macros and micronutrient targets in real time based on training load, performance data, and food log',NOW()-INTERVAL '28 days'),
  (v_u45,v_i45,'hone','who','amateur and semi-professional athletes in strength and endurance sports aged 18–40 who are serious about performance but can''t afford a personal nutritionist',NOW()-INTERVAL '26 days'),
  (v_u45,v_i45,'hone','problem','generic macro calculators don''t account for training variation — athletes eat the same way on rest days and heavy training days, undermining recovery and performance without knowing why',NOW()-INTERVAL '24 days'),
  (v_u45,v_i45,'hone','outcome','nutrition targets that shift automatically with your training — athletes report 20% better recovery metrics and personal bests within 8 weeks of following adaptive recommendations',NOW()-INTERVAL '22 days'),
  (v_u45,v_i45,'shape','mvp_features',E'3 features:\n1. Training session logger (type, duration, perceived exertion)\n2. Daily food log with macro auto-calculation from food database\n3. Adaptive daily targets: macros adjust based on yesterday''s training and tomorrow''s planned session\n\nCut from v1: wearable integration, coach sharing portal, supplement recommendations, AI meal plan generator.',NOW()-INTERVAL '10 days'),
  (v_u45,v_i45,'shape','launch_target','Launch to 50 athletes from CrossFit boxes and local running clubs in Bristol. Free for 90 days. Measure: average session count per user in first 30 days. Target 4+ sessions/week per active user.',NOW()-INTERVAL '6 days');

  -- ── 7. Validation contacts (validate-stage users 21–35) ───────────────────

  INSERT INTO validation_contacts (user_id, idea_id, source, name, contact, status, notes) VALUES

  (v_u21,v_i21,'linkedin','Rachel O''Connor','rachel@finops-demo.com','Done','Confirmed: spends 6h/month reviewing vendor invoices manually. Said she would pay £200/mo for this.'),
  (v_u21,v_i21,'email','Tom Blackwell','tom.b@growthsme.co.uk','Done','Has 340 active suppliers in Xero — can''t spot duplicates. Very keen.'),
  (v_u21,v_i21,'linkedin','Priya Shah','priya@northwick.io','Call booked','Replied positively, interview scheduled next week.'),
  (v_u21,v_i21,'community','Marcus Hill','marcus@apexretail.com','Replied','Commented on post, asked to be on beta list.'),

  (v_u22,v_i22,'community','Hannah Davies','hannah.d@gmail.com','Done','Said she wasted £400 last month on clothes she returned. Would pay £40/session.'),
  (v_u22,v_i22,'email','Claire Watts','claire@styleforum.co.uk','Done','Has a wardrobe she hates and no idea where to start. Loved the concept.'),
  (v_u22,v_i22,'linkedin','Sophie Marsh','soph.m@outlook.com','Sent','Replied, said she''s tried Stitch Fix but wants more personal advice.'),

  (v_u23,v_i23,'email','Derek Lowe','derek@swiftlogistics.co.uk','Done','Managing 12 EVs, charge scheduling is his biggest headache. Would pay £80/vehicle/month.'),
  (v_u23,v_i23,'linkedin','Anita Patel','anita@greenfleet.io','Done','Just transitioned from diesel, drowning in range anxiety complaints from drivers.'),
  (v_u23,v_i23,'community','Ben Clarke','b.clarke@citycouriers.com','Sent','Posted in EV fleet LinkedIn group, very interested.'),

  (v_u24,v_i24,'community','Jamie Wu','jamie@pixelcraft.studio','Done','Has £18k in outstanding invoices right now. Said he needs this today.'),
  (v_u24,v_i24,'linkedin','Rosa Ferreira','rosa@designstudio.pt','Done','Regularly waits 60 days for client payment. Pays overdraft interest as a result.'),
  (v_u24,v_i24,'email','Theo Nguyen','theo.n@freelance.io','Replied','Found via cold email. Has 4 outstanding invoices. On waitlist.'),
  (v_u24,v_i24,'linkedin','Amelia Cross','a.cross@contentco.com','Sent','Agency with 90-day payment terms from their biggest client.'),

  (v_u25,v_i25,'community','Oscar Lindqvist','oscar@fastapi-oss.dev','Done','Gets 50 PRs/week, reviews take 2h each. Would use immediately — free or paid.'),
  (v_u25,v_i25,'email','Yuna Kim','yuna@vuejs.org','Done','Key pain: catching breaking changes in contributor PRs before they ship.'),
  (v_u25,v_i25,'community','Arjun Bose','arjun@django-maintainer.com','Sent','Replied in GitHub Discussions thread. Interested.'),

  (v_u26,v_i26,'email','Janet Morris','janet@localenergy.coop','Done','Running a co-op manually in spreadsheets. Would adopt platform immediately.'),
  (v_u26,v_i26,'community','Robert Kirby','r.kirby@communitypower.uk','Done','Said the legal setup was the biggest barrier — if platform handles it, game-changer.'),
  (v_u26,v_i26,'linkedin','Linda Osei','linda@solarclub.org.uk','Sent','20-member co-op, looking to scale. On waitlist.'),

  (v_u27,v_i27,'community','Grace Bennett','grace.b@gmail.com','Done','Has 2 dogs, missed a vaccination last year because she lost the reminder letter.'),
  (v_u27,v_i27,'email','Harry Cousins','h.cousins@outlook.com','Done','Can never find his cat''s vet history when travelling. Loves the idea.'),
  (v_u27,v_i27,'linkedin','Meera Joshi','meera.j@vetpractice.com','Done','Vets spend 10 min per appointment asking for history owners don''t have. Wants to recommend to clients.'),
  (v_u27,v_i27,'community','Tom Archer','tom.a@petlovers.io','Replied','On waitlist. Has 3 dogs with complex medication schedules.'),

  (v_u28,v_i28,'community','Fiona Walsh','fiona@neighbourhood.app','Done','Fixes bikes in exchange for baking. Currently does it informally on Facebook.'),
  (v_u28,v_i28,'email','Dave Horton','d.horton@gmail.com','Done','Plumber. Said he''d swap 2h of work per month for piano lessons for his son.'),
  (v_u28,v_i28,'community','Penny Shaw','penny.s@outlook.com','Sent','Interested, lives in area with strong community spirit. Wants to try.'),

  (v_u29,v_i29,'email','Claire Dempsey','claire@thecornercoffee.co.uk','Done','Uses paper stamps, loses 30% of cards. Said she''d pay £30/month.'),
  (v_u29,v_i29,'community','Alex Mensah','alex@bakestreet.co.uk','Done','Tried Square loyalty — too complex. Wants something simpler.'),
  (v_u29,v_i29,'linkedin','Helen Brooks','helen@theboutique.uk','Sent','Has 800 regulars, no loyalty scheme. Very interested.'),
  (v_u29,v_i29,'community','Mustafa Al-Rashid','m.rashid@kebabking.co.uk','Replied','Posted in local business Facebook group. On waitlist.'),

  (v_u30,v_i30,'linkedin','Sarah Lim','sarah.l@nhs.uk','Done','Sees 12 patients/day in clinic — says 40% could safely be remote with the right tools.'),
  (v_u30,v_i30,'community','James Fowler','j.fowler@recovery.co.uk','Done','Post knee surgery, travels 45 min each way for physio. Would use remote alternative immediately.'),
  (v_u30,v_i30,'email','Dr. Ann Pearce','ann.p@privatehealth.com','Call booked','Interested in increasing patient capacity. On call scheduled.'),

  (v_u31,v_i31,'community','Laura Simmons','laura.s@gmail.com','Done','Spent 3 weeks finding a childminder. Called it the most stressful thing she''s done as a parent.'),
  (v_u31,v_i31,'email','Deborah King','deb.k@localchildminder.co.uk','Done','Has 3 available slots and no easy way to advertise them. Would list immediately.'),
  (v_u31,v_i31,'community','Patrick Ngozi','p.ngozi@outlook.com','Sent','Dual-income family, needs childcare 4 days/week. On waitlist.'),
  (v_u31,v_i31,'linkedin','Michelle Grant','m.grant@gmail.com','Replied','Had a childminder cancel last-minute with no backup. Needs the platform.'),

  (v_u32,v_i32,'community','Dario Mancini','dario@trattoriamancini.it','Done','Has 42 dishes on menu. Admitted he hasn''t reviewed dish profitability since 2022.'),
  (v_u32,v_i32,'email','Kelly Huang','kelly@thaipalace.co.uk','Done','Her accountant charges £300 to do this analysis quarterly. Wants it monthly.'),
  (v_u32,v_i32,'linkedin','Luis Santos','luis@tapasbar.es','Sent','Interested. Just switched POS to Square. Would integrate.'),

  (v_u33,v_i33,'email','Jess Hawkins','jess.h@peopleops.com','Done','Has tried internal green challenges — engagement drops to 12% by month 2. Needs this.'),
  (v_u33,v_i33,'linkedin','Nathan Cole','n.cole@acmecorp.co.uk','Done','350 staff, ESG reporting due in April. Needs employee engagement data.'),
  (v_u33,v_i33,'community','Tanya Bloom','t.bloom@greenoffice.org','Sent','Runs sustainability committee manually. Would adopt platform for company-wide rollout.'),

  (v_u34,v_i34,'community','Steve Murphy','steve.m@murphyplumbing.co.uk','Done','Said he missed a regulation update last year and had to redo a job. Costs him money.'),
  (v_u34,v_i34,'email','Karl Davis','k.davis@sparkselectric.com','Done','Takes full-day courses he hates. Would pay £15/month for bite-size updates.'),
  (v_u34,v_i34,'community','Gary Thompson','gary.t@gcarpentry.co.uk','Sent','Posted in tradespeople Facebook group. Interested in beta.'),

  (v_u35,v_i35,'email','Kofi Asare','kofi@paystack-alt.com','Done','Integrating 6 African gateways took his team 4 months. Would have paid for this.'),
  (v_u35,v_i35,'linkedin','Amina Diallo','amina@shopafrique.com','Done','Wants to expand to 5 new countries. Current integration approach doesn''t scale.'),
  (v_u35,v_i35,'community','Emmanuel Obi','e.obi@techbridge.ng','Sent','Replied to LinkedIn post. Evaluating options for Nigeria + Kenya + Ghana launch.');

  -- ── 8. Done-stage: shape entries ──────────────────────────────────────────

  INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content, completed_at) VALUES

  (v_u46,v_i46,'hone','what','a dead-simple e-signature tool for sole traders and freelancers — send a PDF, signer clicks a link and signs in their browser, document stored automatically',NOW()-INTERVAL '90 days'),
  (v_u46,v_i46,'hone','who','sole traders, consultants, and freelancers who need clients to sign quotes, contracts, or NDAs but don''t want to pay £25/month for DocuSign',NOW()-INTERVAL '85 days'),
  (v_u46,v_i46,'hone','problem','DocuSign and Adobe Sign are overkill and expensive for a sole trader who needs to send 3 documents a month — signers also have to create accounts which creates unnecessary friction',NOW()-INTERVAL '80 days'),
  (v_u46,v_i46,'hone','outcome','send a contract for signature in 60 seconds, signer clicks the link and signs in their browser without creating an account — document signed and stored in under 5 minutes',NOW()-INTERVAL '75 days'),
  (v_u46,v_i46,'shape','mvp_features',E'3 features:\n1. PDF upload and simple signature field placement\n2. Signer receives email link — signs in browser, no account required\n3. Completed document stored and emailed to both parties\n\nShipped as planned. No scope creep.',NOW()-INTERVAL '60 days'),
  (v_u46,v_i46,'shape','launch_target','Launched to 200 freelancers from ProductHunt and Reddit r/freelance. Hit 200 sign-ups in 4 days. 60 documents sent in first week.',NOW()-INTERVAL '55 days'),

  (v_u47,v_i47,'hone','what','a SaaS tool for podcasters that transcribes audio uploads and generates SEO-optimised show notes, timestamp lists, and social media clips automatically',NOW()-INTERVAL '80 days'),
  (v_u47,v_i47,'hone','who','independent podcast producers publishing weekly episodes who spend 2 hours per episode writing show notes and don''t have a VA',NOW()-INTERVAL '75 days'),
  (v_u47,v_i47,'hone','problem','writing show notes for every episode is time-consuming and inconsistent — most podcasters either skip them (losing SEO) or write poor-quality ones that don''t rank',NOW()-INTERVAL '70 days'),
  (v_u47,v_i47,'hone','outcome','upload your audio, get publication-ready show notes in 3 minutes — 100% of episodes get proper SEO-optimised notes without spending 2 hours on admin',NOW()-INTERVAL '65 days'),
  (v_u47,v_i47,'shape','mvp_features',E'Shipped v1:\n1. Audio upload (up to 2h)\n2. Automatic transcription via Whisper API\n3. AI show notes, timestamp list, and 3 social posts\n\nWorking as spec. Now building v2 with episode RSS import.',NOW()-INTERVAL '50 days'),
  (v_u47,v_i47,'shape','launch_target','Launched via Podcast hosting community on Facebook and Creator Economy Slack. 180 sign-ups day 1. 35 paying users at £9/month by end of week 2.',NOW()-INTERVAL '45 days'),

  (v_u48,v_i48,'hone','what','an IoT tyre monitoring service for haulage fleets that sends real-time pressure and temperature data to drivers and fleet managers — alerting before a blowout occurs',NOW()-INTERVAL '120 days'),
  (v_u48,v_i48,'hone','who','fleet managers at road haulage companies operating 10–100 HGVs who face costly tyre blowouts, unplanned downtime, and HSE compliance requirements',NOW()-INTERVAL '115 days'),
  (v_u48,v_i48,'hone','problem','tyre blowouts cause HGV accidents, £3,000+ in repair and recovery costs per incident, and regulatory investigations — but manual pressure checks are infrequent and often skipped under time pressure',NOW()-INTERVAL '110 days'),
  (v_u48,v_i48,'hone','outcome','zero preventable tyre blowouts — drivers alerted 2h before a tyre fails, fleet managers see full fleet tyre status in one dashboard, insurance premiums reduced by 8%',NOW()-INTERVAL '105 days'),
  (v_u48,v_i48,'shape','mvp_features',E'Shipped v1:\n1. Sensor hardware installation on fleet\n2. Real-time pressure + temperature dashboard per vehicle\n3. Driver alert via mobile app when threshold breached\n\nPilot complete with 3 fleets. Scaling to 8 more.',NOW()-INTERVAL '90 days'),
  (v_u48,v_i48,'shape','launch_target','Piloted with 3 haulage companies (40 vehicles). 0 blowouts in 90-day pilot vs 3 in equivalent period prior year. Now signing 6-month contracts at £18/vehicle/month.',NOW()-INTERVAL '85 days'),

  (v_u49,v_i49,'hone','what','a subscription analytics SaaS purpose-built for Shopify brands — churn prediction, cohort LTV, and MRR tracking with Shopify data connected in 5 minutes',NOW()-INTERVAL '100 days'),
  (v_u49,v_i49,'hone','who','Shopify DTC brands with subscription revenue of £10k–£500k MRR who are making retention decisions in spreadsheets or with generic analytics tools that don''t understand subscriptions',NOW()-INTERVAL '95 days'),
  (v_u49,v_i49,'hone','problem','Shopify''s native analytics are useless for subscription businesses — brands can''t see cohort retention, churn by acquisition source, or which products drive the highest LTV without building a data warehouse',NOW()-INTERVAL '90 days'),
  (v_u49,v_i49,'hone','outcome','every retention metric you need, ready in 5 minutes via Shopify OAuth — see exactly which cohorts churn fastest and which acquisition channels deliver the highest LTV',NOW()-INTERVAL '85 days'),
  (v_u49,v_i49,'shape','mvp_features',E'Shipped v1:\n1. Shopify OAuth connect (5-minute setup)\n2. Cohort retention grid by month of first subscription\n3. MRR, churn rate, and LTV by acquisition source\n\nLive with 22 paying customers at £79/month.',NOW()-INTERVAL '70 days'),
  (v_u49,v_i49,'shape','launch_target','Launched via Shopify Partner newsletter and DTC brand Slack communities. 300 sign-ups, 22 paid conversions in 30 days. On track for £2k MRR by end of month 2.',NOW()-INTERVAL '65 days'),

  (v_u50,v_i50,'hone','what','a remote notarisation platform for property transactions that lets buyers, sellers, and solicitors complete notarisation via video call with a certified notary — fully legally compliant in 12 EU jurisdictions',NOW()-INTERVAL '110 days'),
  (v_u50,v_i50,'hone','who','international property buyers and sellers in Europe, and the solicitors and notaries handling their transactions, who currently must travel in person for notarisation',NOW()-INTERVAL '105 days'),
  (v_u50,v_i50,'hone','problem','cross-border property transactions in the EU require in-person notarisation — buyers often fly internationally just to sign documents, adding £1,000–£5,000 in travel cost and 2–4 weeks in delay',NOW()-INTERVAL '100 days'),
  (v_u50,v_i50,'hone','outcome','complete property notarisation remotely via a 30-minute video call — legally valid in 12 EU countries, saving buyers an average of £2,400 and 3 weeks per transaction',NOW()-INTERVAL '95 days'),
  (v_u50,v_i50,'shape','mvp_features',E'Shipped v1:\n1. Identity verification and document upload pre-session\n2. Certified video notarisation session with qualified notary\n3. Tamper-proof digital notarial certificate issued post-session\n\nPilot complete. Legal review passed in 12 jurisdictions.',NOW()-INTERVAL '80 days'),
  (v_u50,v_i50,'shape','launch_target','Launched via partnerships with 3 international property law firms in Portugal, Spain, and Germany. 45 transactions completed in pilot. Average NPS: 71. Now onboarding 8 more law firm partners.',NOW()-INTERVAL '75 days');

  -- ── 9. Community posts ────────────────────────────────────────────────────

  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content) VALUES

  -- Validate stage: updates and questions
  (v_u21,v_i21,'validate','update','Talked to 4 finance managers this week about spend analytics. Every single one said they discover duplicate vendors at year-end — always too late. Validation is clear. Building now. [SEED50]'),
  (v_u23,v_i23,'validate','question','For those who''ve sold into fleet managers: how long is a typical sales cycle? Trying to plan my outreach cadence. [SEED50]'),
  (v_u25,v_i25,'validate','update','Two open source maintainers just agreed to beta test the AI PR reviewer. One manages FastAPI (50k GitHub stars). Moving fast. [SEED50]'),
  (v_u27,v_i27,'validate','win','First vet practice agreed to recommend the app to their patients! 800 registered pet owners. This feels real now. [SEED50]'),
  (v_u29,v_i29,'validate','win','Coffee shop owner set up the loyalty programme in 47 minutes and sent it to her regulars the same afternoon. First 12 signups in 2 hours. [SEED50]'),
  (v_u30,v_i30,'validate','update','Remote physio pilot starting next week with 8 patients. NHS physio is joining as a clinical advisor. Feeling good about this. [SEED50]'),
  (v_u31,v_i31,'validate','question','Anyone know the fastest way to get DBS check results for childminder listings? Current process takes 3 weeks. [SEED50]'),
  (v_u33,v_i33,'validate','update','Ran a sustainability challenge pilot with a 60-person team. 78% participation in week 1. HR director called it the most engaged any company initiative had ever been. [SEED50]'),
  (v_u35,v_i35,'validate','win','API v1 is live. First customer (a Lagos fintech) just processed their first payment routed through our gateway aggregator. 3 countries, 1 API call. [SEED50]'),

  -- Shape stage: updates
  (v_u36,v_i36,'shape','update','First draft of the charity grant assistant generated a £25k Arts Council application in 18 minutes. The fundraiser said it would have taken her 3 days. [SEED50]'),
  (v_u38,v_i38,'shape','update','Onboarded 5 startups into contract CLM beta. Average: 34 contracts uploaded per company in first week. Two already caught contracts that were auto-renewing without their knowledge. [SEED50]'),
  (v_u40,v_i40,'shape','win','First producer hit 100 subscribers on the platform today. That''s £900/month in recurring income he never had before. This is working. [SEED50]'),
  (v_u42,v_i42,'shape','update','Product Hunt launch tomorrow for the AI interview coach. Got 8 hunters lined up. Nervous but ready. [SEED50]'),
  (v_u44,v_i44,'shape','update','Host managing 9 properties saved 1.5 hours per day in week 1 of the beta. That''s the clearest signal I''ve had. Building as fast as I can. [SEED50]'),

  -- Done stage: wins
  (v_u46,v_i46,'done','win','200 sign-ups in 4 days. 60 documents sent. First paying customer upgraded to the unlimited plan. We are live and people love it. [SEED50]'),
  (v_u47,v_i47,'done','win','35 paying podcasters in 2 weeks. £315 MRR. From idea to revenue in 6 weeks. This is the best feeling. [SEED50]'),
  (v_u48,v_i48,'done','win','Pilot complete — zero blowouts in 90 days across 40 vehicles. First 6-month contract signed today. £7,200 ARR from one customer. [SEED50]'),
  (v_u49,v_i49,'done','win','£1,738 MRR and 22 paying customers. Shopify analytics was a real gap and we filled it. Now focused on reducing time-to-value to under 10 minutes. [SEED50]'),
  (v_u50,v_i50,'done','win','45 property transactions notarised remotely. Average saving per buyer: £2,400 and 3 weeks. One client said it was the smoothest property purchase of their life. Building something real. [SEED50]'),

  -- Hone stage: questions
  (v_u11,v_i11,'hone','question','How many user interviews do you typically do before you feel confident you''ve validated a problem? I''m at 6 and still hearing new things. [SEED50]'),
  (v_u14,v_i14,'hone','update','Interviewed 5 parents with allergic kids this week. All 5 said they''ve had a reaction incident from a commercial meal kit. The problem is very real. [SEED50]'),
  (v_u16,v_i16,'hone','question','Has anyone navigated FCA authorisation for a pension product in the UK? Trying to understand if I need full authorisation or can partner with an existing SIPP provider. [SEED50]'),
  (v_u19,v_i19,'hone','update','Spoke to 4 therapists about the journaling app. All 4 said they''d recommend it to clients. Two asked if they could be notified immediately if a client''s mood drops sharply. Adding that to v1. [SEED50]'),
  (v_u20,v_i20,'hone','update','Visited 3 vertical farms this week. One is managing 280 sensors in Google Sheets. This is the kind of pain that makes me excited to build. [SEED50]');

  -- Auto-approve all seeded ideas so they appear in the community feed
  UPDATE ideas SET moderation_status = 'approved'
  WHERE user_id IN (
    v_u1,v_u2,v_u3,v_u4,v_u5,v_u6,v_u7,v_u8,v_u9,v_u10,
    v_u11,v_u12,v_u13,v_u14,v_u15,v_u16,v_u17,v_u18,v_u19,v_u20,
    v_u21,v_u22,v_u23,v_u24,v_u25,v_u26,v_u27,v_u28,v_u29,v_u30,
    v_u31,v_u32,v_u33,v_u34,v_u35,v_u36,v_u37,v_u38,v_u39,v_u40,
    v_u41,v_u42,v_u43,v_u44,v_u45,v_u46,v_u47,v_u48,v_u49,v_u50
  );

  RAISE NOTICE 'Seed complete: 50 users, 50 ideas, stage entries, contacts, and community posts inserted.';

END $$;
