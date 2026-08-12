-- ============================================================
-- BMC + Business Domain — Tranche 5: ideas 41–50 (shape + done)
-- Run: docker compose exec -T db psql -U mvpclub -d mvpclub < backend/src/db/seed-bmc-tranche5.sql
-- ============================================================

-- ── 41. Diana · Home energy management for renters ───────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='diana.p@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'UK renters aged 22–40 paying high energy bills with no structural control\nFlat sharers wanting to split and reduce energy costs transparently\nEnvironmentally motivated renters who can''t access solar or smart thermostats\nBuild-to-rent operators wanting to offer smart energy as a tenant benefit'),
  ('bmc_value',       E'Plug-in hub monitors all smart devices — no installation, no landlord permission\nAutomatically shifts high-draw appliances to off-peak tariff windows\nCuts energy bills by 15–25% within 60 days\nLive dashboard: which device is costing what, by day and by month\nFlat sharing: transparent energy split per device per flatmate'),
  ('bmc_channels',    E'Reddit r/UKPersonalFinance and r/HousingUK\nTenant advice organisations (Shelter, Generation Rent)\nBuild-to-rent operators as B2B channel\nOctopus Energy and smart tariff providers\nInstagram for "renter life hacks" and energy saving content'),
  ('bmc_cr',          E'Bill reduction visible within first week — powerful early validation\nMonthly bill comparison: "you saved £X vs last month"\nSchedule editor: customise shift times for each appliance\nFlatmate bill split feature creates multi-user household stickiness\nAnnual energy savings report shareable for ESG credentials'),
  ('bmc_revenue',     E'Hardware: plug-in hub £49 one-off\nSubscription: £4.99/month for app + automation (free first 3 months)\nBuild-to-rent B2B: £8/unit/month (operator pays, tenant gets free hub)\nEnergy tariff affiliate: £40 commission per switch to Octopus/Bulb\nData insights: anonymised energy usage patterns to energy retailers (opt-in)'),
  ('bmc_activities',  E'Hardware design and manufacturing (plug-in hub)\nSmart device and energy monitoring integrations\nOff-peak tariff scheduling engine (Octopus Agile API etc.)\nBuild-to-rent B2B sales\nFlatmate bill split feature'),
  ('bmc_resources',   E'IoT hardware (plug-in hub — custom manufactured)\nSmart device integration library (Tuya, Z-Wave, Zigbee)\nEnergy tariff API integrations (Octopus, OVO)\nHardware supply chain and fulfilment\nB2B build-to-rent sales team'),
  ('bmc_partners',    E'Smart energy tariff providers (Octopus, OVO) for tariff optimisation\nBuild-to-rent operators (Grainger, Greystar) for B2B channel\nSmart home device brands (Tuya, TP-Link) for integration\nHardware contract manufacturers\nTenant advocacy organisations for distribution credibility'),
  ('bmc_costs',       E'Hardware manufacturing and fulfilment\nIoT and energy API integration engineering\nB2B build-to-rent sales team\nMarketing: renter communities and social media\nCustomer support for hardware issues\nOff-peak scheduling algorithm development')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='cleantech' WHERE user_id=(SELECT id FROM users WHERE email='diana.p@seed50.dev');

