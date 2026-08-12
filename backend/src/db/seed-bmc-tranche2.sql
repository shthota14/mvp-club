-- ============================================================
-- BMC + Business Domain — Tranche 2: ideas 11–20 (hone stage)
-- Run: docker compose exec -T db psql -U mvpclub -d mvpclub < backend/src/db/seed-bmc-tranche2.sql
-- ============================================================

-- ── 11. Noah · AI meeting notes and action tracker ───────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='noah.p@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Team leads and managers at companies of 10–200 people\nRemote-first teams using Zoom, Google Meet, or Teams\nProject managers tracking action items across multiple workstreams\nAgencies and consultancies running client calls'),
  ('bmc_value',       E'Joins calls silently — no bot awkwardness\nStructured summary with named action items sent before the call ends\nSearchable archive of every meeting, decision, and action\nIntegrates with Slack, Notion, and Jira to push actions automatically\nFrees managers from note-taking so they can actually be present'),
  ('bmc_channels',    E'Product Hunt and Hacker News launch\nSlack App Directory\nZoom and Google Workspace Marketplace\nLinkedIn outreach to team leads and chiefs of staff\nWord of mouth — first user shares summary, teammates want in'),
  ('bmc_cr',          E'Every meeting creates a new artefact users come back to review\nAction item follow-up reminders drive daily return visits\nTeam-wide usage creates network effects within a company\nWeekly meeting digest email\nSlack integration means the product lives where the team already works'),
  ('bmc_revenue',     E'Free: 5 meetings/month, 1 user\nPro £12/user/month: unlimited meetings, integrations\nTeam £10/user/month (min 5 users): shared workspace, admin controls\nEnterprise: SSO, audit logs, data residency — custom pricing\nAnnual discount: 2 months free'),
  ('bmc_activities',  E'Real-time transcription and summarisation (LLM)\nCalendar and meeting platform integrations (Zoom, Meet, Teams)\nAction item extraction and assignment\nIntegration with task managers (Jira, Linear, Notion)\nEnterprise compliance: data residency, GDPR'),
  ('bmc_resources',   E'Real-time transcription infrastructure (Whisper or Deepgram)\nLLM for summarisation and action extraction\nMeeting platform integrations (Zoom, Meet, Teams)\nCalendar API integrations\nEnterprise security and compliance infrastructure'),
  ('bmc_partners',    E'Zoom, Google, Microsoft (marketplace distribution)\nNotion, Jira, Linear, Asana (action integration partners)\nSlack (notification and sharing partner)\nEnterprise SSO providers (Okta, Auth0)\nVoice transcription providers (Deepgram, AssemblyAI)'),
  ('bmc_costs',       E'Transcription API costs (per meeting minute)\nLLM inference costs\nCalendar and meeting platform API fees\nEngineering: integrations and reliability\nMarketing and Product Hunt launch costs\nEnterprise security infrastructure')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='b2b-saas' WHERE user_id=(SELECT id FROM users WHERE email='noah.p@seed50.dev');

-- ── 12. Lena · Peer-to-peer language exchange ────────────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='lena.f@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Adults aged 22–40 learning a second language for career or relocation\nProfessionals who need conversational fluency, not just grammar\nPeople who find Duolingo too gamified and tutors too expensive\nExpats and immigrants wanting to improve their adopted language'),
  ('bmc_value',       E'60-minute sessions split equally: 30 min your target language, 30 min theirs\nMatched on level, schedule, goals, and interests — not random\nStructured conversation prompts for every session level\nFree — both sides benefit equally, no money changes hands\nReal human connection: more motivating than an app'),
  ('bmc_channels',    E'Language learning subreddits (r/languagelearning, r/French)\nDuolingo community forums\nExpat Facebook Groups\nUniversity language departments\nApp Store under "language exchange"'),
  ('bmc_cr',          E'Recurring weekly schedule creates strong habit\nPartner accountability: don''t want to let your partner down\nProgress tracking: fluency score after every session\nCommunity leaderboard: streak and session count\nMatching algorithm improves with each session rating'),
  ('bmc_revenue',     E'Free matching and sessions always\nPremium £7.99/month: priority matching, session recording, progress analytics\nGroup sessions £4.99/session: 4-person themed conversation circles\nEnterprise: language exchange programme for corporate teams (£15/employee/month)\nAffiliate: language learning tools and courses'),
  ('bmc_activities',  E'Matching algorithm development and tuning\nConversation prompt library creation (by level and topic)\nVideo calling infrastructure or integration\nCommunity moderation and safety\nPartner retention and re-matching when partnerships break down'),
  ('bmc_resources',   E'Matching algorithm (language pair, level, schedule, interests)\nConversation prompt library (1,000+ prompts across levels and languages)\nVideo calling integration (Daily.co or Whereby)\nCommunity moderation team\nLanguage level assessment tool'),
  ('bmc_partners',    E'Language schools and universities (distribution)\nDuolingo and Babbel (potential integration or referral)\nVideo calling infrastructure providers\nCultural and language exchange organisations\nCorporate L&D departments'),
  ('bmc_costs',       E'Video calling infrastructure\nMatching algorithm engineering\nContent creation: conversation prompt library\nMarketing: language learning communities\nCommunity moderation\nApp development and hosting')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='edtech' WHERE user_id=(SELECT id FROM users WHERE email='lena.f@seed50.dev');

