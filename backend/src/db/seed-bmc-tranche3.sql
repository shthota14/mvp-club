-- ============================================================
-- BMC + Business Domain — Tranche 3: ideas 21–30 (validate stage)
-- Run: docker compose exec -T db psql -U mvpclub -d mvpclub < backend/src/db/seed-bmc-tranche3.sql
-- ============================================================

-- ── 21. Alex · B2B spend analytics ───────────────────────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='alex.j@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'CFOs and finance managers at SMEs with 10–150 employees\nOperations leads managing supplier relationships\nStartups that have grown beyond spreadsheet spend tracking\nAccountants managing books for multiple SME clients'),
  ('bmc_value',       E'Connect Xero or QuickBooks — anomalous spend, duplicates, and savings flagged automatically\nWeekly digest lands in your inbox before you even know to look\nAverage finding: £8k in recoverable spend per quarter\nNo setup beyond OAuth — works with your existing accounting data\nFirst report delivered within 24 hours of connecting'),
  ('bmc_channels',    E'Xero App Store and QuickBooks App Store\nAccountant partner channel (refer client, earn recurring commission)\nCFO LinkedIn community and newsletters\nDirect outreach to finance managers at 20–100 person companies\nSEO: "duplicate vendor detection Xero"'),
  ('bmc_cr',          E'Weekly email digest creates recurring touchpoint without login required\nSavings leaderboard: "you''ve recovered £X this quarter"\nAccountant view: white-label digest sent to their client on your behalf\nAnnual savings report shareable with board\nAlert integrations: Slack notification when anomaly detected'),
  ('bmc_revenue',     E'Starter £79/month: 1 accounting connection, weekly digest\nPro £149/month: 3 connections, real-time alerts, Slack integration\nAccountant bundle: £49/client/month (min 5 clients)\nEnterprise: multi-entity, custom data warehouse export — custom pricing\nAnnual: 2 months free'),
  ('bmc_activities',  E'Accounting API integrations (Xero, QuickBooks, Sage)\nAnomaly detection model training on spend patterns\nWeekly digest generation and delivery\nAccountant partner programme\nEnterprise multi-entity support'),
  ('bmc_resources',   E'Accounting software API integrations\nAnomaly detection and categorisation models\nDigest generation and email delivery infrastructure\nAccountant partner programme team\nEnterprise sales team'),
  ('bmc_partners',    E'Xero and QuickBooks (App Store distribution)\nAccounting firms (partner channel — high leverage)\nCFO communities and networks\nBusiness banking providers for bundle deals\nProcurement software for downstream workflow'),
  ('bmc_costs',       E'Accounting API integration engineering\nAnomaly detection model development\nEmail infrastructure and digest generation\nMarketing: App Store optimisation and accountant outreach\nCustomer success team\nEnterprise sales')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='fintech' WHERE user_id=(SELECT id FROM users WHERE email='alex.j@seed50.dev');

-- ── 22. Mia · On-demand personal styling via video ───────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='mia.c@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Women aged 28–45 stuck in a style rut or overwhelmed by wardrobe choices\nNew professionals who want to dress appropriately but don''t know how\nPost-pregnancy returners rebuilding their wardrobe and confidence\nPeople who waste money on clothes that never get worn'),
  ('bmc_value',       E'30-minute video session with a certified stylist who reviews your actual wardrobe\nSpecific items to buy next — with links, not vague advice\nBudget-aware: tell us your budget and we work with it\n£35 per session vs £200+ for an in-person stylist\nYou leave with a clear plan, not just inspiration'),
  ('bmc_channels',    E'Instagram and Pinterest (style content — natural habitat)\nMotherhood communities and return-to-work forums\nCorporate employee benefits platforms\nWord of mouth: "my stylist recommended this"\nTikTok before/after wardrobe transformations'),
  ('bmc_cr',          E'Seasonal wardrobe reviews create 4× per year repeat bookings\n"Your capsule wardrobe" PDF sent after session creates lasting reference\nStyle profile saved — next stylist knows your history\nReferral: get a free session when a friend books their first\nCorporate clients: quarterly team sessions create recurring contract'),
  ('bmc_revenue',     E'Standard session £35 (30 minutes)\nPremium £65 (60 minutes, includes shopping list with links)\nBundle: 4 sessions £120 (save £20)\nCorporate: style sessions as employee benefit £25/employee/quarter\nAffiliate: commission from recommended brand purchases'),
  ('bmc_activities',  E'Stylist recruitment, vetting, and certification training\nMatching algorithm (style goals, budget, aesthetic preference)\nVideo call infrastructure\nShopping list and recommendation content after each session\nStylist quality control and rating system'),
  ('bmc_resources',   E'Network of certified stylists (freelance, vetted)\nMatching algorithm\nVideo call platform integration\nStyle profile database per customer\nAffiliate relationships with fashion retailers'),
  ('bmc_partners',    E'Fashion retailers for affiliate commissions (ASOS, & Other Stories, etc.)\nVideo call infrastructure (Zoom API or Daily.co)\nCorporate HR and benefits platforms\nStyle schools and fashion colleges for stylist recruitment\nFashion subscription boxes for cross-promotion'),
  ('bmc_costs',       E'Stylist fees (revenue share — 60% of session fee to stylist)\nVideo infrastructure\nMarketing: Instagram content and ads\nStylist training and quality control\nMatching algorithm development\nCustomer support')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='consumer' WHERE user_id=(SELECT id FROM users WHERE email='mia.c@seed50.dev');

