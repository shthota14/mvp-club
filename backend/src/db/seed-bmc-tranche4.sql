-- ============================================================
-- BMC + Business Domain — Tranche 4: ideas 31–40
-- Run: docker compose exec -T db psql -U mvpclub -d mvpclub < backend/src/db/seed-bmc-tranche4.sql
-- ============================================================

-- ── 31. Ravi · Childcare matching platform ───────────────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='ravi.s@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Dual-income parents with children 0–8 in mid-size UK cities\nParents who need flexible or part-time childcare (not nursery hours)\nChildminders with available slots wanting a reliable enquiry channel\nParents who''ve had a childminder cancel and need urgent backup'),
  ('bmc_value',       E'Verified, DBS-checked childminder booked in under 20 minutes\nTransparent reviews, photos, and qualification badges on every profile\nBackup childminder option built into every booking\nAutomatic weekly payment — no cash, no awkward invoices\nFilter by availability, location radius, languages spoken, and age specialisms'),
  ('bmc_channels',    E'Mumsnet and parenting forums (primary)\nNHS midwife and health visitor referrals\nLinkedIn for childminder recruitment\nFacebook parenting groups in target cities\nChildminder association partnerships (NCMA, PACEY)'),
  ('bmc_cr',          E'Weekly booking creates deep usage habit\nParent and childminder two-sided reviews build community trust\nEmergency booking feature creates loyalty in moments of stress\nAnnual "childminder appreciation" card generated for parents to send\nPush notification when a new childminder joins in your area'),
  ('bmc_revenue',     E'Booking fee: 8% of weekly childcare cost (paid by parent)\nChildminder listing: free, premium profile £9.99/month\nBackup childminder service: £4.99/month add-on\nEmergency match (same-day): flat £15 fee\nEnterprise: corporate creche partnerships and emergency childcare'),
  ('bmc_activities',  E'Childminder DBS and qualification verification\nParent and childminder matching algorithm\nBooking and payment infrastructure\nChildminder onboarding and training on platform\nDispute resolution and emergency rebooking'),
  ('bmc_resources',   E'DBS check verification infrastructure and childminder vetting team\nMatching algorithm (location, availability, age specialism)\nPayment processing and weekly auto-pay\nReview and rating system\nChildminder support team'),
  ('bmc_partners',    E'DBS checking services (Disclosure Scotland, Update Service)\nNCMA and PACEY (childminder associations for supply)\nNHS health visitors for parent referrals\nPayroll and pension providers (for employed childminder model)\nCorporate employers for emergency childcare benefit'),
  ('bmc_costs',       E'Childminder vetting and DBS verification\nMatching algorithm and platform engineering\nParent acquisition (Mumsnet, parenting forums)\nPayment infrastructure\nCustomer support: disputes and emergency rebookings\nChildminder onboarding team')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='marketplace' WHERE user_id=(SELECT id FROM users WHERE email='ravi.s@seed50.dev');

-- ── 32. Camille · Restaurant menu profitability analysis ─────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='camille.b@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Independent restaurant owners and small chain operators (1–10 locations)\nHead chefs and general managers with P&L responsibility\nRestaurant groups wanting standardised profitability analysis across sites\nGhostcloud kitchen and delivery-only operators with high ingredient costs'),
  ('bmc_value',       E'Connect your POS and see dish-level profitability after food cost, prep time, and waste\nRanks every dish: Stars (high margin + popular), Dogs (low margin + unpopular)\nClear recommendation: cut these 4 dishes, promote these 2, reprice these 3\nAverage finding: 3–4 loss-making dishes and 2 underpriced winners\nUpdated automatically every week — no manual data entry'),
  ('bmc_channels',    E'Square, Toast, and Lightspeed POS App Marketplaces\nRestaurant industry trade press (BigHospitality, The Caterer)\nDirect outreach to restaurant owners via Instagram and LinkedIn\nHospitality accountant referral partnerships\nUK Hospitality association partnership'),
  ('bmc_cr',          E'Weekly menu performance report keeps owners engaged\nSeasonal menu planning tool creates quarterly usage peak\nWaste reduction alert: "You wasted £340 in unsold chicken this week"\nAnnual profitability improvement report shows compounding ROI\n"Before and after": gross profit improvement since connecting'),
  ('bmc_revenue',     E'Starter £49/month: 1 location, weekly profitability report\nPro £89/month: 3 locations, waste tracking, menu change simulator\nGroup £199/month: unlimited locations, cross-site benchmarking\nSetup and menu onboarding: £149 one-off\nAccountant white-label: £29/restaurant/month (accountant manages the account)'),
  ('bmc_activities',  E'POS system integrations (Square, Toast, Lightspeed, Epos Now)\nFood cost database and recipe costing engine\nWaste tracking module\nMenu profitability ranking algorithm (BCG matrix approach)\nRestaurant accountant partner programme'),
  ('bmc_resources',   E'POS integration library\nRecipe and food cost database\nMenu profitability algorithm\nWaste tracking infrastructure\nRestaurant industry partnerships and accountant channel'),
  ('bmc_partners',    E'POS providers (Square, Toast, Lightspeed) for marketplace distribution\nFood suppliers (ingredient cost data)\nHospitality accountants (partner channel)\nUK Hospitality and Restaurant Association\nFood waste organisations (Too Good To Go, Winnow)'),
  ('bmc_costs',       E'POS integration engineering\nFood cost database maintenance\nMarketing: hospitality press and events\nAccountant partner programme development\nCustomer success for restaurant onboarding\nCloud infrastructure')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='foodtech' WHERE user_id=(SELECT id FROM users WHERE email='camille.b@seed50.dev');