-- ── 13. Omar · Construction site safety via computer vision ──────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='omar.h@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'H&S managers at mid-size construction firms (50–500 workers)\nPrincipal contractors liable for site compliance\nFacilities management companies with large maintenance crews\nManufacturing plants with PPE and restricted zone requirements'),
  ('bmc_value',       E'Continuous 24/7 PPE and zone monitoring from existing site cameras\nReal-time alerts in under 3 seconds when a violation is detected\nFull audit trail: timestamped evidence for HSE inspections\nReduces reportable incidents by 60% in pilot sites\nCuts insurance premiums by 8–12% after 12 months of clean data'),
  ('bmc_channels',    E'Direct outreach to H&S directors and site managers\nConstruction industry trade press (Construction News, Building)\nHSE-approved partner programme\nInsurance broker partnerships (risk reduction angle)\nConstruction trade shows (UK Construction Week)'),
  ('bmc_cr',          E'Monthly compliance report keeps H&S managers coming back\nAlert dashboard is checked daily — high engagement product\nAnnual HSE audit pack export creates switching cost\nInsurance discount letter each year reinforces ROI\nCustomer success check-in every quarter'),
  ('bmc_revenue',     E'SaaS: £299/camera/month (includes monitoring and alerts)\nOnboarding and installation: £500 one-off per site\nAnnual compliance report pack: £199\nEnterprise: multi-site management dashboard + custom pricing\nInsurance partnership: revenue share on premium reductions'),
  ('bmc_activities',  E'Computer vision model training for PPE and zone detection\nCamera integration (RTSP streams from existing CCTV)\nAlert and escalation workflow development\nCompliance report generation\nSite onboarding and camera calibration'),
  ('bmc_resources',   E'Computer vision models (PPE detection, zone breach)\nCCTV / camera integration infrastructure\nReal-time alert pipeline\nCompliancereport generation engine\nH&S advisory board for accuracy standards'),
  ('bmc_partners',    E'Insurance brokers and underwriters (risk reduction angle)\nCCTV and security camera vendors\nHSE and safety standards bodies\nPrincipal contractor frameworks (Tier 1 contractors)\nSite management software (Procore, Asite) for integration'),
  ('bmc_costs',       E'Computer vision model development and inference\nCamera integration engineering\nCloud infrastructure for real-time video processing\nH&S advisory board and accuracy auditing\nEnterprise sales and site onboarding\nMarketing: trade press and events')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='b2b-saas' WHERE user_id=(SELECT id FROM users WHERE email='omar.h@seed50.dev');