-- ── 42. Sam · AI interview coaching platform ─────────────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='sam.a@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Software engineers and PMs actively job searching at mid-to-senior level\nGraduates facing their first structured technical or behavioural interviews\nCareer changers entering tech from other industries\nBootcamp graduates who need intensive, specific prep'),
  ('bmc_value',       E'AI interviewer asks real-world role-specific questions and scores every answer\nFeedback on STAR structure, technical accuracy, and communication clarity — not generic tips\nRole and level selector: Senior SWE at FAANG vs PM at Series B\n30% higher interview scores after 5 practice sessions\nAvailable at midnight before an interview — not just during business hours'),
  ('bmc_channels',    E'Product Hunt and Hacker News launch\nLinkedIn job seeker communities\nBootcamp and university career services partnerships\nReferral from early users during active job search\nYouTube career advice creators (sponsorship)'),
  ('bmc_cr',          E'Pre-interview anxiety drives daily usage in active job search\nProgress tracking: score improvement across sessions\nCompany-specific question banks keep returning users\nJob offer announcement drives new user referrals\n"Share your score" feature creates viral word of mouth'),
  ('bmc_revenue',     E'Free: 3 sessions per month, behavioural questions only\nPro £19/month: unlimited sessions, technical questions, role-specific banks\nIntensive £49 one-off: 10 sessions in 7 days, targeted prep plan\nB2B bootcamp: £5/student/month (bootcamp pays)\nEnterprise: career services at universities — per student per year'),
  ('bmc_activities',  E'Role and company-specific question bank curation\nAI interviewer and real-time scoring model development\nVoice transcription and answer analysis\nBootcamp and university sales\nQuestion bank freshness (updated from real interview reports)'),
  ('bmc_resources',   E'Role-specific question bank (10,000+ questions across roles and levels)\nAI scoring model (STAR, technical accuracy, communication clarity)\nVoice transcription infrastructure\nBootcamp and university sales team\nCommunity of interviewees reporting real questions'),
  ('bmc_partners',    E'Bootcamps (Le Wagon, Makers, General Assembly) for B2B distribution\nUniversity career services departments\nJob boards (Indeed, LinkedIn) for distribution integration\nInterview question community sites (Glassdoor, Blind)\nCV and job application tools for end-to-end job search bundle'),
  ('bmc_costs',       E'AI scoring model development and inference\nVoice transcription infrastructure\nQuestion bank curation and freshness maintenance\nMarketing: Product Hunt, LinkedIn, bootcamp outreach\nBootcamp and university sales\nCustomer support')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='edtech' WHERE user_id=(SELECT id FROM users WHERE email='sam.a@seed50.dev');

-- ── 43. Julia · Telemedicine for rural maternal health ────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='julia.w@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Expectant mothers in rural UK and US counties >30 minutes from obstetric unit\nWomen with high-risk pregnancies needing more frequent monitoring\nNHS trusts and health systems with rural midwifery capacity shortfalls\nMaternity insurers seeking better rural coverage outcomes'),
  ('bmc_value',       E'Every antenatal appointment attended — from home, no travel\nCertified midwives and OBs available within 48 hours\nPost-consultation notes sent to GP automatically — no follow-up admin\nPhysical appointments reserved for essential interventions only\nRural mothers get urban-equivalent care frequency and quality'),
  ('bmc_channels',    E'NHS trust maternity commissioner partnerships (primary)\nGP practice manager outreach in rural areas\nMidwifery professional associations (RCM)\nMaternity voices partnerships (patient advocacy groups)\nUS: rural health clinic federations'),
  ('bmc_cr',          E'Pregnancy care schedule creates 8–12 appointments over 9 months — high engagement\nPost-birth postnatal check-ins extend relationship beyond birth\nMidwife continuity model: same midwife throughout pregnancy\nAutomated appointment reminders + baby growth milestones\nNPS: 71 in pilot — exceptional for a clinical service'),
  ('bmc_revenue',     E'NHS contract: block of sessions at negotiated rate per patient per pregnancy\nPrivate pay: £45/consultation\nSubscription: £39/month for full pregnancy antenatal programme\nUS: insurance reimbursement model (CPT codes for telehealth)\nMaternity insurer risk-sharing contract: better outcomes = shared savings'),
  ('bmc_activities',  E'NHS trust governance and clinical integration\nMidwife and OB recruitment and remote consultation training\nVideo consultation platform with clinical record integration\nClinical governance: escalation protocols and emergency referral\nUS market regulatory compliance (state-by-state telemedicine laws)'),
  ('bmc_resources',   E'Registered midwife and OB network\nClinical governance framework and escalation protocols\nVideo consultation platform (CQC-registered)\nGP and hospital record integration\nClinical advisory board'),
  ('bmc_partners',    E'NHS trusts (clinical integration and block contracts)\nRoyal College of Midwives (clinical standards and midwife recruitment)\nGP practices in rural areas (referral and record sharing)\nMaternity voices partnerships (patient trust)\nUS: rural health clinic federations and insurers'),
  ('bmc_costs',       E'Midwife and OB network fees\nNHS governance and CQC registration\nVideo consultation infrastructure with clinical record security\nNHS trust sales cycle (long but high value)\nClinical advisory board\nUS market regulatory compliance and state licensing')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='healthtech' WHERE user_id=(SELECT id FROM users WHERE email='julia.w@seed50.dev');