-- ── 23. Tom · EV fleet management for logistics SMEs ─────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='tom.w@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Logistics SMEs with 5–50 electric delivery vehicles\nFood and grocery delivery operators transitioning from diesel\nLocal authority fleet managers electrifying last-mile vehicles\nLarge retailer''s last-mile delivery partners'),
  ('bmc_value',       E'Route optimisation that accounts for charge state and range — no driver stranded\nAutomatic charge scheduling around route windows and off-peak tariffs\nDriver behaviour scoring: regenerative braking, speed, efficiency\nFleet manager dashboard: live vehicle location, charge status, ETA\nCuts total fleet energy cost by 18% vs unoptimised charging'),
  ('bmc_channels',    E'EV leasing company partnerships (bundled software offer)\nLogistics industry trade press and events\nCharge point network partners (Pod Point, bp pulse)\nDirect outreach to fleet managers at delivery SMEs\nDepartment for Transport EV grant programme ecosystem'),
  ('bmc_cr',          E'Daily route planning creates essential morning usage\nDriver app creates two-sided engagement (manager + driver)\nMonthly fleet efficiency report demonstrates ROI\nAlert: "Vehicle 7 needs charge before tomorrow''s route — scheduling now"\nAnnual renewal with 20% discount for multi-year commitment'),
  ('bmc_revenue',     E'SaaS £80/vehicle/month (min 5 vehicles)\nSetup and data migration: £500 one-off\nDriver app: included in vehicle licence\nCharge point integration premium: £15/charge point/month\nEnterprise multi-depot: custom pricing'),
  ('bmc_activities',  E'EV route optimisation algorithm (range, charge state, charge point availability)\nCharge scheduling engine (off-peak tariff integration)\nTelematics integration (OBD2 or manufacturer API)\nCharge point network API integrations\nFleet manager and driver mobile apps'),
  ('bmc_resources',   E'EV range and route optimisation models\nCharge point network API integrations (Pod Point, Osprey, bp pulse)\nTelematics and OBD2 integration library\nFleet management and driver apps\nEnterprise sales team'),
  ('bmc_partners',    E'EV leasing companies (software bundled with vehicle lease)\nCharge point networks (Pod Point, bp pulse, Osprey)\nVehicle manufacturers (API access for charge state data)\nEnergy retailers (off-peak tariff optimisation)\nLogistics software (route planning integration: Onfleet, Circuit)'),
  ('bmc_costs',       E'Route optimisation and charge scheduling algorithm engineering\nTelematics and charge point API integrations\nMobile app development (manager + driver)\nMarketing: fleet manager events and outreach\nEnterprise sales team\nCloud infrastructure for real-time fleet data')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='cleantech' WHERE user_id=(SELECT id FROM users WHERE email='tom.w@seed50.dev');