-- ── 14. Isabella · Allergy-safe recipe box subscription ──────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='isabella.c@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Parents with children with serious food allergies (nut, dairy, gluten, egg)\nFamilies managing multiple concurrent allergen profiles\nAdults with late-onset allergies wanting to cook interestingly again\nDietitians and allergy clinics wanting to refer patients'),
  ('bmc_value',       E'Every ingredient triple-checked against your exact allergen profile\nNo ambiguous "may contain" warnings — every item verified at source\nInteresting, restaurant-quality recipes — not just safe but delicious\nNew menu every week — no recipe fatigue\nEliminate the anxiety of label-reading for every meal'),
  ('bmc_channels',    E'Allergy UK and Anaphylaxis UK community partnerships\nAllergy clinic referrals\nFacebook groups for allergy parents\nInstagram recipes — visually appealing allergen-free food\nGP and dietitian referral programme'),
  ('bmc_cr',          E'Weekly delivery creates the strongest possible habit\nRecipe rating system personalises future menus\n"Safe to eat" guarantee creates deep trust\nFamily allergen profile updates handled by customer care team\nLoyalty: 6-month subscribers get dedicated allergy advisor'),
  ('bmc_revenue',     E'2-person box £45/week, 4-person box £75/week\nAdd-on: snack pack £15/week\nDietitian consultation add-on: £39 one-off\nCorporate: catering for allergy-aware office lunches\nWhite-label for NHS allergy clinics'),
  ('bmc_activities',  E'Allergen verification at source for every ingredient\nMenu development by allergy-trained chefs\nWeekly ingredient sourcing and quality control\nCustomer allergen profile management\nFulfilment and cold-chain delivery'),
  ('bmc_resources',   E'Allergen-verified supplier network\nAllergy-trained chefs and nutritionists\nAllergen database and verification system\nFulfilment centre with strict cross-contamination controls\nCustomer care team for profile management'),
  ('bmc_partners',    E'Allergy UK and Anaphylaxis UK\nGP practices and allergy clinics (referral)\nAllergy-verified food suppliers and wholesalers\nCold-chain logistics partners\nDietitian network for consultation add-on'),
  ('bmc_costs',       E'Ingredient sourcing (allergen-verified premium costs more)\nFulfilment and cross-contamination control\nCold-chain delivery\nChef team for weekly menu development\nMarketing: allergy community and clinic outreach\nAllergen verification auditing')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='foodtech' WHERE user_id=(SELECT id FROM users WHERE email='isabella.c@seed50.dev');

-- ── 15. Raj · Real estate data API for emerging markets ──────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='raj.m@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Proptech startups building products for Asian emerging markets\nReal estate investment platforms needing market data\nPrivate equity and family offices allocating to Asian property\nAnalyst teams at banks and fund managers covering emerging markets'),
  ('bmc_value',       E'Aggregated, normalised property price and rental yield data via REST API\n50+ cities across South and Southeast Asia\nUpdated weekly with 5-year historical depth\nOne API call replaces weeks of manual data collection\nAll data in a consistent schema regardless of source country'),
  ('bmc_channels',    E'Developer community (Product Hunt, Hacker News, dev newsletters)\nRapidAPI and API marketplaces\nDirect outreach to proptech CTOs and data teams\nReal estate investment conference presence\nLinkedIn content on Asian property market data'),
  ('bmc_cr',          E'API key creates immediate switching cost after integration\nMonthly changelog email keeps developers engaged\nUsage dashboard shows data freshness and call volume\nDedicated Slack channel for enterprise customers\nWebhook alerts for significant market movements'),
  ('bmc_revenue',     E'Starter £299/month: 10 cities, 10,000 calls/month\nGrowth £699/month: 30 cities, 100,000 calls/month\nEnterprise £1,999/month: all cities, unlimited, SLA, raw data exports\nData licensing (bulk historical): £5,000 one-off per market\nCustom city data collection: £2,500 setup + monthly fee'),
  ('bmc_activities',  E'Data collection: scraping, partnerships, and normalisation per market\nAPI infrastructure development and maintenance\nData quality assurance and freshness monitoring\nNew city / country expansion\nEnterprise customer success'),
  ('bmc_resources',   E'Data engineering team (collection, normalisation, QA)\nAPI infrastructure (high availability, low latency)\nLocal data partnerships in each market\nLegal entity per country for data licensing\nEnterprise sales team'),
  ('bmc_partners',    E'Local property portals in each market (data licensing)\nReal estate associations per country\nCloud data marketplaces (AWS Data Exchange)\nProptech accelerators in Singapore and India\nProperty analytics firms for co-sell'),
  ('bmc_costs',       E'Data collection and normalisation engineering\nLocal market partnerships and data licensing fees\nAPI infrastructure (cloud, CDN, reliability)\nLegal entities and compliance per market\nEnterprise sales and customer success\nNew market expansion costs')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='proptech' WHERE user_id=(SELECT id FROM users WHERE email='raj.m@seed50.dev');