-- ── 33. Ethan · Gamified sustainability challenges for corporates ─────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='ethan.g@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Sustainability leads and CSR managers at companies of 50–500 people\nHR teams needing ESG employee engagement data for annual reporting\nCompanies with net-zero commitments needing measurable employee action\nB Corp applicants needing employee engagement evidence'),
  ('bmc_value',       E'Monthly challenges your team actually completes — 78% average participation\nPersonal impact tracking: each employee sees their own CO2 avoided\nCompany leaderboard vs industry peers creates healthy competition\nESG data export for annual sustainability report\nEngagement 10× higher than traditional CSR initiatives'),
  ('bmc_channels',    E'HR and People teams at mid-market companies\nB Corp UK community\nSustainability director LinkedIn outreach\nHR software integrations (BambooHR, HiBob, Personio)\nESG consulting firm partnerships'),
  ('bmc_cr',          E'Monthly challenge creates regular company-wide event\nTeam vs team leaderboard creates peer accountability\nPersonal impact badge collection builds individual investment\nQuarterly company impact report for leadership\nAnnual "most sustainable company" award between clients creates retention'),
  ('bmc_revenue',     E'SME £199/month (up to 100 employees)\nMid-market £399/month (100–500 employees)\nEnterprise £799/month (500+ employees, custom challenges, API)\nAnnual: 2 months free\nB Corp package: £599 one-off for evidence pack + ongoing £199/month'),
  ('bmc_activities',  E'Challenge content creation and monthly curation\nEmployee impact tracking and aggregation\nCompany benchmarking database maintenance\nHR platform integrations\nESG report generation and export'),
  ('bmc_resources',   E'Challenge content library (100+ monthly challenges)\nImpact calculation models (CO2, water, waste per action)\nCompany benchmarking database\nHR system integrations\nContent and sustainability advisory team'),
  ('bmc_partners',    E'HR software providers (BambooHR, Personio, HiBob) for integration\nB Corp UK (distribution and credibility)\nSustainability consulting firms (refer clients)\nESG reporting software for data export integration\nCorporate sustainability networks (Business in the Community)'),
  ('bmc_costs',       E'Challenge content creation team\nImpact calculation model development and maintenance\nHR integration engineering\nMarketing: sustainability director outreach and content\nEnterprise sales team\nESG reporting compliance and accuracy auditing')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='hr-tech' WHERE user_id=(SELECT id FROM users WHERE email='ethan.g@seed50.dev');