-- ── 44. Mike · SaaS for short-term rental property management ────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='mike.t@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Semi-professional Airbnb and STR hosts with 3–20 properties\nProperty management companies handling STR listings for owners\nHosts transitioning from manual management as their portfolio grows\nNew entrants buying 2–3 properties as STR investment'),
  ('bmc_value',       E'Unified inbox for Airbnb, Booking.com, VRBO, and direct bookings\nAI-suggested replies to common guest questions in your tone of voice\nDynamic pricing: adjusts rates based on occupancy, local events, and competitors\nMaintenance log with contractor assignment and photo evidence\nManage 10 properties in 30 minutes per day instead of 3 hours'),
  ('bmc_channels',    E'Airbnb host Facebook groups (UK, US, Australia)\nProperty investment communities (BiggerPockets, PropertyHub)\nSTR host podcasts and YouTube channels\nAirbnb host meetups and co-hosting events\nDirect integration with Airbnb and Booking.com partner programmes'),
  ('bmc_cr',          E'Morning inbox review creates daily essential usage\nPricing alert: "Event in your city next weekend — raise rates now"\nMaintenance log creates switching cost as property history builds\nMonthly performance report: occupancy rate vs market average\nHost community: share what''s working in specific markets'),
  ('bmc_revenue',     E'Starter £49/month: up to 3 properties, unified inbox, basic analytics\nPro £99/month: up to 10 properties, dynamic pricing, maintenance log\nGrowth £199/month: unlimited properties, team access, API, direct booking site\nSetup fee: £99 one-off per account\nDirect booking website: included in Growth, £19/month standalone'),
  ('bmc_activities',  E'Airbnb, Booking.com, VRBO API integrations (messaging, calendar, pricing)\nDynamic pricing algorithm (local events, competitor rates, occupancy)\nAI reply suggestion engine\nMaintenance request and contractor management\nDirect booking website builder'),
  ('bmc_resources',   E'OTA API integrations (Airbnb, Booking.com, VRBO, Expedia)\nDynamic pricing data feeds (local events, competitor pricing)\nAI reply suggestion model\nMaintenance and property management infrastructure\nHost community platform'),
  ('bmc_partners',    E'Airbnb, Booking.com, and VRBO (API partner programmes)\nDynamic pricing data providers (AirDNA, Pricelabs)\nProperty management cleaning companies\nSmart lock providers (August, Nuki) for access management\nProperty investment educators and communities'),
  ('bmc_costs',       E'OTA API integration and maintenance engineering\nDynamic pricing data feeds\nAI reply model training and inference\nMarketing: STR host communities and Facebook groups\nCustomer success for host onboarding\nDynamic pricing data costs')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='proptech' WHERE user_id=(SELECT id FROM users WHERE email='mike.t@seed50.dev');