-- ── 16. Chloe · Micro-pension for gig workers ────────────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='chloe.d@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'UK and EU freelancers and gig workers aged 20–40 with no employer pension\nDelivery drivers, Uber drivers, and platform workers\nSelf-employed tradespeople and contractors\nFreelance creatives and consultants with irregular income'),
  ('bmc_value',       E'Auto-rounds up every payment you receive and sweeps spare change into pension\nNo lump sum decisions — savings happen automatically per payment\nAverage user saves £900/year without noticing\nFCA-regulated SIPP wrapper with low-cost index fund options\nFull visibility: see your pot grow in real time'),
  ('bmc_channels',    E'Gig platform communities (Uber, Deliveroo driver forums)\nFreelancer newsletters and communities (Freelancer Magazine, IPSE)\nAccountants and bookkeepers who serve self-employed clients\nApp Store under "pension" and "savings"\nFCA-approved financial promotion channels'),
  ('bmc_cr',          E'Automatic round-ups require no active decision — set and forget\nMonthly "you saved £X this month without trying" notification\nAnnual pot milestone emails: "your first £1,000!"\nTax relief top-up notifications (government adds 25% to contributions)\nFuture self projection: "at this rate you''ll retire with £X"'),
  ('bmc_revenue',     E'0.5% annual management fee on pot value\nPremium £2.99/month: investment choice, higher round-up cap, pension forecast tools\nB2B: gig platforms pay to offer as a worker benefit (£1/worker/month)\nReferral: £25 per referred friend who activates\nFuture: annuity and drawdown products at retirement'),
  ('bmc_activities',  E'Open Banking integration for payment detection and round-ups\nSIPP administration and FCA compliance\nInvestment management (fund selection and rebalancing)\nGig platform B2B partnerships\nRegulatory reporting and pension administration'),
  ('bmc_resources',   E'FCA authorisation and SIPP trustee structure\nOpen Banking API integration (payment detection)\nInvestment platform / fund administration partner\nActuarial and compliance team\nGig platform partnership team'),
  ('bmc_partners',    E'FCA-regulated SIPP provider (as trustee partner)\nOpen Banking providers (Plaid, TrueLayer)\nGig platforms (Uber, Deliveroo, Fiverr)\nIndex fund providers (Vanguard, BlackRock)\nISPE and freelancer unions for distribution'),
  ('bmc_costs',       E'FCA authorisation and ongoing compliance\nSIPP administration costs (trustee, actuary)\nOpen Banking API costs\nInvestment platform fees\nMarketing: gig worker communities\nCustomer support for pension queries')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='fintech' WHERE user_id=(SELECT id FROM users WHERE email='chloe.d@seed50.dev');

-- ── 17. Kwame · Developer docs search engine ─────────────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='kwame.a@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Software developers spending 20–40% of their day in documentation\nJunior developers overwhelmed by fragmented official docs\nFull-stack developers switching between many frameworks and languages\nDeveloper experience teams wanting better internal doc search'),
  ('bmc_value',       E'Search all major developer docs simultaneously in natural language\nVersion-specific answers — specify "React 18" not "latest"\nCode examples surfaced inline — not buried 3 clicks deep\nAnswer confidence score and source links for verification\nChrome extension: search from anywhere without tab switching'),
  ('bmc_channels',    E'Product Hunt and Hacker News (developer community)\nChrome Web Store\nDev Twitter and developer newsletters\nVSCode extension marketplace\nGitHub sponsorship and README mentions'),
  ('bmc_cr',          E'Chrome extension creates daily usage habit\nSearch history and saved answers build personalised reference\nTeam workspaces: share searches and annotate answers\nWeekly "most searched this week" developer newsletter\nAPIaccess: power users build their own integrations'),
  ('bmc_revenue',     E'Free: unlimited searches, top 3 sources\nPro £8/month: full source list, version pinning, search history, team shares\nTeam £6/user/month (min 5): shared workspace, admin controls\nEnterprise: private docs indexing, SSO, SLA — custom pricing\nAnnual: 2 months free'),
  ('bmc_activities',  E'Documentation crawler and indexing pipeline (freshness critical)\nSemantic search model fine-tuned on technical content\nVersion detection and filtering\nChrome and VSCode extension development\nEnterprise: private documentation indexing'),
  ('bmc_resources',   E'Web crawler and indexing infrastructure\nSemantic search model (fine-tuned on code and docs)\nChrome and VSCode extensions\nDocs freshness monitoring system\nAPI infrastructure for team and enterprise tiers'),
  ('bmc_partners',    E'Major framework maintainers (React, Vue, Django) for official indexing permission\nChrome Web Store and VSCode Marketplace\nDeveloper tool companies for bundle deals\nGitHub for README integration\nCloud providers for infrastructure credits'),
  ('bmc_costs',       E'Crawler and indexing infrastructure\nSemantic search model training and inference\nStorage for indexed documentation at scale\nExtension development and maintenance\nMarketing: developer community content\nEnterprise sales')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='devtools' WHERE user_id=(SELECT id FROM users WHERE email='kwame.a@seed50.dev');