-- ── 24. Zara · Freelance invoice financing marketplace ───────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='zara.i@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Freelancers and sole traders with 30–90 day payment terms\nBoutique agencies with large enterprise clients paying slowly\nCreative and tech contractors with irregular income and cashflow gaps\nSmall service businesses who can''t qualify for traditional finance'),
  ('bmc_value',       E'Upload an unpaid invoice, get cash advance within 24 hours\nNo credit check — approval based on client quality, not your credit score\n2% fee per 30 days — transparent, no hidden charges\nAutomatic repayment when your client pays — zero admin\nNo lock-in: use it once or every month, your choice'),
  ('bmc_channels',    E'Freelancer communities (Reddit r/freelance, Freelancer Forum)\nLinkedIn outreach to agency founders and freelancers\nAccounting software integrations (FreeAgent, Xero)\nFreelance platform partnerships (Toptal, People Per Hour)\nFinancial influencers and freelancer newsletter sponsors'),
  ('bmc_cr',          E'First advance creates immediate relief — powerful emotional moment\nRepeat use builds habit: "I know I can always get paid now"\nAutomated repayment removes friction from ongoing use\nMonthly statement: "you''ve advanced £X, saved £Y in overdraft fees"\nReferral: £50 for each freelancer friend who uses their first advance'),
  ('bmc_revenue',     E'Primary: 2% per 30-day advance period (e.g. £20 fee on £1,000 invoice for 30 days)\nExpedited processing (same day vs 24h): £5 flat fee\nPremium membership £9.99/month: 1.5% rate, instant processing, higher limits\nFuture: business banking account with automatic advance on invoice upload'),
  ('bmc_activities',  E'Invoice verification and client creditworthiness assessment\nBank account verification and advance disbursement\nAutomated repayment monitoring and reconciliation\nRisk modelling and default management\nCompliance: FCA consumer credit authorisation'),
  ('bmc_resources',   E'FCA consumer credit authorisation\nCredit risk model (client quality assessment)\nBank payment infrastructure (faster payments)\nInvoice verification system\nCapital to advance (own balance sheet or institutional funding)'),
  ('bmc_partners',    E'Institutional funders or debt facility providers (capital)\nFCA-regulated partner (regulatory umbrella initially)\nAccounting software (Xero, FreeAgent) for invoice import\nOpen Banking providers for bank account verification\nFreelance platforms for distribution'),
  ('bmc_costs',       E'Capital cost (cost of funds advanced)\nDefault and bad debt provision\nFCA compliance and regulatory costs\nBank payment infrastructure\nRisk modelling engineering\nMarketing: freelancer community outreach')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='fintech' WHERE user_id=(SELECT id FROM users WHERE email='zara.i@seed50.dev');

-- ── 25. Ben · AI code review for open source maintainers ─────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='ben.t@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Open source project maintainers with 10+ PRs per week\nSmall engineering teams wanting async code review coverage\nDeveloper tools companies with public repos\nPlatform engineering teams managing internal library contributions'),
  ('bmc_value',       E'Every PR gets a thorough first-pass review within 2 minutes of opening\nFlags security vulnerabilities, breaking changes, test gaps, and style violations\nStructured comment: severity, line reference, suggested fix\nMaintainers only spend time on judgement calls — not catching obvious issues\nIntegrates with GitHub Actions — zero setup beyond installing the app'),
  ('bmc_channels',    E'GitHub Marketplace (primary distribution)\nOpen source maintainer communities (GitHub Discussions, Discord)\nDeveloper newsletters (TLDR, Pointer, JavaScript Weekly)\nProduct Hunt launch\nDirect outreach to maintainers of repos with 1k+ stars'),
  ('bmc_cr',          E'Every PR creates an automatic interaction — daily engagement without user action\nGitHub bot comments create visibility across the contributor community\nWeekly maintainer digest: PRs reviewed, issues caught, time saved\nConfiguration file (.reviewrc) creates team-specific stickiness\nEnterprise: custom rule sets per team'),
  ('bmc_revenue',     E'Free: 5 PRs/month per public repo\nPro £15/month: unlimited PRs, 1 private repo\nTeam £49/month: unlimited PRs, 5 private repos, custom rules\nEnterprise £199/month: unlimited repos, SSO, audit logs, SLA\nAnnual: 20% discount'),
  ('bmc_activities',  E'Code analysis models: security, breaking changes, style, test coverage\nGitHub App development and webhook infrastructure\nCustom rule configuration engine\nPR comment generation (actionable, not generic)\nEnterprise: private repo security and data handling'),
  ('bmc_resources',   E'Code analysis models (security, style, breaking change detection)\nGitHub App infrastructure\nCustom rule engine\nEnterprise security infrastructure (private repo data)\nDevrel team for open source community'),
  ('bmc_partners',    E'GitHub (Marketplace distribution)\nSecurity vulnerability databases (NVD, Snyk)\nCode quality tools (SonarQube, ESLint) for rule import\nCI/CD platforms (CircleCI, GitHub Actions)\nSecurity-focused VC firms for enterprise sales'),
  ('bmc_costs',       E'Code analysis model training and inference\nGitHub API and infrastructure costs\nDevrel and open source community management\nEnterprise sales and security compliance\nMarketing: developer community and Product Hunt\nCloud infrastructure')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='devtools' WHERE user_id=(SELECT id FROM users WHERE email='ben.t@seed50.dev');