-- ── 45. Inês · AI nutritionist for sports performance ────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='ines.c@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Amateur and semi-professional athletes in strength and endurance sports\nCrossfit athletes, runners, cyclists, and triathletes aged 18–40\nAthletes who train seriously but can''t afford a performance nutritionist (£100+/session)\nPersonal trainers wanting to offer nutrition guidance to clients'),
  ('bmc_value',       E'Macros and micronutrients adjust automatically based on yesterday''s training and tomorrow''s plan\nFood log with barcode scanner and instant macro calculation\n20% better recovery metrics and PBs within 8 weeks\nNot a generic calculator — accounts for intensity, duration, and sport type\nFeel the difference: more energy, better recovery, fewer energy crashes'),
  ('bmc_channels',    E'CrossFit affiliate gym partnerships\nRunning and cycling club networks\nStrava and Garmin Connect integration (device community)\nFitness influencer partnerships\nApp Store under "nutrition" and "sports performance"'),
  ('bmc_cr',          E'Daily food log creates non-negotiable daily habit\nTraining session log creates second daily touchpoint\nWeekly performance summary: "your recovery nutrition improved 18% this week"\nPB notification: share your achievement in app community\nCoach portal: PT shares athlete progress with their athlete clients'),
  ('bmc_revenue',     E'Free: 7-day trial, basic macro tracking\nAthlete £9.99/month: adaptive nutrition, training integration, food log\nPerformance £19.99/month: sport-specific protocols, coach sharing, hydration tracking\nCoach plan £39/month: manage up to 20 athletes\nCrossFit gym affiliate: £5/member/month (gym pays, members get free access)'),
  ('bmc_activities',  E'Adaptive nutrition algorithm (training load → macro targets)\nFood database and barcode scanner\nWearable and training log integrations (Garmin, Strava, TrainingPeaks)\nSport-specific nutrition protocol library\nCoach portal development'),
  ('bmc_resources',   E'Adaptive nutrition algorithm\nFood database (2M+ items with macro data)\nTraining log and wearable API integrations\nSport nutrition advisory board\nCoach and gym sales team'),
  ('bmc_partners',    E'Garmin, Strava, and TrainingPeaks for training data integration\nCrossfit affiliate gym network\nRunning and cycling brands for co-marketing\nSport nutrition brands for product recommendations\nRegistered dietitians for clinical accuracy advisory'),
  ('bmc_costs',       E'Adaptive nutrition algorithm development\nFood database licensing and maintenance\nWearable and training platform integrations\nMarketing: CrossFit gyms and endurance sports communities\nSport nutrition advisory board\nCoach sales team')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='healthtech' WHERE user_id=(SELECT id FROM users WHERE email='ines.c@seed50.dev');

-- ── 46. Jake · E-signature tool for sole traders ─────────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='jake.h@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Sole traders, freelancers, and consultants sending 1–10 documents per month\nCreative professionals (photographers, designers, copywriters) sending client contracts\nSelf-employed tradespeople sending quote acceptance forms\nSmall businesses needing signed T&Cs without enterprise pricing'),
  ('bmc_value',       E'Send a contract for signature in 60 seconds\nSigner clicks a link and signs in their browser — no account needed\nDocument stored and emailed to both parties instantly\nLegally binding electronic signature (eIDAS compliant)\nFree for up to 5 documents per month — no card required'),
  ('bmc_channels',    E'Reddit r/freelance and r/UKfreelance\nProduct Hunt launch\nFreelancer newsletter sponsorships\nFreelance platform communities (PeoplePerHour, Fiverr)\nGoogle Ads: "free e-signature tool freelancers"'),
  ('bmc_cr',          E'First signed contract is the "aha" moment — users immediately share with peers\nDocument history builds switching cost over time\nEmail reminder when documents are viewed but not signed\nFreelancer tools bundle: integrates with FreeAgent and Xero\nTemplate library: save your standard contract and reuse in one click'),
  ('bmc_revenue',     E'Free: 5 documents/month, standard branding\nPro £7.99/month: unlimited documents, custom branding, templates, reminders\nBusiness £14.99/month: team access (3 users), bulk send, API\nPay-as-you-go: £1.50 per document above free tier\nAnnual: 2 months free'),
  ('bmc_activities',  E'PDF signature placement and rendering\nSigner browser experience (no-account signing)\nDocument storage and email delivery\nLegal validity and eIDAS compliance maintenance\nTemplate library and branding customisation'),
  ('bmc_resources',   E'PDF processing and signature rendering engine\nDocument storage infrastructure\nEmail delivery and notification system\nLegal validity framework (eIDAS compliance)\nFreelancer community marketing team'),
  ('bmc_partners',    E'FreeAgent and Xero (accounting integration — refer and bundle)\nFreelancer platforms (PeoplePerHour, Fiverr) for in-platform integration\nLegal validity certification partners\nGoogle Workspace and Microsoft 365 for document import\nFreelancer associations (IPSE) for distribution'),
  ('bmc_costs',       E'PDF processing and storage infrastructure\nEmail delivery infrastructure\nMarketing: freelancer communities and Product Hunt\nLegal validity and eIDAS compliance maintenance\nCustomer support\nIntegration engineering')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='legaltech' WHERE user_id=(SELECT id FROM users WHERE email='jake.h@seed50.dev');