-- ── 34. Ada · Micro-learning for tradespeople ────────────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='ada.o@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Plumbers, electricians, and carpenters aged 25–55 in the UK\nSelf-employed tradespeople who can''t afford full-day CPD shutdowns\nApprenticeship leavers needing ongoing regulation updates\nConstruction firms wanting compliance training without taking staff off site'),
  ('bmc_value',       E'5-minute video lessons on regulation changes, new materials, and trade techniques\nDesigned for a van, a lunch break, or a tea break — not a classroom\nCertificate of completion for CPD records after each module\nUpdated within 2 weeks of any new regulation or standard change\nSave £400/year vs full-day CPD courses plus lost day of earnings'),
  ('bmc_channels',    E'Trade federation partnerships (CIPHE, JIB, FMB)\nTrade tool retailers (Screwfix, Toolstation) — physical and online\nYouTube pre-roll on trade-related videos\nDirect outreach via tradespeople Facebook groups\nApprenticeship training provider partnerships'),
  ('bmc_cr',          E'Daily 5-minute habit easier to maintain than monthly courses\nCPD tracker: shows hours logged and certificates earned this year\nMonthly regulation alert: "3 new updates in your trade this month"\nStreak: consecutive days of learning builds identity as "professional"\nAnnual CPD certificate PDF for insurance and accreditation renewals'),
  ('bmc_revenue',     E'Individual £12.99/month: unlimited access to all trades\nTrade-specific £7.99/month: one trade only\nCompany licence £8/employee/month (min 5): admin dashboard, completion tracking\nCPD certificate packs: £19.99 for official printed certificates for insurance\nTrade federation white-label: £3,000/year'),
  ('bmc_activities',  E'Expert video production with qualified tradespeople and inspectors\nRegulation change monitoring (HSE, BSI, Gas Safe, NICEIC)\nLesson update pipeline (2-week turnaround from reg change to lesson)\nCPD certificate system\nTrade federation partnership development'),
  ('bmc_resources',   E'Trade expert network (plumbers, electricians, carpenters for content)\nVideo production capability\nRegulation change monitoring and editorial team\nCPD certification infrastructure\nTrade federation relationships'),
  ('bmc_partners',    E'Gas Safe Register, NICEIC, CIPHE (trade accreditation bodies)\nFMB, JIB, CIPHE (trade federation distribution partners)\nHSE and BSI (regulation source relationships)\nScrewfix and Toolstation (retail distribution)\nApprenticeship training providers'),
  ('bmc_costs',       E'Expert video production per lesson\nRegulation monitoring and editorial team\nMarketing: trade federation and tool retailer channels\nApp development and maintenance\nCPD certificate system\nCustomer support')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='edtech' WHERE user_id=(SELECT id FROM users WHERE email='ada.o@seed50.dev');

-- ── 35. Marco · API aggregator for African payment gateways ──────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='marco.f@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'International SaaS companies wanting to accept payments across Africa\nE-commerce and marketplace platforms expanding into African markets\nFintech companies building products for African consumers\nGlobal payroll providers needing to pay contractors across Africa'),
  ('bmc_value',       E'One API to accept and route payments across 20+ African countries\nAutomatic fallback: if primary gateway fails, routes to backup in <2 seconds\nLocal currency settlement in 15+ currencies with home currency reconciliation\nGo live in 15 markets in one afternoon vs 4 months per provider\n99.7% uptime SLA with real-time status dashboard'),
  ('bmc_channels',    E'RapidAPI and API marketplaces\nFintech Slack communities and developer Discord servers\nAfrican startup and VC ecosystem (Techstars Africa, CcHub)\nDirect outreach to CTOs at companies expanding to Africa\nTechCabal, Disrupt Africa, and African tech press'),
  ('bmc_cr',          E'API integration creates immediate switching cost\nMonthly reconciliation report prevents churn\nDeveloper changelog and versioning: engineers trust consistent APIs\nDedicated Slack channel for enterprise customers\nWebhook alerts: "Nigeria gateway degraded — rerouted to backup"'),
  ('bmc_revenue',     E'Transaction fee: 0.8% per successful transaction\nMonthly platform fee: £199/month (waived above £25k/month volume)\nEnterprise: fixed monthly fee + lower transaction rate for >£100k/month\nCurrency conversion margin: 0.5% above mid-market rate\nData and analytics API: £299/month add-on'),
  ('bmc_activities',  E'Payment gateway integrations per country (20+ providers)\nFallback routing and redundancy logic\nReconciliation and settlement engine\nFX conversion and hedging\nCompliance: AML, KYB, and local payment regulations per country'),
  ('bmc_resources',   E'Gateway integration engineering team (one per major market)\nLegal entities in key African markets\nCompliance and AML team\nFX and settlement infrastructure\nReliability and uptime engineering (99.7% SLA)'),
  ('bmc_partners',    E'Local payment gateways (Paystack, Flutterwave, M-Pesa, MTN MoMo)\nLocal banks in each market for settlement accounts\nAML and KYB compliance providers\nFX brokers for currency conversion\nAfrican startup ecosystem partners (CcHub, iHub, Flat6Labs)'),
  ('bmc_costs',       E'Gateway integration engineering per market\nLegal entities and compliance per country\nFX hedging and currency conversion costs\nAML/KYB compliance infrastructure\nMarketing: developer community and fintech events\nReliability and infrastructure for 99.7% uptime')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='fintech' WHERE user_id=(SELECT id FROM users WHERE email='marco.f@seed50.dev');