-- ── 26. Elena · Community-owned renewable energy co-op ───────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='elena.r@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Residents in suburban and rural communities who can''t install panels individually\nLocally-minded investors wanting community-level ESG impact\nParish councils and community organisations wanting green initiatives\nHousing associations looking to offer renewable energy to tenants'),
  ('bmc_value',       E'Launch a community solar co-op in 90 days with our legal and financial tools\nMembers invest from £250 and earn quarterly dividends from generated energy\nPlatform handles legal structure, share register, Ofgem compliance\nFully transparent: members see live energy generation and income in real time\nCommunity energy without needing a lawyer or financial advisor'),
  ('bmc_channels',    E'Community Energy England and Scotland networks\nParish council and local authority partnerships\nEnvironmental charities (Friends of the Earth, ClientEarth)\nLocal press coverage of community energy success stories\nCrowdfunding platforms for initial capital raise'),
  ('bmc_cr',          E'Quarterly dividend payment creates positive recurring engagement\nLive energy dashboard — members check generation daily\nAnnual AGM brings community together in person\nNew member referral: each existing member can invite neighbours\nImpact report: annual CO2 avoided and income distributed'),
  ('bmc_revenue',     E'Platform setup fee: £2,500 per co-op launched\nAnnual SaaS: £600/year per active co-op (share register, reporting)\nTransaction fee: 1% of investment flows through platform\nPremium: £1,200/year adds Ofgem compliance reporting and HMRC EIS admin\nGrant application support service: £800 per application'),
  ('bmc_activities',  E'Legal structure templates (Co-operative Society rules)\nShare register and investment management\nOfgem FiT/SEG compliance and reporting\nCrowdfunding and member recruitment tools\nEnergy generation monitoring integration'),
  ('bmc_resources',   E'Legal template library (Co-op, Community Benefit Society structures)\nShare register and payment infrastructure\nOfgem compliance engine\nEnergy monitoring API integrations (solar inverters)\nCommunity Energy England partnership'),
  ('bmc_partners',    E'Community Energy England (credibility and distribution)\nOfgem and BEIS (regulatory relationships)\nSolar installation companies (hardware referral)\nCrowdfunding platforms for capital raise integration\nLocal authorities for land access and promotion'),
  ('bmc_costs',       E'Legal and compliance team (co-op law specialists)\nShare register and payment infrastructure\nOfgem compliance and reporting engineering\nMarketing: community organisations and councils\nCustomer success for co-op launch\nEnergy monitoring integrations')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='cleantech' WHERE user_id=(SELECT id FROM users WHERE email='elena.r@seed50.dev');

-- ── 27. Kai · Pet health records and vet communication ───────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='kai.n@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Dog and cat owners with 1–3 pets aged 25–55\nPet owners who travel or use multiple vet practices\nVet practices wanting to reduce appointment time on history-gathering\nPet insurance customers needing organised health records for claims'),
  ('bmc_value',       E'One place for every vaccination, treatment, and prescription — always accessible\nVaccination and treatment reminders so nothing is ever missed\nDirect messaging to your vet practice — as simple as texting\nVet can view your pet''s full history before the appointment\nShare records instantly when travelling, boarding, or changing vet'),
  ('bmc_channels',    E'Vet practice partnerships (recommend to clients at reception)\nPet insurance companies (records make claims easier)\nPet retail (Pets at Home, Jollyes) in-store and online\nInstagram and TikTok pet owner communities\nApp Store under "pets" and "vet"'),
  ('bmc_cr',          E'Vaccination reminders bring users back before they would otherwise open the app\nMessaging with vet creates daily habit for ongoing health management\nPet birthday and annual health check reminders\nMulti-pet households create higher engagement and switching cost\nVet practice integration creates two-sided stickiness'),
  ('bmc_revenue',     E'Freemium: 1 pet, basic records, reminders\nPremium £3.99/month: unlimited pets, vet messaging, insurance export, travel documents\nVet practice dashboard £39/month: all registered patients'' histories accessible\nPet insurance partnership: referral commission\nPet boarding integration: share records with kennels and catteries'),
  ('bmc_activities',  E'Vet practice CRM integration development\nRecord import from vet practice management systems\nReminderand notification engine\nMessaging infrastructure (vet-to-owner)\nPet insurance claims export functionality'),
  ('bmc_resources',   E'Vet practice management system integrations (VetSpace, RxWorks)\nRecord storage and sharing infrastructure\nMessaging platform\nVet practice sales and onboarding team\nData security and GDPR compliance for health records'),
  ('bmc_partners',    E'Vet practice groups (distribution and integration)\nPet insurance companies (Petplan, More Than)\nPet boarding networks (kennels, catteries)\nVet practice management software vendors\nPet retail chains for consumer distribution'),
  ('bmc_costs',       E'Vet practice integration engineering\nRecord storage infrastructure\nVet practice sales and onboarding\nMarketing: pet owner communities and pet retailers\nCustomer support\nData security and GDPR compliance')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='healthtech' WHERE user_id=(SELECT id FROM users WHERE email='kai.n@seed50.dev');