-- ── 47. Yemi · Podcast show notes automation ─────────────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='yemi.a@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Independent podcasters publishing weekly episodes without a production team\nB2B podcasters where SEO-optimised show notes drive lead generation\nPodcast agencies producing shows for multiple clients\nYouTube creators converting videos to podcast format with transcripts'),
  ('bmc_value',       E'Upload audio, get publication-ready show notes in 3 minutes\nSEO-optimised: structured with H2 headings, keywords, and meta description\nTimestamped chapters for Spotify, Apple, and YouTube\nFull transcript included — accessibility and SEO\n3 social media posts (LinkedIn, Twitter/X, Instagram caption) per episode'),
  ('bmc_channels',    E'Podcast hosting platform integrations (Buzzsprout, Anchor, Transistor)\nFacebook creator and podcaster communities\nProduct Hunt launch\nPodcast editing and production community (Descript users)\nYouTube and TikTok tutorials on podcast SEO'),
  ('bmc_cr',          E'Weekly podcast schedule creates weekly usage cycle\nEpisode history builds switching cost\nPodcast RSS import: auto-detects new episodes and prompts\nMonthly search ranking report: "these 3 episodes now rank for their topics"\nAgency plan: client management dashboard'),
  ('bmc_revenue',     E'Free: 2 episodes/month\nCreator £9.99/month: unlimited episodes, all features\nAgency £39/month: 10 shows, client management, white-label\nOne-off episode: £3.99 (for infrequent publishers)\nAnnual: 2 months free (35 paying users at £9.99 = £315 MRR currently)'),
  ('bmc_activities',  E'Audio transcription pipeline (Whisper)\nSEO-optimised show notes generation (LLM)\nTimestamp extraction and chapter marking\nSocial post generation\nPodcast hosting platform integrations'),
  ('bmc_resources',   E'Audio transcription infrastructure (Whisper API)\nLLM for show notes and social post generation\nPodcast hosting API integrations\nSEO optimisation models and keyword tooling\nAgency management dashboard'),
  ('bmc_partners',    E'Podcast hosting platforms (Buzzsprout, Transistor, Captivate) for integration\nDescript for cross-promotion (editing + show notes bundle)\nPodcast directories (Spotify, Apple) for show notes format compliance\nSEO tools (Ahrefs, Semrush) for keyword integration\nPodcast agencies for white-label agency plan'),
  ('bmc_costs',       E'Whisper API transcription costs\nLLM inference for show notes and social posts\nPodcast hosting API integrations\nMarketing: podcaster communities and Product Hunt\nCustomer support\nSEO quality auditing')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='media' WHERE user_id=(SELECT id FROM users WHERE email='yemi.a@seed50.dev');