-- ── 18. Nina · Secondhand luxury authentication ───────────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='nina.v@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Buyers on Vinted, Depop, eBay, and Vestiaire purchasing luxury items >£200\nSellers wanting to increase sale price with a credibility certificate\nLuxury resale platforms wanting to offer authentication as a feature\nPawn shops and secondhand dealers handling luxury goods'),
  ('bmc_value',       E'Human expert review from ex-brand specialists in 24 hours\nDigital certificate shareable with buyers to increase sale price by 18%\nPhoto-based submission — no shipping required\nTamper-proof certificate with QR code for buyer verification\nEliminates chargeback disputes and returns from authenticity claims'),
  ('bmc_channels',    E'Vestiaire Collective, Vinted, and eBay seller communities\nLuxury fashion Instagram and resale influencers\nPartnership with resale platforms (B2B authentication API)\nGoogle Ads: "authenticate Louis Vuitton bag"\nLuxury consignment shops direct outreach'),
  ('bmc_cr',          E'Sellers return every time they list a new item\nCertificate QR code creates ongoing brand presence with buyers\nReferral: seller shares certificate publicly, buyers discover service\nPlatform B2B partnerships create automatic repeat usage\nEmail series: "your Chanel bag sold for 22% more — here''s why"'),
  ('bmc_revenue',     E'Tier 1 (under £500 item): £19 per authentication\nTier 2 (£500–£2,000): £39 per authentication\nTier 3 (£2,000+): £79 per authentication\nPlatform API: resale platforms pay per certificate issued (volume pricing)\nSubscription for high-volume sellers: £99/month for 10 auths'),
  ('bmc_activities',  E'Expert specialist recruitment and training\nPhoto review workflow and certificate generation\nBrand-specific authentication knowledge base maintenance\nPlatform API development for B2B tier\nQuality control and dispute resolution'),
  ('bmc_resources',   E'Network of ex-brand authentication specialists (Chanel, LV, Rolex, etc.)\nAuthentication knowledge base per brand\nPhoto review and certificate generation platform\nTamper-proof digital certificate infrastructure\nBrand partnership relationships for knowledge accuracy'),
  ('bmc_partners',    E'Resale platforms (Vestiaire, Vinted, eBay) for B2B integration\nEx-brand specialist network\nDigital certificate and blockchain verification providers\nLuxury brand legal teams (for knowledge base accuracy)\nConsignment shop networks'),
  ('bmc_costs',       E'Expert specialist fees (per review)\nKnowledge base development and maintenance\nPlatform and certificate infrastructure\nMarketing: resale communities and platforms\nQuality control and dispute resolution team\nLegal: brand relationship management')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='marketplace' WHERE user_id=(SELECT id FROM users WHERE email='nina.v@seed50.dev');