-- ── 28. Sofia · Neighbourhood skills exchange network ────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='sofia.l@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Residents in suburban neighbourhoods aged 30–65 with valuable skills to share\nRetired professionals with expertise and time\nYoung families wanting skills (DIY, gardening, childcare support) without high cost\nCommunities with existing social trust but no coordination infrastructure'),
  ('bmc_value',       E'Exchange skills with neighbours — no money, just mutual value\nPlumber fixes tap in exchange for guitar lessons for their kids\nSaves members an average of £200/month in professional service costs\nBuilds real neighbourhood relationships around shared skills\nLocal trust: all members are verified neighbours'),
  ('bmc_channels',    E'Nextdoor and local Facebook Groups\nLocal council and community organisation partnerships\nWord of mouth: first 10 exchanges drive 30 new members each\nLocal press stories about neighbourliness\nHousing associations and neighbourhood management companies'),
  ('bmc_cr',          E'Successful exchange creates gratitude and strong repeat motivation\nMonthly "skills needed near you" digest drives re-engagement\nCommunity board: upcoming events and skills offered this week\nReputation score: exchanges completed, reviews received\nSeasonal prompts: "gardening season — neighbours offering lawn mowing"'),
  ('bmc_revenue',     E'Free for individuals always\nPremium £2.99/month: priority matching, skill portfolio, badge system\nCommunity licence: £500/year for housing associations (white-label per estate)\nCouncil partnership: £2,000/year per ward (community wellbeing programme)\nSponsor slots for local tradespeople and service businesses'),
  ('bmc_activities',  E'Neighbourhood onboarding and seed member recruitment\nSkill matching algorithm\nReputation and review system\nCommunity moderation and safety\nHousing association and council partnership development'),
  ('bmc_resources',   E'Skill matching and proximity algorithm\nVerification system (address confirmation)\nCommunity moderation team\nCouncil and housing association sales team\nMarketing content: community success stories'),
  ('bmc_partners',    E'Local councils and neighbourhood planning teams\nHousing associations\nNextdoor for integration or partnership\nTime banking networks (complementary model)\nLocal community foundations for grant funding'),
  ('bmc_costs',       E'Platform development and maintenance\nCommunity seed marketing per neighbourhood\nModeration team\nCouncil and housing association sales\nMarketing: local press and community channels\nVerification infrastructure')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='marketplace' WHERE user_id=(SELECT id FROM users WHERE email='sofia.l@seed50.dev');