-- ── 36. Liam · Automated grant writing for charities ─────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='liam.o@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Small to medium charities with £50k–£2m annual income\nFundraising officers spending 60% of time on grant writing\nCommunity organisations without dedicated fundraising staff\nSocial enterprises applying to grant funders for the first time'),
  ('bmc_value',       E'First draft of a grant application in 15 minutes instead of 3 days\nTailored to each funder''s specific criteria, word limit, and tone\nFunder database with 2,000+ UK grant makers and their priorities\nFundraiser spends time refining and relationship-building — not staring at blank pages\nAverage charity submits 4× more applications per quarter'),
  ('bmc_channels',    E'NCVO and Charity Finance Group membership networks\nFundraising sector press (Third Sector, Civil Society News)\nLocal CVS (Council for Voluntary Service) partnerships\nFundraising consultant referral partnerships\nLinkedIn outreach to fundraising officers'),
  ('bmc_cr',          E'Application tracker: see all applications submitted and their status\nFunder match alerts: "3 new grants match your mission this week"\nMonthly grant calendar: upcoming deadlines auto-populated\nWin rate reporting: learn which funders are most likely to say yes\nTeam collaboration: multiple fundraisers on one charity account'),
  ('bmc_revenue',     E'Starter £49/month: 5 applications/month, 500 funder database\nPro £99/month: unlimited applications, full 2,000 funder database, tracker\nTeam £149/month: up to 5 users, collaboration tools\nSuccess fee option: 5% of grant awarded (alternative to subscription)\nFunder database access: £299/year standalone for consultants'),
  ('bmc_activities',  E'Funder database curation and maintenance (2,000+ grant makers)\nLLM fine-tuning on successful grant applications by sector and funder\nApplication generation and customisation engine\nGrant tracker and deadline management\nFundraising consultant partner programme'),
  ('bmc_resources',   E'Funder database (2,000+ UK grant makers with priorities, deadlines, exclusions)\nLLM fine-tuned on charity grant writing\nApplication generation engine\nFundraising consultant network\nCharity sector advisory board'),
  ('bmc_partners',    E'NCVO and Charity Finance Group (distribution via membership)\nLocal CVS networks\nFundraising consultants (refer clients, earn recurring commission)\nGrant-making foundations (funder database data partnerships)\nAccountants serving the charity sector'),
  ('bmc_costs',       E'Funder database research and maintenance team\nLLM fine-tuning and inference\nMarketing: charity sector press and networks\nFundraising consultant partner programme\nCustomer success for onboarding\nLegal: ensuring we''re writing applications, not providing regulated financial advice')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='b2b-saas' WHERE user_id=(SELECT id FROM users WHERE email='liam.o@seed50.dev');

-- ── 37. Hana · Short-term commercial kitchen rental marketplace ───────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='hana.k@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Food entrepreneurs testing new recipes and products before scaling\nPrivate caterers needing certified kitchen access for events\nPop-up restaurant and supper club operators\nFood photographers and stylists needing a professional set\nBakers and confectioners without home kitchen certification'),
  ('bmc_value',       E'Book a certified commercial kitchen by the hour — available tomorrow\n30% cheaper than long-term kitchen lease with no commitment\nAll listings include council health certification and food hygiene rating\nAccess professional equipment without capital outlay\nFlexible: 2 hours for testing, 8 hours for a full catering job'),
  ('bmc_channels',    E'Food entrepreneur Instagram communities\nLocal food market and street food networks\nCatering college partnerships\nLicensed premises (restaurants and pubs with off-hours kitchens)\nFacebook groups for small food businesses'),
  ('bmc_cr',          E'Repeat booking after first successful session is almost automatic\nHost review builds trust and encourages return to same kitchen\n"Your next booking" prompt 48 hours after each session\nLoyalty: 10th booking free\nHost dashboard: occupancy rate and income per month creates host retention'),
  ('bmc_revenue',     E'Platform commission: 15% of booking value from host\nBooker convenience fee: £2.50 per booking\nKitchen certification assistance: £149 (help hosts get listed)\nCatering equipment hire add-on: £15–50/session\nPremium host listing: £39/month (top of search results)'),
  ('bmc_activities',  E'Kitchen host onboarding and certification verification\nBooking calendar and payment management\nHost and booker two-sided review system\nEquipment listing and hire add-on management\nDispute resolution and kitchen condition management'),
  ('bmc_resources',   E'Kitchen host network (supply side — hardest to build)\nCertification verification system\nBooking and payment infrastructure\nTwo-sided review system\nLocalmarket operations team (city by city)'),
  ('bmc_partners',    E'Restaurant groups with daytime kitchen capacity (largest supply source)\nCatering colleges (supply + booker distribution)\nLocal councils (certification and licensing relationships)\nFood hygiene certification providers\nCatering equipment hire companies'),
  ('bmc_costs',       E'Kitchen host onboarding and verification\nPlatform development and booking infrastructure\nCity-by-city launch operations\nMarketing: food entrepreneur communities\nPayment processing fees\nCustomer support and dispute resolution')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='marketplace' WHERE user_id=(SELECT id FROM users WHERE email='hana.k@seed50.dev');

