-- ============================================================
-- BMC + Business Domain — Tranche 1: ideas 1–10 (idea stage)
-- Run: docker compose exec -T db psql -U mvpclub -d mvpclub < backend/src/db/seed-bmc-tranche1.sql
-- ============================================================

-- ── 1. Aisha · AI personal finance coach for Gen Z ───────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='aisha.m@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Gen Z adults aged 18–28 with their first job or side income\nStudents managing loans, rent, and subscriptions for the first time\nYoung people who feel judged by traditional financial advisors\nGig workers with irregular income who need budgeting help'),
  ('bmc_value',       E'Blunt, jargon-free money advice based on YOUR actual transactions\nNo spreadsheets, no shame — conversational and non-judgmental\nPersonalised nudges: "You spent £340 on food delivery this month"\nActionable steps, not generic tips\nFree tier forever — monetise through premium insights'),
  ('bmc_channels',    E'TikTok and Instagram (where Gen Z already talks about money)\nApp Store / Google Play\nUniversity financial wellbeing partnerships\nWord of mouth — shareworthy, relatable money moments\nPersonal finance Reddit and Discord communities'),
  ('bmc_cr',          E'Daily spending summaries sent as push notifications\nWeekly "money personality" insights keep users engaged\nStreak system: consecutive days of on-budget spending\nCommunity challenges: "No-spend November"\nIn-app reactions to financial wins'),
  ('bmc_revenue',     E'Freemium: free tier with basic insights\nPremium £4.99/month: savings goals, investment nudges, debt tracker\nAffiliate revenue: switching to better bank accounts / credit cards\nWhite-label version for university financial wellbeing programmes\nAggregated anonymised spending data (B2B, opt-in only)'),
  ('bmc_activities',  E'Bank API integration (Open Banking / Plaid)\nAI model training on spending categorisation\nContent creation: relatable money tips\nUser onboarding and retention optimisation\nCompliance: FCA registration for financial promotions'),
  ('bmc_resources',   E'Open Banking API access (Plaid / TrueLayer)\nAI/ML models for transaction categorisation and advice\nMobile app (iOS + Android)\nSmall editorial team for tone-of-voice\nFCA compliance and legal counsel'),
  ('bmc_partners',    E'Open Banking providers (Plaid, TrueLayer, Yapily)\nBank and neobank partners for referral commissions\nUniversity financial wellbeing offices\nFCA-registered firm for regulatory umbrella\nMental health organisations (money stress angle)'),
  ('bmc_costs',       E'API access fees (Open Banking)\nAI/ML infrastructure and model training\nMobile app development and maintenance\nUser acquisition (social media ads)\nFCA compliance and legal\nCustomer support')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='fintech' WHERE user_id=(SELECT id FROM users WHERE email='aisha.m@seed50.dev');

-- ── 2. Carlos · On-demand mobile car wash ────────────────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='carlos.v@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Professionals aged 25–45 who park at offices or retail parks all day\nCar owners who hate queuing at car washes\nFleet managers wanting regular vehicle presentation standards\nResidents in urban apartments without driveway access'),
  ('bmc_value',       E'Waterless car wash delivered to your parking spot in 20 minutes\nNo queuing, no detour — car is clean when you return to it\nEco-friendly: uses 95% less water than traditional car washes\nTransparent pricing, real-time booking via app\nRegular subscription saves 20% vs one-off bookings'),
  ('bmc_channels',    E'Mobile app (iOS + Android)\nPartnerships with office parks and shopping centres\nFleet B2B direct sales\nGoogle Maps and local search SEO\nLeaflet drops in high-density parking areas'),
  ('bmc_cr',          E'Subscription model creates weekly recurring relationship\nPush notification when cleaner is 10 minutes away and when done\nIn-app before/after photos after every wash\nRating system for each cleaner\nLoyalty: 10th wash free'),
  ('bmc_revenue',     E'Pay-per-wash: £15 exterior, £25 interior + exterior\nMonthly subscription: £39 (weekly exterior wash)\nFleet accounts: monthly invoicing with volume discount\nAdd-ons: polish, engine clean, air freshener\nCommission from eco-product upsells'),
  ('bmc_activities',  E'Cleaner recruitment, vetting, and training\nRoute and scheduling optimisation\nApp development and real-time booking management\nParking location partnerships\nQuality control and customer dispute resolution'),
  ('bmc_resources',   E'Network of trained, vetted mobile cleaners\nBooking and routing app\nWaterless cleaning product supply chain\nVan / transport for cleaners (or own equipment carry)\nOperations team per city'),
  ('bmc_partners',    E'Office park and commercial property managers\nWaterless cleaning product suppliers\nFleet management companies\nVehicle leasing firms (add-on service)\nInsurance provider for cleaner liability'),
  ('bmc_costs',       E'Cleaner wages (biggest cost — 55–60% of revenue)\nCleaning product supply\nApp development and maintenance\nMarketing and customer acquisition\nParking location partnership fees\nInsurance and liability cover')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='marketplace' WHERE user_id=(SELECT id FROM users WHERE email='carlos.v@seed50.dev');

