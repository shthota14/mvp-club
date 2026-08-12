#!/usr/bin/env python3
"""
MVP Club — 100 community pain point seed
Generates SQL to stdout. Run:
  python3 backend/src/db/generate_pain_points.py > backend/src/db/seed-pain-points.sql
  PGPASSWORD=mvpclub_secret psql -h localhost -p 5433 -U mvpclub -d mvpclub -f backend/src/db/seed-pain-points.sql
"""

import random, json

random.seed(77)

PAIN_POINTS = [
  # --- Agency / Freelance ---
  ("Agency client onboarding takes 2 weeks of back-and-forth emails just to collect briefs, assets, and approvals.",
   "Agency owner · 5–20 person team", "Weekly", "high", "b2b-saas"),

  ("We lose track of which client gave verbal approval vs written approval. Ends up in arguments over scope.",
   "Project manager · Creative agency", "Weekly", "high", "b2b-saas"),

  ("Freelancers quote projects, client agrees, then ghosts when the invoice arrives. No paper trail.",
   "Freelancer · Solo", "Monthly", "high", "b2b-saas"),

  ("Every agency retainer ends up with scope creep because there's no easy way to log and approve change requests.",
   "Account manager · Mid-size agency", "Weekly", "high", "b2b-saas"),

  ("Chasing client feedback takes longer than doing the actual work. Clients respond on WhatsApp, email, and Slack all at once.",
   "Designer · Freelancer", "Daily", "high", "b2b-saas"),

  ("Agency timesheets are filled in on Friday for the whole week from memory. The data is useless.",
   "Operations manager · Agency", "Weekly", "medium", "hr-tech"),

  ("We onboard a new contractor and it takes a full day just to get them access to the tools they need.",
   "Studio manager · Creative studio", "Monthly", "medium", "b2b-saas"),

  # --- SaaS / Startup ---
  ("Cancellation flows are buried 5 clicks deep so users churn silently without leaving feedback.",
   "Founder · Early-stage SaaS", "Daily", "high", "b2b-saas"),

  ("Trial-to-paid conversion is a black box. We have no idea which features actually drive upgrades.",
   "Head of growth · B2B SaaS", "Daily", "high", "b2b-saas"),

  ("Customer success teams duplicate work — they manually check Stripe, Intercom, and the CRM separately for every account review.",
   "Customer success manager · SaaS", "Daily", "high", "b2b-saas"),

  ("We have 12 Slack integrations but no single place to see which one triggered an alert and why.",
   "CTO · Startup", "Daily", "medium", "devtools"),

  ("Product roadmap is maintained in Notion but engineering uses Jira. They're always out of sync.",
   "Product manager · Scale-up", "Weekly", "high", "b2b-saas"),

  ("Onboarding emails go out the same day regardless of whether the user has actually activated. Feels robotic.",
   "Growth lead · SaaS startup", "Daily", "medium", "b2b-saas"),

  ("We spend more time formatting release notes than writing them. No standard template, no discipline.",
   "Engineering manager · SaaS", "Weekly", "low", "devtools"),

  ("Pricing page A/B tests take 3 weeks to set up because engineering is always busy.",
   "Founder · Early SaaS", "Monthly", "medium", "b2b-saas"),

  # --- HR / People Ops ---
  ("Manager 1-on-1 notes are scattered across personal Notion pages. No visibility for HR or continuity when managers leave.",
   "HR director · 50-person company", "Weekly", "high", "hr-tech"),

  ("Annual performance reviews take 3 months to complete. By the time feedback is actioned the context is gone.",
   "People ops manager · Scale-up", "Occasionally", "high", "hr-tech"),

  ("New hires get a 40-tab onboarding doc and then get left alone. Half the tabs are out of date.",
   "HR manager · Tech company", "Monthly", "high", "hr-tech"),

  ("We run pulse surveys but the results sit in a spreadsheet nobody reads. No action, no follow-through.",
   "Head of people · Startup", "Monthly", "medium", "hr-tech"),

  ("Remote team members don't know who does what. No simple internal directory that's actually kept up to date.",
   "Operations manager · Remote-first startup", "Weekly", "medium", "hr-tech"),

  ("Leave requests are still approved over email. Nothing feeds into payroll automatically.",
   "Finance manager · SMB", "Weekly", "medium", "hr-tech"),

  ("Contractors vs employees have completely different access needs but we manage them the same way — badly.",
   "HR manager · Fast-growing startup", "Monthly", "high", "hr-tech"),

  # --- Finance / Accounting ---
  ("Reconciling expense receipts at month end takes 2 full days. Half the receipts are missing.",
   "Finance manager · 30-person company", "Monthly", "high", "fintech"),

  ("We invoice in 3 currencies and our accountant manually converts everything in a spreadsheet every quarter.",
   "CFO · Scale-up", "Monthly", "high", "fintech"),

  ("SaaS subscriptions show up differently on every card statement. Hard to categorise correctly for tax.",
   "Founder · Bootstrapped startup", "Monthly", "medium", "fintech"),

  ("We have no way to see which clients are profitable until we close the books 6 weeks after the quarter ends.",
   "Agency owner · 15-person studio", "Monthly", "high", "fintech"),

  ("Approving purchase orders still happens over email with no audit trail. Nightmare at year-end.",
   "Finance director · Mid-size company", "Weekly", "high", "fintech"),

  # --- Marketing ---
  ("UTM parameters are created inconsistently across 4 team members. Attribution data is a mess.",
   "Marketing manager · B2B company", "Daily", "high", "b2b-saas"),

  ("Creating a new landing page requires a developer. Marketing waits 2 weeks for every test.",
   "Head of marketing · SaaS", "Weekly", "high", "b2b-saas"),

  ("Social media scheduling tools don't let you reuse evergreen content automatically. Everything gets posted once and forgotten.",
   "Content manager · Media brand", "Weekly", "medium", "consumer"),

  ("Monthly marketing report takes 2 days to pull together from GA, LinkedIn, HubSpot, and Stripe separately.",
   "Marketing director · Scale-up", "Monthly", "high", "b2b-saas"),

  ("We write the same email in 4 variants for 4 segments. No tool makes personalisation easy without a developer.",
   "CRM manager · eCommerce brand", "Weekly", "medium", "b2b-saas"),

  ("Influencer campaigns have no standard contract or deliverable tracker. Every campaign is managed differently.",
   "Brand manager · Consumer startup", "Monthly", "medium", "consumer"),

  # --- Customer Support ---
  ("Support tickets get answered by whoever sees them first. No routing, no SLAs, no visibility.",
   "Head of support · SMB", "Daily", "high", "b2b-saas"),

  ("Customers submit the same support request in 3 channels — email, chat, and Twitter. We answer the same thing 3 times.",
   "Customer support lead · SaaS", "Daily", "high", "b2b-saas"),

  ("Escalated support tickets have no owner. They bounce between CS and engineering with no resolution.",
   "VP Customer Success · SaaS", "Weekly", "high", "b2b-saas"),

  ("New support reps take 3 months to get productive because there's no single source of truth for product knowledge.",
   "Support manager · Scale-up", "Monthly", "high", "b2b-saas"),

  ("We have 3 years of support ticket data and have never mined it to find product improvements.",
   "CTO · SaaS startup", "Occasionally", "medium", "devtools"),

  # --- Sales ---
  ("Sales reps log CRM notes manually after calls. Half forget and the data is always 2 days stale.",
   "Sales manager · B2B company", "Daily", "high", "b2b-saas"),

  ("Proposal templates are stored in Google Drive but everyone has their own version. No consistency.",
   "Account executive · SaaS company", "Weekly", "medium", "b2b-saas"),

  ("Demos take 45 minutes but we never record which objections came up. No way to learn across the team.",
   "Head of sales · Early-stage SaaS", "Weekly", "high", "b2b-saas"),

  ("Leads from events go into a spreadsheet and get followed up by whoever remembers. Most go cold.",
   "Business development · SMB", "Monthly", "high", "b2b-saas"),

  ("Our sales deck is updated once a quarter. Reps are presenting slides with old pricing and old case studies.",
   "VP Sales · Scale-up", "Monthly", "medium", "b2b-saas"),

  # --- Dev / Engineering ---
  ("Deploying to staging is 4 manual steps that we forget to document every time someone new joins.",
   "Software engineer · Startup", "Weekly", "medium", "devtools"),

  ("We review PRs 48 hours after they're opened because nobody has context by then.",
   "Engineering manager · 10-person team", "Daily", "medium", "devtools"),

  ("Local dev setup takes a new engineer a full day to get working. The README is always out of date.",
   "Senior engineer · SaaS startup", "Monthly", "medium", "devtools"),

  ("On-call rota is managed in a shared Google Sheet. People miss shifts and nobody notices until production breaks.",
   "DevOps engineer · Scale-up", "Weekly", "high", "devtools"),

  ("Postmortems get written but never reviewed. We keep having the same incidents.",
   "SRE · Mid-size SaaS", "Monthly", "high", "devtools"),

  ("Database migrations in production are terrifying because there's no rollback plan documented.",
   "Backend engineer · Startup", "Monthly", "high", "devtools"),

  ("Feature flags are toggled in production by whichever engineer remembers the environment variable name.",
   "Senior engineer · Scale-up", "Weekly", "medium", "devtools"),

  # --- Media / Content ---
  ("Podcast production involves 12 tools. Nothing talks to each other. Scheduling, editing, publishing, and promotion are siloed.",
   "Podcast producer · Independent", "Weekly", "high", "media"),

  ("Newsletter writers have no idea which past editions performed well before writing the next one.",
   "Newsletter creator · Solo", "Weekly", "medium", "consumer"),

  ("Journalists pitch stories in one tool, editors approve in email, and legal reviews in a PDF. No single workflow.",
   "Editor · Digital media company", "Daily", "high", "media"),

  ("Video content is shot, edited, uploaded — then nobody tracks if it actually drove any business outcome.",
   "Head of content · SaaS", "Monthly", "medium", "b2b-saas"),

  ("Guest booking for podcasts is managed in email threads. Follow-ups get missed and slots go unfilled.",
   "Podcast host · Media startup", "Weekly", "medium", "media"),

  # --- eCommerce ---
  ("Returns processing is manual. CS reads each return request, approves by email, and updates inventory by hand.",
   "Operations manager · eCommerce brand", "Daily", "high", "marketplace"),

  ("Product descriptions are written once and never updated even when specs change. Customer complaints follow.",
   "eCommerce manager · DTC brand", "Monthly", "medium", "marketplace"),

  ("Abandoned cart emails go to everyone uniformly. No segmentation by product category or cart size.",
   "Growth manager · eCommerce", "Daily", "medium", "marketplace"),

  ("We sell across 3 marketplaces but manage inventory in each separately. Overselling is a weekly occurrence.",
   "Founder · eCommerce", "Weekly", "high", "marketplace"),

  # --- Education / Coaching ---
  ("Coaches track client progress in personal Google Sheets. Nothing is shared with the client consistently.",
   "Business coach · Solo practitioner", "Weekly", "medium", "edtech"),

  ("Online course creators record content but have no way to see where students drop off within a lesson.",
   "Course creator · Solopreneur", "Weekly", "medium", "edtech"),

  ("Tutoring sessions are booked via WhatsApp and paid via bank transfer. No automation anywhere.",
   "Private tutor · Solo", "Daily", "high", "edtech"),

  ("Corporate L&D teams commission training but have no way to measure if behaviours actually changed.",
   "L&D manager · Enterprise", "Monthly", "high", "edtech"),

  # --- Legal / Compliance ---
  ("NDAs are signed in DocuSign but the signed copy never makes it into the project folder. Tracking is manual.",
   "Legal ops manager · Scale-up", "Weekly", "medium", "legaltech"),

  ("GDPR data subject access requests arrive via email with no centralised way to track response deadlines.",
   "Compliance officer · Mid-size company", "Monthly", "high", "legaltech"),

  ("Contract renewals sneak up on the team because reminders are set in personal calendars, not a shared system.",
   "Procurement manager · Enterprise", "Monthly", "high", "legaltech"),

  ("Small businesses use Word templates for client contracts but never version-control them. Old terms go out by mistake.",
   "Founder · Consultancy", "Monthly", "medium", "legaltech"),

  # --- Health / Wellbeing ---
  ("GPs have no way to flag patients who missed follow-up appointments unless they check manually.",
   "GP practice manager · Healthcare", "Daily", "high", "healthtech"),

  ("Mental health practitioners track session notes in personal notebooks. No backup, no handover.",
   "Therapist · Private practice", "Weekly", "high", "healthtech"),

  ("Corporate wellness programmes have participation data but no link to absenteeism or productivity metrics.",
   "HR director · Enterprise", "Occasionally", "medium", "healthtech"),

  # --- Real Estate / PropTech ---
  ("Letting agents manually chase tenants for rent by text every month. Nothing is automated.",
   "Letting agent · Independent", "Monthly", "high", "proptech"),

  ("Property managers track maintenance requests on a whiteboard. Nothing is assigned, timed, or closed formally.",
   "Property manager · 50-unit portfolio", "Weekly", "high", "proptech"),

  ("Commercial lease renewals are tracked in a spreadsheet with no alerts. Several have lapsed unnoticed.",
   "Head of real estate · Corporate", "Occasionally", "high", "proptech"),

  # --- Logistics / Ops ---
  ("Delivery driver routes are planned by a dispatcher calling drivers on the phone every morning.",
   "Operations manager · SMB logistics", "Daily", "high", "logistics"),

  ("Supplier invoices arrive by post and email in mixed formats. Someone manually enters them into the accounting system.",
   "Finance manager · Manufacturer", "Weekly", "high", "logistics"),

  ("Stock counts are done by walking the warehouse with a clipboard once a month. Shrinkage is discovered too late.",
   "Warehouse manager · Mid-size retailer", "Monthly", "high", "logistics"),

  # --- Community / Events ---
  ("Event organisers track RSVPs in Eventbrite but sponsor deliverables in email. Post-event reporting is a nightmare.",
   "Event manager · Independent", "Monthly", "medium", "consumer"),

  ("Online community managers have no way to identify disengaged members before they leave quietly.",
   "Community manager · SaaS company", "Weekly", "medium", "b2b-saas"),

  ("Meetup organisers manually email speakers, venues, and attendees from a personal Gmail. Nothing is templated.",
   "Community organiser · Tech meetup", "Monthly", "medium", "consumer"),

  # --- Food / Hospitality ---
  ("Restaurant managers create rotas in Excel and send them by WhatsApp. Staff swap shifts informally with no record.",
   "Restaurant manager · Independent", "Weekly", "high", "foodtech"),

  ("Catering businesses quote jobs manually with no standard pricing model. Margins are unknown until after delivery.",
   "Catering founder · Solo to small team", "Monthly", "high", "foodtech"),

  ("Food suppliers send weekly price lists by PDF. Buyers update their own spreadsheets manually every week.",
   "Procurement manager · Restaurant group", "Weekly", "medium", "foodtech"),

  # --- General SMB ---
  ("Small business owners don't know if they'll be cash-flow positive next month without calling their accountant.",
   "SMB founder · Bootstrapped", "Monthly", "high", "fintech"),

  ("Business owners get their first clue a key employee is leaving when they hand in their notice. No early warning.",
   "Founder · 10-person company", "Occasionally", "high", "hr-tech"),

  ("Growing startups outgrow their tools every 6 months and spend weeks migrating data with no clear framework.",
   "COO · Scale-up", "Occasionally", "high", "b2b-saas"),

  ("Subscriptions and SaaS tools accumulate until someone does an audit at year-end. Usually £20k+ wasted annually.",
   "CFO · 50-person startup", "Occasionally", "high", "fintech"),

  ("Admin tasks (scheduling, filing, updating records) take a founder 10 hours a week that could go to growth.",
   "Founder · Early-stage", "Daily", "high", "b2b-saas"),

  # --- Additional ---
  ("AI-generated content from the team is never reviewed for accuracy before publishing. Errors erode trust.",
   "Content director · Media brand", "Weekly", "high", "media"),

  ("Sales and marketing define 'lead' differently. The handoff is a constant source of conflict.",
   "Revenue operations · SaaS", "Weekly", "medium", "b2b-saas"),

  ("Customer interview recordings sit in a shared Dropbox folder that nobody revisits. Insights are lost.",
   "Product manager · Startup", "Monthly", "medium", "b2b-saas"),

  ("Team retrospectives surface the same issues every sprint but nothing gets tracked as a follow-up action.",
   "Engineering lead · Agile team", "Weekly", "medium", "devtools"),

  ("Founders have no structured way to collect and prioritise feature requests from multiple customers.",
   "Founder · Early SaaS", "Daily", "medium", "b2b-saas"),

  ("Investor updates are written from scratch every quarter with no template or running log of progress.",
   "Founder · Seed-stage startup", "Monthly", "medium", "b2b-saas"),

  ("Remote employees feel disconnected from company decisions but there's no async mechanism to include them.",
   "Head of people · Remote-first", "Weekly", "medium", "hr-tech"),

  ("Startup financial models are built in Excel and break every time someone changes a cell reference.",
   "Founder · Pre-seed", "Monthly", "high", "fintech"),

  ("Vendor contracts are renewed automatically because nobody set a review reminder 90 days in advance.",
   "COO · 30-person company", "Monthly", "medium", "legaltech"),

  ("B2B SaaS companies have no structured process to identify expansion opportunities within existing accounts.",
   "Customer success manager · SaaS", "Monthly", "high", "b2b-saas"),

  ("Startup ops teams re-answer the same 10 questions from new hires every month because the FAQ doc is never maintained.",
   "Head of people · Early-stage startup", "Weekly", "medium", "hr-tech"),

  ("Agencies have no standard way to hand off a project to a new account manager when someone leaves mid-engagement.",
   "Operations director · Agency", "Monthly", "high", "b2b-saas"),

  ("SaaS founders can't tell which support issues are bugs vs user errors vs documentation gaps without manual triage.",
   "Founder · Self-funded SaaS", "Daily", "medium", "devtools"),
]