-- ── 19. Lucas · Mental health journaling with therapist escalation ────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='lucas.a@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'People in therapy aged 18–35 who want continuity between sessions\nAnxiety and depression sufferers who struggle to journal without structure\nTherapists wanting better between-session visibility for their clients\nUniversity counselling services wanting student mental health monitoring'),
  ('bmc_value',       E'Structured daily prompts remove the blank page barrier\nMood tracking builds a pattern therapists can actually use\nAutomatic escalation alert to linked therapist if distress pattern detected\nClient and therapist share the same data — no more "how was your week?"\nReduces crisis incidents by catching declining patterns early'),
  ('bmc_channels',    E'Therapist referral (primary — therapist recommends to client)\nBAPP and BACP therapist association partnerships\nUniversity mental health services\nMental health app directories\nPeer referral among therapy clients'),
  ('bmc_cr',          E'Daily prompt creates the strongest possible habit loop\nTherapist link creates accountability — you don''t want to go dark\nWeekly mood pattern email keeps users engaged\nMilestones: "30 consecutive days journaling"\nTherapist can leave comments on journal entries (with consent)'),
  ('bmc_revenue',     E'Individual £6.99/month (client)\nTherapist dashboard £19.99/month: unlimited linked clients, escalation alerts\nPractice licence £149/month: up to 20 therapists\nUniversity / NHS contract: per-student per-year pricing\nEnterprise EAP: per-employee per-year'),
  ('bmc_activities',  E'Mood pattern AI: detecting distress signals in journal entries and scores\nEscalation workflow: alert to linked therapist or emergency contact\nTherapist dashboard development\nClinical advisory board for safety protocols\nGDPR and clinical data compliance'),
  ('bmc_resources',   E'Mood tracking and NLP distress detection models\nTherapist dashboard and client linking infrastructure\nEscalation protocol and clinical advisory board\nGDPR-compliant clinical data infrastructure\nPrompt library developed with clinical psychologists'),
  ('bmc_partners',    E'BACP and BAPP (therapist associations for distribution)\nUniversity counselling services\nEAP providers (employee assistance programmes)\nNHS IAPT services\nMental health charities for grant co-applications'),
  ('bmc_costs',       E'Clinical advisory board and safety protocol maintenance\nNLP and mood detection model development\nGDPR-compliant infrastructure (clinical data is regulated)\nMarketing: therapist association partnerships\nUniversity and NHS sales cycles (long but high value)\nCustomer support with clinical safeguarding training')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='healthtech' WHERE user_id=(SELECT id FROM users WHERE email='lucas.a@seed50.dev');

-- ── 20. Fatima · Vertical farm management SaaS ───────────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='fatima.z@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Operators of small to mid-size vertical farms (500–5,000 m²)\nHydroponic and aeroponic growing operations\nAgri-food companies with indoor growing facilities\nRestaurant groups running their own micro-farms for fresh produce'),
  ('bmc_value',       E'Aggregate all IoT sensor data into one real-time dashboard\nAutomate grow-cycle scheduling — never miss an optimal harvest window\nYield and waste analytics per crop and grow zone\nPredictive alerts: "Zone 3 humidity dropping — check irrigation in 4h"\nIncreases yield per m² by 15–25% and reduces crop loss'),
  ('bmc_channels',    E'Vertical farming industry conferences (Vertical Farming World Congress)\nIndoor AgTech publications and newsletters\nDirect outreach to vertical farm founders on LinkedIn\nHardware IoT sensor vendors (bundle with their sensors)\nAgri-food innovation accelerators'),
  ('bmc_cr',          E'Dashboard is checked multiple times daily by grow managers\nAutomated alerts create dependency on the platform for safety\nAnnual yield improvement report demonstrates ROI clearly\nCustomer success agronomist assigned to each farm\nAPI access for power users building custom integrations'),
  ('bmc_revenue',     E'SaaS £299/month: up to 10 grow zones, 50 sensors\nSaaS £599/month: up to 30 zones, 200 sensors, predictive alerts\nEnterprise £1,499/month: unlimited zones, multi-site, API access\nProfessional services: farm setup and sensor calibration £1,500\nData insights: anonymised benchmarking reports for the industry'),
  ('bmc_activities',  E'IoT sensor integration (temperature, humidity, CO2, light, EC, pH)\nGrow-cycle scheduling engine\nPredictive alert model training\nAgronomist customer success programme\nHardware partnership integrations'),
  ('bmc_resources',   E'IoT integration library (compatible with major sensor brands)\nGrow-cycle and scheduling engine\nAgronomist team for customer success\nML models for yield prediction and anomaly detection\nCloud infrastructure for real-time sensor data ingestion'),
  ('bmc_partners',    E'IoT sensor manufacturers (Aranet, Sensirion, Atlas Scientific)\nVertical farming hardware vendors (LED, HVAC)\nAgri-food innovation funds and accelerators\nUniversity agricultural engineering departments\nFood retailers wanting supply chain transparency'),
  ('bmc_costs',       E'Engineering: IoT integration and scheduling engine\nCloud infrastructure for real-time data at scale\nAgronomist customer success team\nML model training and inference\nMarketing: industry conferences and content\nHardware partnership development')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='agritech' WHERE user_id=(SELECT id FROM users WHERE email='fatima.z@seed50.dev');

SELECT 'Tranche 2 complete: BMC + domains set for ideas 11-20' AS status;