-- ── 3. Priya · Legal contract review for freelancers ─────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='priya.n@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Freelancers and independent consultants receiving client contracts\nSole traders signing supplier or partnership agreements\nCreative professionals (designers, copywriters, photographers)\nFreelance developers and engineers with IP assignment clauses'),
  ('bmc_value',       E'Upload any contract, get plain-English explanation of risky clauses in 60 seconds\nFlags auto-renew traps, liability caps, IP grabs, and payment terms\nSuggested edits you can copy-paste directly into the document\nNo legal jargon — written for normal people\nFraction of the cost of a lawyer (£4.99 vs £200/hour)'),
  ('bmc_channels',    E'SEO: "review my freelance contract" searches\nFreelancer communities: Reddit, Slack, Discord\nIntegration with freelance platforms (Toptal, Fiverr, Upwork)\nWord of mouth after a bad contract experience\nNewsletter sponsorships in freelancer newsletters'),
  ('bmc_cr',          E'Self-serve — instant results with no human interaction needed\nEmail follow-up with full annotated contract PDF\nSaved contract history for returning users\nFree first review creates habit\nIn-app tips on negotiating specific clauses'),
  ('bmc_revenue',     E'Pay-per-review: £4.99 per contract\nSubscription: £9.99/month for unlimited reviews\nPremium: £24.99/month adds human solicitor 15-min consult\nFreelancer platform B2B licensing (white-label API)\nReferral to specialist solicitors (affiliate fee)'),
  ('bmc_activities',  E'LLM fine-tuning on contract law and clause risk patterns\nContract parsing and clause extraction\nLegal review of AI output accuracy\nSolicitor network for premium consults\nCompliance: not providing legal advice, providing legal information'),
  ('bmc_resources',   E'Trained LLM with contract law fine-tuning\nClause risk database (built and maintained by legal team)\nSolicitor network for premium tier\nWeb and mobile upload interface\nLegal PI insurance'),
  ('bmc_partners',    E'Solicitor firms for premium human review tier\nFreelance platforms for white-label integration\nLegal information publishers for clause knowledge base\nAccounting software (FreeAgent, Xero) for bundling\nFreelancer associations and unions'),
  ('bmc_costs',       E'LLM API costs (scales with usage)\nLegal team to maintain and audit clause database\nSolicitor network fees (premium tier)\nMarketing and SEO\nCompliance and legal PI insurance\nApp and infrastructure hosting')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='legaltech' WHERE user_id=(SELECT id FROM users WHERE email='priya.n@seed50.dev');