-- ── 48. Anna · Fleet tyre monitoring for hauliers ────────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='anna.b@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Road haulage and logistics companies with 10–200 HGVs\nCoach and bus operators with strict roadworthiness compliance requirements\nFleet leasing companies managing tyre maintenance across clients\nLocal authority fleet managers with HGV and van assets'),
  ('bmc_value',       E'Zero preventable tyre blowouts — driver alerted 2 hours before a tyre fails\nFleet manager sees full tyre status across entire fleet in one dashboard\nHSE compliance evidence: timestamped tyre pressure records\nInsurance premium reduction: 8% average in first year\n£3,000+ saved per avoided blowout incident (repair + recovery + downtime)'),
  ('bmc_channels',    E'Road haulage trade associations (RHA, FTA / Logistics UK)\nInsurance broker partnerships (risk reduction premium reduction)\nFleet management software integrations (Microlise, Samsara)\nHGV tyre suppliers and fitting networks\nDirect outreach to fleet managers at logistics companies'),
  ('bmc_cr',          E'Daily dashboard check is non-negotiable for compliance-conscious fleet managers\nAutomated HSE-ready compliance report every month\nInsurance discount letter every year reinforces retention\nDriver app: daily pre-check replaced by live sensor data\nContract renewal: 12-month minimum with price lock'),
  ('bmc_revenue',     E'Hardware: £85/sensor (typically 6 per vehicle = £510/vehicle)\nSaaS: £18/vehicle/month (monitoring, dashboard, alerts, reports)\nEnterprise: multi-depot management, API, custom reporting\nMaintenance partner referral: £30 per tyre replacement referral\nInsurance data sharing: revenue share with insurer for risk data (opt-in fleet)'),
  ('bmc_activities',  E'IoT tyre sensor manufacturing or white-labelling\nFleet management dashboard development\nDriver mobile app for real-time alerts\nHSE compliance report generation\nFleet manager sales and hardware installation'),
  ('bmc_resources',   E'IoT tyre pressure and temperature sensors (manufactured or white-labelled)\nFleet dashboard infrastructure\nDriver alert mobile app\nHSE compliance report engine\nFleet manager sales and installation team'),
  ('bmc_partners',    E'IoT sensor manufacturers for white-labelling\nFleet management platforms (Microlise, Samsara) for integration\nInsurance brokers and underwriters (risk data partnership)\nHGV tyre fitting networks (ATS, Michelin Fleet)\nRoad haulage associations (RHA, Logistics UK) for distribution'),
  ('bmc_costs',       E'IoT sensor hardware costs\nFleet dashboard and driver app engineering\nFleet manager sales and installation team\nMarketing: haulage trade associations and events\nInsurance partnership development\nCloud infrastructure for real-time sensor data')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='logistics' WHERE user_id=(SELECT id FROM users WHERE email='anna.b@seed50.dev');

-- ── 49. Leo · Shopify subscription analytics ─────────────────────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='leo.c@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'Shopify DTC brands with £10k–£500k MRR from subscription products\nShopify Plus brands with subscription as a core revenue stream\nD2C brand operators managing retention and churn as their #1 metric\nBrands using Recharge, Bold, or Skio for subscription billing'),
  ('bmc_value',       E'Connect via Shopify OAuth in 5 minutes — no data warehouse needed\nCohort retention grid: see exactly which customer cohorts churn fastest\nChurn prediction: 30-day early warning on at-risk subscribers\nLTV by acquisition source: know which channel delivers your best subscribers\nMRR, churn rate, and subscriber growth in one clean dashboard'),
  ('bmc_channels',    E'Shopify App Store (primary distribution)\nRecharge and Skio partner marketplaces\nDTC brand Slack and Discord communities\nEcommerce podcasts and newsletters (My First Million, 2PM)\nDirect outreach to Shopify Plus brands with subscription revenue'),
  ('bmc_cr',          E'Weekly MRR change email keeps founders returning every Monday\nChurn prediction alert: "12 subscribers at high risk this week — act now"\nMonthly cohort update creates cadenced return visit\nBoard reporting export: one-click PDF for investor deck\nShopify App Store reviews create trust flywheel'),
  ('bmc_revenue',     E'Starter £49/month: up to £50k MRR, core metrics\nGrowth £79/month: up to £200k MRR, churn prediction, LTV by source\nScale £149/month: unlimited MRR, API, custom dashboards, team seats\nEnterprise: custom data warehouse export — custom pricing\nCurrently: 22 paying customers at £79/month = £1,738 MRR'),
  ('bmc_activities',  E'Shopify OAuth integration and data sync\nCohort analysis and retention modelling\nChurn prediction model training\nLTV and acquisition source attribution\nShopify App Store optimisation and reviews'),
  ('bmc_resources',   E'Shopify API integration\nCohort analysis and retention models\nChurn prediction ML model\nData visualisation and dashboard infrastructure\nShopify App Store listing and review management'),
  ('bmc_partners',    E'Shopify (App Store distribution — critical)\nRecharge and Skio (subscription billing platforms — integration)\nShopify Plus partners for co-sell\nDTC brand communities (Slack groups, Discord)\nE-commerce agencies managing Shopify brands'),
  ('bmc_costs',       E'Shopify API integration and maintenance\nChurn prediction model training and inference\nShopify App Store fees (20% of revenue)\nMarketing: DTC brand communities and App Store optimisation\nCustomer success for onboarding\nCloud infrastructure for data processing')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='b2b-saas' WHERE user_id=(SELECT id FROM users WHERE email='leo.c@seed50.dev');