-- ── 38. Pierre · AI contract lifecycle management for startups ────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='pierre.m@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Startups of 5–50 people with growing legal complexity\nOps leads and chiefs of staff managing supplier and client contracts\nFounaders who''ve had a contract auto-renew they forgot about\nAgencies managing framework agreements with multiple enterprise clients'),
  ('bmc_value',       E'Every contract searchable in one place — no more Drive archaeology\nAutomatic renewal alerts at 60, 30, and 7 days before expiry\nAI risk scoring on key clauses: liability, auto-renew, IP assignment, payment terms\nNever be surprised by a contract that renewed without you knowing\nAudit trail of who signed what and when — essential at Series A due diligence'),
  ('bmc_channels',    E'YC, Antler, and Seedcamp alumni networks\nStartup legal community (SeedLegals users, LegalZoom customers)\nLinkedIn outreach to ops leads and chiefs of staff\nAccelerator programme partnerships\nLegal tech and startup press (Sifted, TechCrunch)'),
  ('bmc_cr',          E'Renewal alerts create non-negotiable return visits\nContract search becomes daily habit after first time it saves a meeting\nTeam collaboration: legal, ops, and finance all in one view\nSeries A due diligence pack: one-click export of all signed contracts\n"Contract added" Slack notification builds team adoption'),
  ('bmc_revenue',     E'Starter £29/month: up to 50 contracts, 3 users, renewal alerts\nPro £79/month: unlimited contracts, AI risk scoring, 10 users\nTeam £149/month: unlimited users, Slack integration, API access\nDue diligence export: £299 one-off for Series A pack\nEnterprise: SSO, custom risk rules, legal team view — custom pricing'),
  ('bmc_activities',  E'Contract upload, parsing, and metadata extraction\nRenewal alert and calendar system\nAI clause risk scoring (LLM fine-tuned on contract law)\nSlack and Google Drive integrations\nSeries A due diligence export engine'),
  ('bmc_resources',   E'Contract parsing and metadata extraction models\nAI clause risk scoring (LLM with legal fine-tuning)\nRenewal alert and notification infrastructure\nSlack, Drive, and Dropbox integrations\nLegal advisory board for risk scoring accuracy'),
  ('bmc_partners',    E'SeedLegals and Clerky for startup legal community distribution\nSlack for notification integration\nGoogle Drive and Dropbox for import\nAccelerators (YC, Antler, Seedcamp) for portfolio access\nStartup-focused law firms for risk scoring validation'),
  ('bmc_costs',       E'LLM inference for clause risk scoring\nContract parsing engineering\nMarketing: accelerator and startup community outreach\nLegal advisory board for accuracy\nCustomer success for onboarding\nEnterprise sales team')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='legaltech' WHERE user_id=(SELECT id FROM users WHERE email='pierre.m@seed50.dev');