-- ── 4. James · Anonymous peer support for teenagers ──────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='james.o@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Teenagers aged 13–18 dealing with social, family, or academic stress\nYoung people who feel they can''t speak to parents or school counsellors\nPeers who want to help but don''t know how\nSchools and youth organisations looking for safeguarded peer support tools'),
  ('bmc_value',       E'Safe, anonymous space to share what you''re going through\nModerated replies from trained peer supporters who''ve been there\nNo adults reading your posts — but safety escalation if needed\nJudgement-free, 24/7 availability\nBuilds community around shared experience'),
  ('bmc_channels',    E'School and college partnerships (primary growth channel)\nChild/adolescent mental health charities\nParent and teacher referrals\nApp Store under "mental health" and "wellbeing"\nSocial media (carefully — not promoting on platforms teens use for entertainment)'),
  ('bmc_cr',          E'Anonymous posting removes barrier to sharing\nModerated community maintains trust and safety\nPersonalised content: "others who felt this way also shared..."\nWeekly wellbeing check-in prompts\nTraining for peer supporters creates investment and ownership'),
  ('bmc_revenue',     E'B2B school/college licences: £800/year per institution\nLocal authority and NHS CAMHS contracts\nGrant funding (mental health, youth wellbeing sector)\nCharitable foundation funding\nFree for individual teenagers — never charge the end user'),
  ('bmc_activities',  E'Platform moderation and safety escalation protocols\nPeer supporter training and certification programme\nSchool sales and onboarding\nSafeguarding compliance and GDPR for under-18s\nClinical advisory board for content standards'),
  ('bmc_resources',   E'Moderation team (human-in-the-loop — non-negotiable)\nClinical safeguarding protocols and escalation pathway\nTrained peer supporter community\nApp platform with strong anonymity and data protection\nClinical advisory board'),
  ('bmc_partners',    E'Schools and colleges (distribution)\nNHS CAMHS and youth mental health services (referral pathway)\nChild safety organisations (e.g. NSPCC for safeguarding standards)\nLocal authorities and youth services\nMental health charities for grant co-applications'),
  ('bmc_costs',       E'Moderation team (24/7 coverage — highest cost)\nClinical safeguarding lead and advisory board\nPlatform development with strict data privacy\nSchool sales and onboarding\nCompliance: GDPR, COPPA equivalent, safeguarding audits\nPeer supporter training materials')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='healthtech' WHERE user_id=(SELECT id FROM users WHERE email='james.o@seed50.dev');

-- ── 5. Mei · Hyperlocal grocery co-op marketplace ────────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='mei.l@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Households in dense urban/suburban areas aged 25–55\nBudget-conscious families wanting to reduce grocery bills\nEnvironmentally motivated consumers reducing delivery emissions\nSeniors or people with limited mobility who can''t shop easily\nNeighbourhood communities that already have social trust'),
  ('bmc_value',       E'Pool orders with neighbours to unlock wholesale prices — save 15–30%\nOne shared delivery slot reduces carbon footprint and packaging\nNo minimum order: you only order what you need\nCurated local and sustainable produce options\nBuilds genuine neighbourhood connection around shared shopping'),
  ('bmc_channels',    E'Nextdoor and local Facebook Groups (organic community seeding)\nFlyer drops in dense residential postcodes\nNeighbourhood WhatsApp groups\nCouncil and housing association partnerships\nLocal press and community newsletters'),
  ('bmc_cr',          E'Weekly co-op cycle creates regular touchpoint\nGroup chat per co-op builds neighbourhood relationships\nTransparency: everyone sees the pooled order and savings\nHost role rotates — creates ownership and retention\nGamification: how much has your co-op saved this year?'),
  ('bmc_revenue',     E'Platform fee: 5% of order value from the wholesaler\nPremium membership £3.99/month: priority slot, exclusive products\nWholesaler listing fee for promoted products\nData analytics for FMCG brands (aggregated, anonymised)\nWhite-label for housing associations and councils'),
  ('bmc_activities',  E'Co-op formation and neighbourhood onboarding\nWholesaler / supplier partnerships and negotiation\nOrder aggregation and logistics coordination\nPayment pooling and reconciliation\nCustomer support for order disputes'),
  ('bmc_resources',   E'Order aggregation platform\nWholesaler and local supplier network\nPayment and reconciliation system\nCommunity management playbook\nDelivery coordination tools'),
  ('bmc_partners',    E'Wholesale grocery suppliers and cash-and-carry operators\nLocal farms and food producers\nCouncils and housing associations\nLast-mile delivery providers\nNeighbourhood platforms (Nextdoor, Streetlife)'),
  ('bmc_costs',       E'Platform development and maintenance\nWholesaler relationship management\nMarketing and community seeding\nPayment processing fees\nCustomer support\nDelivery coordination per co-op')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='marketplace' WHERE user_id=(SELECT id FROM users WHERE email='mei.l@seed50.dev');