-- ── 50. Sara · Remote notarisation for property transactions ─────────────────
WITH ctx AS (SELECT u.id AS uid, i.id AS iid FROM users u JOIN ideas i ON i.user_id=u.id AND i.is_active=TRUE WHERE u.email='sara.m@seed50.dev')
INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content)
SELECT uid, iid, 'shape', v.fk, v.c FROM ctx, (VALUES
  ('bmc_segments',    E'International property buyers purchasing in EU countries from abroad\nExpats and non-residents completing property transactions in their home country\nProperty solicitors and notaries wanting to offer remote completion\nReal estate developers selling cross-border properties to international buyers'),
  ('bmc_value',       E'Complete property notarisation via 30-minute video call with a certified notary\nLegally valid in 12 EU jurisdictions — not a workaround, fully compliant\nSaves average buyer £2,400 in travel costs and 3 weeks in timeline\nTamper-proof digital notarial certificate with QR verification\nProperty solicitors close deals faster — no "waiting for client to fly in"'),
  ('bmc_channels',    E'International property law firms in Portugal, Spain, Germany (B2B primary)\nReal estate developers selling to international buyers\nExpat community Facebook groups (Portugal, Spain, France)\nProperty investment communities (Holborn Assets, IP Global clients)\nLinkedIn outreach to property solicitors and notaries in target jurisdictions'),
  ('bmc_cr',          E'Property solicitor partnership creates automatic referral at transaction closing\nNPS 71 in pilot — buyers proactively recommend to friends buying abroad\nDeveloper partnership: every unit sold to an international buyer uses platform\nAnnual property investors buy in multiple jurisdictions — repeat usage\nNotary subscription: certified notaries pay monthly to receive assignments'),
  ('bmc_revenue',     E'Transaction fee: £180–350 per notarisation (by document complexity)\nLaw firm platform access: £199/month per firm\nDeveloper partnership: £95/transaction (volume pricing)\nNotary subscription: £49/month to receive case assignments\nJurisdiction expansion: grant-funded for EU justice programmes'),
  ('bmc_activities',  E'Certified notary network recruitment per jurisdiction\nIdentity verification and document upload pre-session\nVideo notarisation session infrastructure (CQC equivalent per country)\nDigital certificate issuance and verification\nLaw firm onboarding and integration'),
  ('bmc_resources',   E'Certified notary network (12 EU jurisdictions)\nIdentity verification infrastructure (AML/KYC compliant)\nVideo session platform with session recording\nDigital certificate issuance and verification system\nLegal entity per jurisdiction for regulatory compliance'),
  ('bmc_partners',    E'International property law firms (distribution — primary channel)\nCertified notaries per jurisdiction\nIdentity verification providers (Onfido, Sumsub)\nReal estate developers with international buyer base\nEU Justice programme (regulatory framework relationships)'),
  ('bmc_costs',       E'Notary network recruitment and per-jurisdiction legal compliance\nIdentity verification costs per transaction\nVideo session infrastructure\nDigital certificate infrastructure\nLaw firm and developer sales team\nLegal entity maintenance per jurisdiction')
) AS v(fk,c)
ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content;
UPDATE ideas SET business_domain='legaltech' WHERE user_id=(SELECT id FROM users WHERE email='sara.m@seed50.dev');

SELECT 'Tranche 5 complete: BMC + domains set for ideas 41-50. All 50 ideas done.' AS status;