-- ── 29. Hans · White-label loyalty for independent retailers ─────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='hans.m@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Independent coffee shops, bakeries, and delis with 1–5 locations\nIndependent boutiques and gift shops with loyal repeat customers\nLocal gyms and fitness studios wanting retention tools\nIndependent restaurants competing with chain loyalty programmes'),
  ('bmc_value',       E'Branded digital stamp card live in under an hour — no technical knowledge needed\nCustomers collect digitally: scan QR code at point of sale\nRetailer dashboard: redemption rates, most active customers, lapsed regulars\nAutomatic "we miss you" SMS to customers who haven''t visited in 3 weeks\nNo app download for customers — works via browser link'),
  ('bmc_channels',    E'Local business associations and chambers of commerce\nPOS system marketplaces (Square, Lightspeed, Zettle)\nDirect sales to high street retailers in target towns\nSmall business Facebook groups\nLinkedIn outreach to independent retailer owners'),
  ('bmc_cr',          E'Retailer checks dashboard weekly — high engagement product\n"3 regulars haven''t visited in 21 days — send a nudge?" prompt creates action\nMonthly loyalty performance report demonstrates ROI\nCustomer data builds switching cost as retailer grows\nRetailer community forum: share what''s working'),
  ('bmc_revenue',     E'Starter £29/month: 1 location, unlimited stamps, basic analytics\nGrowth £49/month: 3 locations, SMS nudges, advanced analytics\nMulti-site £89/month: unlimited locations, API, dedicated support\nSetup fee: £99 one-off (waived for annual payment)\nSMS messaging: £0.04/message above free tier of 500/month'),
  ('bmc_activities',  E'QR code stamp and redemption infrastructure\nRetailer onboarding and white-label customisation\nPOS system integrations (Square, Zettle, Lightspeed)\nSMS reminder engine\nCustomer data analytics and retailer dashboard'),
  ('bmc_resources',   E'QR stamp and redemption platform\nPOS integration library\nSMS gateway\nWhite-label configuration system\nRetailer onboarding and support team'),
  ('bmc_partners',    E'POS system providers (Square, Zettle, Lightspeed) for marketplace distribution\nSMS gateway providers (Twilio, Vonage)\nLocal business associations for bulk outreach\nPayment terminal providers for hardware integration\nRetail trade press for awareness'),
  ('bmc_costs',       E'Platform development and POS integrations\nSMS gateway costs\nDirect sales team (or founder-led sales)\nMarketing: local business associations and events\nCustomer onboarding and support\nCloud infrastructure')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='b2b-saas' WHERE user_id=(SELECT id FROM users WHERE email='hans.m@seed50.dev');

-- ── 30. Nia · Remote physiotherapy via video and motion tracking ──────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='nia.b@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Post-surgery and musculoskeletal injury patients needing regular physio\nPatients in rural areas more than 30 minutes from a clinic\nPrivate physio practices wanting to scale patient capacity\nCorporate occupational health programmes for MSK treatment'),
  ('bmc_value',       E'Video physio sessions with real-time AI motion analysis — errors corrected live\nPatients recover 30% faster than unsupervised home exercise\nPhysio practices earn 3× more per therapist hour vs in-clinic\nNo travel: patients attend from home, reducing dropout by 60%\nSession recording for patient review between appointments'),
  ('bmc_channels',    E'Private physio practice direct sales (B2B primary channel)\nNHS IAPT and MSK pathway partnerships\nCorporate occupational health and EAP providers\nGP referral through practice manager outreach\nPatient communities for specific conditions (back pain, knee recovery)'),
  ('bmc_cr',          E'Exercise programme between sessions keeps patients in app daily\nProgress tracking: "your knee flexion has improved 15 degrees"\nPhysio can see home exercise compliance before each session\nAutomated appointment reminders and home exercise alerts\nDischarge summary creates re-referral pathway'),
  ('bmc_revenue',     E'Patient: £45/session (vs £65–90 private clinic in-person)\nPhysio practice SaaS: £89/month per therapist (platform licence)\nNHS contract: block sessions at negotiated rate\nCorporate occupational health: per-employee per-year bundle\nHome exercise programme: £9.99/month standalone'),
  ('bmc_activities',  E'AI motion analysis model (joint angle, movement quality, compensation patterns)\nVideo consultation infrastructure\nExercise programme library (condition-specific)\nPhysio onboarding and training on remote assessment\nNHS and corporate sales cycles'),
  ('bmc_resources',   E'AI motion analysis models (trained on clinical movement data)\nVideo infrastructure with motion overlay\nExercise programme library (500+ exercises with video)\nClinical advisory board for motion standards\nPhysio onboarding and support team'),
  ('bmc_partners',    E'Private physio networks (Pure Physio, Six Physio)\nNHS MSK pathway commissioners\nCorporate EAP and occupational health providers\nGP practice networks for referral\nMedical device regulatory advisors (if motion analysis classified as medical device)'),
  ('bmc_costs',       E'AI motion analysis model development and inference\nVideo infrastructure\nClinical advisory board and motion standard maintenance\nNHS and corporate sales team (long cycles, high value)\nMarketing: physio practice outreach\nRegulatory: medical device classification if required')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='healthtech' WHERE user_id=(SELECT id FROM users WHERE email='nia.b@seed50.dev');

SELECT 'Tranche 3 complete: BMC + domains set for ideas 21-30' AS status;