-- ── 6. Felix · Carbon footprint tracker for SMEs ─────────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='felix.b@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'SMEs with 10–200 employees facing supplier ESG questionnaires\nB Corp applicants needing Scope 1, 2, and 3 emissions data\nAccounting and finance teams who manage the numbers but not sustainability\nSMEs in supply chains of large corporates with net-zero commitments'),
  ('bmc_value',       E'Connect to Xero/QuickBooks and auto-calculate your carbon footprint\nScope 1, 2, and 3 emissions tracked without a sustainability consultant\nClear reduction roadmap: the 5 biggest levers for your business\nESG report export for supplier questionnaires and B Corp applications\nSave £8,000 in consultant fees per year'),
  ('bmc_channels',    E'Accounting software marketplaces (Xero App Store, QuickBooks)\nB Corp community and certification pipeline\nSustainability consultant referral partners\nLinkedIn thought leadership and SME content\nDirect outreach to SMEs receiving ESG questionnaires from large clients'),
  ('bmc_cr',          E'Monthly emissions dashboard email keeps founders engaged\nAnnual "carbon report" shareable externally builds habit\nAutomated alerts when emissions spike above baseline\nReduction milestone badges create positive reinforcement\nDedicated onboarding call for first 30 days'),
  ('bmc_revenue',     E'SaaS: £79/month (up to 50 employees)\nSaaS: £149/month (50–200 employees)\nESG report export (one-off): £199\nAudit-ready pack for B Corp: £499\nWhite-label for accounting firms to offer clients'),
  ('bmc_activities',  E'Accounting API integration (Xero, QuickBooks, Sage)\nEmissions factor database maintenance (GHG Protocol)\nAutomated categorisation of business spend to emissions\nReport generation engine\nCustomer success for onboarding and retention'),
  ('bmc_resources',   E'Accounting software API integrations\nGHG Protocol emissions factor database\nReport generation and export engine\nSmall sustainability advisory team for accuracy\nCloud infrastructure'),
  ('bmc_partners',    E'Xero and QuickBooks (App Store distribution)\nB Corp UK for certification pipeline referrals\nSustainability consultants (refer clients, not replace them)\nEmissions factor data providers\nAccounting firms for white-label'),
  ('bmc_costs',       E'Engineering: API integrations and platform maintenance\nEmissions data licensing and maintenance\nMarketing: content and App Store optimisation\nCustomer success team\nCompliance: ensuring emissions calculations meet GHG Protocol standards\nCloud hosting')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='cleantech' WHERE user_id=(SELECT id FROM users WHERE email='felix.b@seed50.dev');

-- ── 7. Yuki · Sleep optimisation coaching via wearable ───────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='yuki.t@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Oura Ring, Whoop, or Apple Watch users aged 25–45 already tracking sleep\nBiohackers and performance-focused professionals\nPeople with chronic poor sleep who''ve tried everything generic\nAthletes wanting to optimise recovery\nBurnout-prone knowledge workers in high-pressure roles'),
  ('bmc_value',       E'Weekly 5-minute personalised audio coaching based on YOUR sleep data\nNot generic tips — specific to your patterns: "your deep sleep drops after alcohol"\nActionable next step each week — one thing, not a list\nFeels like a private sleep coach at 1% of the cost\nTracks improvement week-on-week against your own baseline'),
  ('bmc_channels',    E'Oura and Whoop user communities (Reddit, Discord, Facebook groups)\nApp Store under "sleep" and "recovery"\nBiohacking podcasts and newsletters\nInfluencer partnerships with health/performance creators\nDirect integration as a companion app via wearable APIs'),
  ('bmc_cr',          E'Weekly audio coaching creates regular check-in habit\n"Your sleep score vs last week" hook drives return visits\nPersonalised insights feel like a relationship, not a product\nStreak: consecutive weeks of improving sleep quality\nEmail recap with shareable sleep improvement data'),
  ('bmc_revenue',     E'Subscription £9.99/month (or £89/year)\nPremium £19.99/month: adds live 1-on-1 sleep coach session monthly\nCorporate wellness bundles for employers\nAffiliate: Oura Ring and Whoop device referrals\nB2B: white-label for corporate wellbeing platforms'),
  ('bmc_activities',  E'Wearable API integrations (Oura, Whoop, Apple Health)\nAI/ML model for sleep pattern analysis and coaching script generation\nAudio content production (coaching scripts, voice recording)\nCoach network for premium tier\nRetention and streak optimisation'),
  ('bmc_resources',   E'Wearable API access (Oura, Whoop, Garmin, Apple Health)\nSleep science advisory board\nAudio production capability\nAI/ML sleep analysis models\nHuman sleep coach network for premium tier'),
  ('bmc_partners',    E'Oura Ring and Whoop (API partners, potential co-marketing)\nSleep scientists and clinical advisors\nCorporate wellness platforms (Headspace for Work, etc.)\nBiohacking content creators\nHealth insurance companies (sleep as preventive health)'),
  ('bmc_costs',       E'Wearable API access fees\nAI/ML model development and inference\nAudio production (voice artists or TTS)\nSleep coach network fees (premium tier)\nMarketing: biohacking communities and content\nApp development and hosting')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='healthtech' WHERE user_id=(SELECT id FROM users WHERE email='yuki.t@seed50.dev');