-- ── 39. Grace · Biodegradable packaging marketplace ─────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='grace.n@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'E-commerce brands shipping 500–50,000 parcels per month\nDTC brands with ESG commitments under pressure from customers\nFulfillment houses looking to offer sustainable packaging to their clients\nB Corp applicants needing certified sustainable packaging'),
  ('bmc_value',       E'Browse 200+ certified sustainable packaging SKUs in one place\nFilter by material (recycled, compostable, FSC paper), size, MOQ, and UK stock\nSample pack ordered in one click — £15, deducted from first order\nAll supplier certifications verified: FSC, Din Certco, seedling logo\nReduce packaging sourcing time from 3 weeks to 1 afternoon'),
  ('bmc_channels',    E'Shopify App Store (direct reach to DTC brands)\nE-commerce trade press (Practical Ecommerce, Econsultancy)\nFulfillment house partnerships\nB Corp UK community\nInstagram: sustainable packaging unboxing content'),
  ('bmc_cr',          E'Repeat orders as brands burn through inventory creates natural retention\nSample pack often converts to first order within 14 days\nPackaging specification saved in account — reorder in 2 clicks\nMonthly new product alerts by category\nSupplier relationship dashboard: order history and delivery performance'),
  ('bmc_revenue',     E'Commission: 12% of order value from supplier\nSample pack: £15 (cost-neutral, drives conversion)\nFeatured supplier placement: £299/month\nBrand sustainability audit: £499 (packaging audit report)\nSubscription procurement: £79/month for brands ordering monthly'),
  ('bmc_activities',  E'Supplier onboarding and certification verification\nProduct catalogue management and search\nSample pack fulfilment\nBuyer acquisition (Shopify, DTC brands)\nOrder facilitation and quality dispute resolution'),
  ('bmc_resources',   E'Supplier network (200+ certified sustainable packaging SKUs)\nCertification verification system\nSample pack fulfilment operation\nShopify and e-commerce platform integrations\nBuyer acquisition team'),
  ('bmc_partners',    E'Packaging suppliers (supply side — FSC, Din Certco certified)\nShopify App Store for distribution\nB Corp UK for buyer community access\nFulfillment houses for bulk buyer access\nCertification bodies (FSC, Din Certco) for supplier validation'),
  ('bmc_costs',       E'Supplier onboarding and certification verification team\nPlatform development and Shopify integration\nMarketing: DTC brand communities and trade press\nSample pack fulfilment costs\nBuyer acquisition\nCustomer support for order queries and disputes')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='cleantech' WHERE user_id=(SELECT id FROM users WHERE email='grace.n@seed50.dev');

-- ── 40. Aaron · Subscription platform for music producers ────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='aaron.l@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Independent music producers with 5k–200k social followers\nBeat makers and sound designers monetising their craft online\nProducers who sell beats but want recurring income\nFans of independent producers who want closer access to their process'),
  ('bmc_value',       E'Producers earn £800–3,000/month from 100–400 subscribers paying £8–15/month\nFans get exclusive unreleased stems, sample packs, and production masterclasses\nDirect relationship between producer and fan — no platform algorithm dependency\nPredictable monthly income vs unpredictable beat sales\nSubscribers feel ownership of the creative process'),
  ('bmc_channels',    E'YouTube producer channels (demo the platform value to audience)\nInstagram and TikTok producer communities\nBeat marketplace communities (BeatStars, Airbit forums)\nDirect outreach to producers with 10k–100k followers\nCollaboration features drive cross-promotion between producers'),
  ('bmc_cr',          E'Monthly content drops create subscriber anticipation\nExclusive access creates FOMO for non-subscribers\nProducer community forum: subscribers interact with each other\nBehind-the-scenes content builds parasocial connection\nAnnual subscriber milestone celebrations: "you''ve been here a year"'),
  ('bmc_revenue',     E'Platform takes 10% of subscription revenue\nProducer keeps 90% — more than Patreon (92% vs 88% after fees, better tools)\nPremium producer account: £19.99/month for analytics, scheduling, and promotion\nFan tip jar: 5% platform fee on tips\nSample pack marketplace: 15% on one-off sales to non-subscribers'),
  ('bmc_activities',  E'Producer onboarding and content upload tools\nSubscription payment and content delivery infrastructure\nAudio and video content hosting (high quality, download protected)\nProducer analytics dashboard\nFan community and interaction tools'),
  ('bmc_resources',   E'Content hosting infrastructure (high-quality audio, stems, video)\nSubscription and payment processing\nProducer analytics and earnings dashboard\nFan community platform\nProducer recruitment and success team'),
  ('bmc_partners',    E'BeatStars and Airbit (cross-promotion with existing producer marketplaces)\nDistribution platforms (DistroKid, TuneCore) for bundle offers\nAudio equipment brands for producer-sponsored content opportunities\nMusic production schools and courses for audience overlap\nYouTube and Instagram for creator programme integration'),
  ('bmc_costs',       E'Content hosting infrastructure (audio and video at quality)\nPayment processing fees\nProducer acquisition and onboarding\nMarketing: producer communities and YouTube\nPlatform development and maintenance\nCommunity moderation')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='media' WHERE user_id=(SELECT id FROM users WHERE email='aaron.l@seed50.dev');

SELECT 'Tranche 4 complete: BMC + domains set for ideas 31-40' AS status;