assert len(PAIN_POINTS) == 100, f"Need 100, got {len(PAIN_POINTS)}"

STAGES = ['idea', 'hone', 'validate', 'shape', 'done']
FREQ_OPTS = ['Multiple times a day', 'Daily', 'Weekly', 'Monthly', 'Occasionally']

def q(s): return s.replace("'", "''")

lines = []
def w(s): lines.append(s)

w("-- ============================================================")
w("-- MVP Club — 100 Community Pain Points seed")
w("-- ============================================================")
w("")
w("DO $PP$ DECLARE")
for i in range(1, 101):
    w(f"  v_u{i} UUID;")
    w(f"  v_p{i} UUID;")
w("BEGIN")
w("")

# Fetch user IDs from seed100 users
w("-- Fetch seed user IDs")
for i in range(1, 101):
    w(f"  SELECT id INTO v_u{i} FROM users WHERE email LIKE '%{i}@seed100.dev' LIMIT 1;")

w("")
w("-- Delete existing seeded pain points")
w("  DELETE FROM community_posts WHERE post_type = 'pain_point'")
w("    AND user_id IN (SELECT id FROM users WHERE email LIKE '%@seed100.dev');")
w("")

w("-- Insert 100 pain points")
random.seed(77)
for i, (desc, audience, freq, impact, domain) in enumerate(PAIN_POINTS, 1):
    stage = random.choice(STAGES)
    days_ago = random.randint(1, 180)
    content_json = json.dumps({
        "description": desc,
        "audience": audience,
        "frequency": freq,
        "impact": impact,
        "domain": domain,
    })
    encoded = f"||PP||{content_json}||END||"

    w(f"  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status, created_at)")
    w(f"  VALUES (v_u{i}, NULL, '{stage}', 'pain_point', '{q(encoded)}', 'approved', NOW() - INTERVAL '{days_ago} days')")
    w(f"  RETURNING id INTO v_p{i};")
    w("")

    # Add 2–8 encourage reactions from other seed users
    n_enc = random.randint(2, 8)
    reactors = random.sample([x for x in range(1, 101) if x != i], n_enc)
    for r in reactors:
        w(f"  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p{i}, v_u{r}, 'encourage') ON CONFLICT DO NOTHING;")

    # Add 1–4 ask reactions
    n_ask = random.randint(1, 4)
    askers = random.sample([x for x in range(1, 101) if x != i and x not in reactors], n_ask)
    for r in askers:
        w(f"  INSERT INTO reactions (post_id, user_id, type) VALUES (v_p{i}, v_u{r}, 'ask') ON CONFLICT DO NOTHING;")

    w("")

w("  RAISE NOTICE 'Pain points seed complete: 100 pain points with reactions inserted.';")
w("END $PP$;")

print("\n".join(lines))