-- ── 8. Sarah · B2B procurement marketplace for Africa ────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='sarah.k@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'International buyers (EU, US, Asia) sourcing manufactured components\nAfrican manufacturers and exporters wanting verified global reach\nProcurement teams at mid-size industrial firms diversifying supply chains\nSourcing agents and trading companies operating in African markets'),
  ('bmc_value',       E'Verified catalogue of African-made components with quality certifications\nCut out middlemen: direct buyer-to-manufacturer transactions\nReduce lead times by 40% vs traditional agent-based sourcing\nAll suppliers vetted: factory audits, export history, compliance\nMulti-currency RFQ and escrow payment — de-risks the transaction'),
  ('bmc_channels',    E'Trade show presence (Canton Fair, Africa sourcing events)\nLinkedIn outreach to procurement directors\nManufacturer association partnerships per country\nExport promotion boards (NEPC Nigeria, GEPA Ghana)\nSEO for "African manufacturers [product category]"'),
  ('bmc_cr',          E'Dedicated account manager for buyers placing >£50k/year\nVerified supplier badges and factory audit reports build trust\nRFQ workflow keeps buyers in platform rather than going off-platform\nEscrow payment builds confidence for first transaction\nAnnual supplier performance reports for procurement teams'),
  ('bmc_revenue',     E'Transaction fee: 3–5% of order value\nSupplier verified listing fee: £299/year\nPremium supplier placement: £99/month\nEscrow and payment processing margin\nBuyer sourcing service (white-glove): £500 per sourcing brief'),
  ('bmc_activities',  E'Supplier vetting and factory audit programme\nBuyer acquisition and RFQ matching\nEscrow payment and trade finance facilitation\nLogistics and export documentation support\nDispute resolution'),
  ('bmc_resources',   E'Supplier vetting and audit team (on-ground in Africa)\nTrade finance and escrow infrastructure\nMarketplace platform (search, RFQ, messaging, payment)\nLegal team for cross-border trade compliance\nAfrican country operations leads'),
  ('bmc_partners',    E'Factory audit firms (SGS, Bureau Veritas)\nExport promotion boards (NEPC, GEPA, ITPO)\nTrade finance banks and fintech (escrow, LC facilitation)\nLogistics and freight forwarders\nManufacturer associations per country and sector'),
  ('bmc_costs',       E'Supplier vetting and on-ground audit costs\nPlatform development and maintenance\nBuyer acquisition (trade shows, outreach)\nTrade finance infrastructure and compliance\nCountry operations teams across Africa\nLegal and cross-border compliance')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='marketplace' WHERE user_id=(SELECT id FROM users WHERE email='sarah.k@seed50.dev');

-- ── 9. David · No-code internal tool builder for ops teams ───────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='david.r@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Operations, finance, and HR teams at 20–500 person companies\nNon-technical managers who need custom tools but can''t code\nStartups that have outgrown spreadsheets but can''t afford custom dev\nAgencies building client-facing approval and data entry workflows'),
  ('bmc_value',       E'Build internal dashboards, approval flows, and data forms in minutes\nNo code required — drag and drop with logic and database connections\nConnect to Airtable, Google Sheets, Postgres, and REST APIs\n10x faster than waiting for an engineering sprint\nSave £15,000+ per tool vs custom development'),
  ('bmc_channels',    E'Product Hunt launches\nSEO: "build internal tools without code"\nSlack community for operations professionals\nG2 and Capterra reviews\nDirect outreach to ops managers at Series A–C companies'),
  ('bmc_cr',          E'Low-code editor creates stickiness — switching costs after building tools\nTemplate library gets new users to first value in under 20 minutes\nTeam collaboration: multiple editors per workspace\nIn-app chat support during first 14 days\nMonthly "what''s new" email keeps power users engaged'),
  ('bmc_revenue',     E'Free: 1 app, 3 users, 1,000 rows\nStarter £39/month: 5 apps, 10 users\nPro £99/month: unlimited apps, 25 users, custom domain\nEnterprise £299/month: SSO, audit logs, SLA, unlimited users\nProfessional services: £150/hour for custom implementation'),
  ('bmc_activities',  E'Core product: drag-and-drop builder development\nData connector integrations (Airtable, Postgres, REST APIs, Google Sheets)\nTemplate library creation and curation\nCustomer success and onboarding\nEnterprise sales'),
  ('bmc_resources',   E'Engineering team (builder, renderer, connector infrastructure)\nTemplate library (50+ pre-built starting points)\nCustomer success team\nData connector infrastructure\nEnterprise sales team (for >£299/month accounts)'),
  ('bmc_partners',    E'Airtable, Google Workspace, Notion (integration partners)\nDatabase providers (Supabase, PlanetScale)\nAgencies that build internal tools for clients\nWorkplace and HR software (Rippling, BambooHR) for bundling\nCloud providers for infrastructure credits'),
  ('bmc_costs',       E'Engineering team (largest cost)\nCloud infrastructure\nConnector maintenance and API rate limit costs\nMarketing: content, SEO, Product Hunt\nCustomer success team\nEnterprise sales team')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='b2b-saas' WHERE user_id=(SELECT id FROM users WHERE email='david.r@seed50.dev');

-- ── 10. Amara · Personalised vitamin subscription ────────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='amara.s@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Health-conscious adults aged 28–50 who take supplements inconsistently\nPeople with specific deficiencies (Vitamin D, B12, iron) wanting targeted solutions\nBiohackers and preventive health enthusiasts\nWomen aged 30–45 managing hormonal health and energy levels\nBusy professionals who want health sorted with minimal effort'),
  ('bmc_value',       E'Home blood test → results in 48 hours → monthly supplement pack built for you\nOnly what your body actually needs — not a generic multivitamin\nRetest every 6 months to track improvement and adjust the pack\nPharmacy-grade supplements, not health food store quality\nEnds the guesswork: know exactly what you''re deficient in'),
  ('bmc_channels',    E'SEO: "personalised vitamins", "blood test supplements"\nInstagram and Pinterest (health and wellness communities)\nGP and nutritionist referral partnerships\nWellness influencer partnerships\nCorporate wellbeing programme partnerships'),
  ('bmc_cr',          E'Subscription auto-renews monthly — zero friction to continue\nBi-annual retest creates re-engagement moment\n"Your results improved" email builds loyalty and trust\nPersonalised health dashboard showing progress over time\nReferral programme: get a free test when a friend subscribes'),
  ('bmc_revenue',     E'Starter pack (blood test + first month): £79\nMonthly subscription: £34.99/month\nRetest add-on: £49\nCorporate wellness bulk subscriptions\nPremium tier £59/month: includes nutritionist video call quarterly'),
  ('bmc_activities',  E'Home blood test kit fulfilment and logistics\nClinical lab processing and results interpretation\nSupplement formulation and pack assembly\nSubscription management and auto-dispatch\nNutritionist advisory for clinical accuracy'),
  ('bmc_resources',   E'Clinical lab partnership for blood test processing\nPharmacy-grade supplement supply chain\nPack assembly and fulfilment operation\nNutritionist advisory board\nBlood biomarker interpretation algorithm'),
  ('bmc_partners',    E'Clinical diagnostic labs (blood test processing)\nPharmacy-grade supplement manufacturers\nGP practices and nutritionists (referral)\nCorporate HR and wellness platforms\nHome testing kit logistics partners'),
  ('bmc_costs',       E'Blood test processing cost per kit (lab fees)\nSupplement product cost and pack assembly\nFulfilment and postage\nBlood test kit manufacturing\nMarketing: influencer, SEO, content\nClinical advisory and compliance')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='healthtech' WHERE user_id=(SELECT id FROM users WHERE email='amara.s@seed50.dev');

SELECT 'Tranche 1 complete: BMC + domains set for ideas 1-10' AS status;
