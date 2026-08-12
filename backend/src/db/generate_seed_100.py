#!/usr/bin/env python3
"""
MVP Club — 100 fictional non-AI SaaS idea seed
Generates SQL to stdout. Pipe to psql:
  python3 backend/src/db/generate_seed_100.py | \
    docker exec -i mvpclub-db-1 psql -U mvpclub -d mvpclub

All 100 ideas are at 'done' stage with:
  - Hone, validate, shape (BMC), done stage entries
  - 10–100 interviews per idea with answered questions
  - 10–100 surveys per idea with responses
  - Validation contacts
  - Diagrams (mockup JSON)
  - Community posts
"""

import random, json, uuid, sys
from datetime import datetime, timedelta

random.seed(42)

PW  = "$2a$12$undmfpnOGUw4AGMvv3NWguUGIfWaODarqgnG/oMU5nK4bGyzcw.di"
DOM = "seed100.dev"

def q(s): return s.replace("'", "''")
def lit(s): return f"'{q(s)}'"

# ── Shared pools ──────────────────────────────────────────────────────────────

FIRST = ["Aisha","Carlos","Priya","James","Mei","Felix","Yuki","Sarah",
         "David","Amara","Noah","Lena","Omar","Isabella","Raj","Chloe",
         "Kwame","Nina","Lucas","Fatima","Alex","Mia","Tom","Zara","Ben",
         "Elena","Kai","Sofia","Hans","Nia","Ravi","Camille","Ethan","Ada",
         "Marco","Liam","Hana","Pierre","Grace","Aaron","Diana","Sam",
         "Julia","Mike","Inês","Jake","Sara","Victor","Kenji","Layla",
         "André","Beatrice","Chen","Daria","Emeka","Farida","Giulio",
         "Helena","Ibrahim","Jade","Kofi","Luisa","Mohammed","Nadia",
         "Oscar","Petra","Quentin","Rosa","Stefan","Talia","Umar",
         "Valentina","Wanjiru","Xander","Yemi","Zofia","Arjun","Brigitte",
         "Callum","Dayo","Esme","Faisal","Greta","Hamid","Imelda","Jasper",
         "Kemi","Leo","Miriam","Nabil","Okonkwo","Phoebe","Quinn","Roshani",
         "Sven","Thabo","Una","Vince","Wren","Xochitl","Yoshi","Zahira"]

LAST  = ["Mwangi","Vega","Nair","Okafor","Lin","Brandt","Tanaka","Kowalski",
         "Reyes","Sow","Park","Fischer","Hassan","Costa","Mehta","Dubois",
         "Asante","Volkov","Andrade","Zahra","Jensen","Chen","Walsh",
         "Ibrahim","Thornton","Rossi","Nakamura","Lopez","Mueller","Brown",
         "Sharma","Bernard","Gray","Osei","Ferrari","O'Brien","Kim",
         "Martin","Nguyen","Levy","Petrov","Adeyemi","Weber","Tran",
         "Carvalho","Harrison","Mills","Silva","Ito","Khalil","Petit",
         "Wong","Rios","Okeke","Al-Rashid","Romano","Ivanova","Obi",
         "Johansson","Khan","Laurent","Nkosi","Papadopoulos","Rivera",
         "Schmidt","Torres","Uzun","Vieira","Wright","Xu","Yamamoto",
         "Zykov","Bose","Clement","Diallo","Evans","Fransen","Guerrero",
         "Hoffman","Ingram","Jamal","Kato","Lefebvre","Mbeki","Nwosu",
         "Ortega","Patel","Queiroz","Radic","Svensson","Theron","Unwin",
         "Vasquez","Watts","Xiong","Yoshida","Zafar"]

HELP_TYPES = ["finding_users","validation","pricing","technical","mvp_scope"]

IV_ROLES = [
    "Head of Product","CTO","Founder","Engineering Manager","VP Engineering",
    "Software Engineer","Product Manager","Designer","CEO","COO","CFO",
    "Head of Growth","Marketing Manager","Customer Success Manager",
    "Operations Manager","HR Manager","Finance Director","CMO","CRO",
    "Data Analyst","DevOps Engineer","Sales Director","Consultant",
    "Independent Developer","Freelancer","Agency Owner","Startup Founder",
]

IV_INSIGHTS_POOL = [
    "Confirmed the core problem — they're solving this manually every week.",
    "Would pay for a solution today if it existed.",
    "Said the biggest pain is the time cost, not the money.",
    "Highlighted a workflow we hadn't considered — adding to v2.",
    "Strong confirmation: they tried 3 other tools and none solved this.",
    "Validated pricing — our proposed tier is right in their budget.",
    "Found out there's a whole team affected by this, not just one person.",
    "Gave us a referral to 2 other potential customers at the end.",
    "Confirmed this is a C-suite priority — budget is available.",
    "Said they'd pay upfront for an annual contract if we launched today.",
    "Revealed that compliance is the #1 driver, not efficiency.",
    "Their current workaround costs them 10h/week per person.",
    "They've been burned by a similar tool that over-promised — trust is key.",
    "Confirmed the problem costs them ~£X,000/month in lost time.",
    "Said the onboarding experience is where they've given up on past tools.",
]

IV_STATUS = ["completed","completed","completed","completed","cancelled","completed"]

ALIGN = ["confirmed","confirmed","confirmed","partial","partial","not_confirmed"]

SOURCES = ["community","linkedin","email"]
CONTACT_STATUS = ["Done","Done","Replied","Sent","Call booked","Done"]

SV_QUESTIONS_POOL = [
    {"id":"q1","type":"scale","label":"How painful is this problem on a scale of 1–10?"},
    {"id":"q2","type":"text","label":"How do you currently solve this?"},
    {"id":"q3","type":"scale","label":"How likely are you to pay for a solution (1–10)?"},
    {"id":"q4","type":"choice","label":"What matters most?",
     "options":["Speed","Cost","Ease of use","Integrations","Support"]},
    {"id":"q5","type":"text","label":"What would make you switch from your current tool?"},
    {"id":"q6","type":"scale","label":"How often do you encounter this problem per week?"},
    {"id":"q7","type":"choice","label":"Which pricing model works for you?",
     "options":["Monthly subscription","Annual contract","Pay-per-use","Free + upgrade"]},
    {"id":"q8","type":"text","label":"Who else in your team is affected by this?"},
    {"id":"q9","type":"scale","label":"How much time does this cost you weekly (hours)?"},
    {"id":"q10","type":"text","label":"What would the ideal solution look like?"},
]

POST_TYPES = ["win","win","update","question","validation_request"]

# ── 100 companies ─────────────────────────────────────────────────────────────
# (slug, name, description, business_domain, industry_segment)

COMPANIES = [
  # Scheduling
  ("calsnap","CalSnap","Smart scheduling links for async teams — share your availability in one click, let anyone book without the back-and-forth.","b2b-saas","Scheduling"),
  ("formbee","FormBee","Beautiful no-code form builder with conditional logic, file uploads, and instant notifications.","b2b-saas","Forms"),
  ("quickfill","QuickFill","Embeddable form builder with 50+ templates, webhooks, and Zapier integration for non-coders.","b2b-saas","Forms"),
  ("docnest","DocNest","Help-centre builder for SaaS products — write articles once, embed anywhere, track what customers read.","b2b-saas","Documentation"),
  # Marketing
  ("affiliateloop","AffiliateLoop","Affiliate programme management SaaS — track referrals, automate payouts, and recruit affiliates from one dashboard.","b2b-saas","Affiliate Marketing"),
  ("winbox","WinBox","Customer testimonial collection and display — automated request emails, widget embed, and social proof wall.","b2b-saas","Testimonials"),
  ("lifecyclehq","LifecycleHQ","Behaviour-based email automation for SaaS — trigger messages based on feature usage, trial expiry, and lifecycle events.","b2b-saas","Email Automation"),
  # Analytics
  ("clearmeter","ClearMeter","Privacy-first web analytics with no cookies, no GDPR consent banner required, and real-time dashboards.","b2b-saas","Analytics"),
  ("simplestats","SimpleStats","Lightweight website analytics that respects visitor privacy — one script, instant insights, no data selling.","b2b-saas","Analytics"),
  ("tinymetrics","TinyMetrics","Cookie-free analytics with EU data residency, white-label reports, and agency client management.","b2b-saas","Analytics"),
  ("openview","OpenView","Open-source self-hosted web analytics alternative — deploy on your own server, own your data.","devtools","Analytics"),
  ("broadview","BroadView","Wide-angle analytics with session replay, heatmaps, and funnel visualisation — all privacy-compliant.","b2b-saas","Analytics"),
  ("devsignal","DevSignal","Developer-focused product analytics with feature flags, A/B testing, and cohort analysis built in.","devtools","Analytics"),
  ("eventframe","EventFrame","Auto-capture product analytics — install one snippet and see every user action without writing events.","devtools","Product Analytics"),
  # Monitoring / DevOps
  ("stackeye","StackEye","Log management and error monitoring for small engineering teams — alerts in Slack within 30 seconds.","devtools","Monitoring"),
  ("pingcheck","PingCheck","API uptime monitoring with multi-region checks, response-time tracking, and on-call escalation.","devtools","Monitoring"),
  ("uptimepal","UptimePal","Website uptime monitoring with public status pages, SMS alerts, and 1-minute check intervals.","b2b-saas","Monitoring"),
  ("pingpal","PingPal","Infrastructure monitoring for servers, databases, and ports — no agent required.","b2b-saas","Monitoring"),
  ("cronpal","CronPal","Scheduled-job monitoring — ping CronPal after every job run; get alerted if a job is late or fails.","devtools","Monitoring"),
  ("vaultbot","VaultBot","Automated cloud database backups to S3, Dropbox, or Google Drive — restore in one click.","devtools","Backup"),
  # WordPress
  ("wpdesk","WPDesk","WordPress site management platform — update plugins, monitor uptime, and manage unlimited client sites from one dashboard.","b2b-saas","WordPress"),
  ("zipwp","ZipWP","WordPress performance optimisation plugin — automatic image compression, caching, and Core Web Vitals fixes.","b2b-saas","WordPress"),
  ("wpnest","WPNest","WordPress agency management — white-label client reporting, bulk updates, and site health scoring.","b2b-saas","WordPress"),
  ("supportwp","SupportWP","Native WordPress help-desk plugin — manage support tickets directly from the WordPress admin.","b2b-saas","WordPress"),
  ("contactwp","ContactWP","WordPress CRM plugin — track leads, deals, and email history without leaving the WP dashboard.","b2b-saas","WordPress"),
  ("cartwp","CartWP","WordPress ecommerce with subscription billing, global payments, and no transaction fees.","b2b-saas","eCommerce"),
  # eCommerce / Payments
  ("digitalvault","DigitalVault","Digital product marketplace — sell ebooks, courses, and templates with instant delivery and VAT handling.","marketplace","Digital Goods"),
  ("citruspay","CitrusPay","SaaS payment and billing — sell subscriptions, one-time products, and trials with one link.","fintech","Payments"),
  ("sailpay","SailPay","Merchant of record for SaaS — we handle global tax, compliance, and chargebacks so founders can focus on product.","fintech","Payments"),
  # Subscription Analytics / Finance
  ("pulserevenue","PulseRevenue","Subscription analytics dashboard — MRR, churn, LTV, and cohort retention in one beautiful report.","fintech","Finance"),
  ("growthlens","GrowthLens","MRR and churn tracking for SaaS founders — connect Stripe and see your growth metrics updated daily.","fintech","Finance"),
  ("mrrscope","MRRScope","Subscription finance dashboard — track revenue, expansion, contraction, and churn by segment.","fintech","Finance"),
  # Membership / SaaS toolkit
  ("allbasehq","AllBaseHQ","All-in-one membership SaaS — auth, billing, and CRM in a single lightweight SDK for early-stage startups.","b2b-saas","Membership"),
  ("memberkey","MemberKey","No-code membership access control for Webflow, Framer, and WordPress — gate content by plan in minutes.","b2b-saas","Membership"),
  # Community
  ("starfield","StarField","Developer community platform — forums, changelog, and roadmap voting integrated with GitHub.","devtools","Community"),
  ("spacering","SpaceRing","Creator community platform — courses, live events, and monthly membership in one space.","consumer","Community"),
  ("clanbase","ClanBase","Customer community platform — embed a branded forum on your website, reduce support tickets by 35%.","b2b-saas","Community"),
  # Knowledge / Documentation
  ("paperhive","PaperHive","Team knowledge base — write, organise, and search internal docs with a clean editor and smart suggestions.","b2b-saas","Knowledge Base"),
  ("threadbase","ThreadBase","Collaborative wiki with real-time editing, version history, and Slack search integration.","b2b-saas","Wiki"),
  ("docknotes","DockNotes","Team documentation with nested pages, embeds, and one-click sharing with external guests.","b2b-saas","Documentation"),
  ("innerwiki","InnerWiki","Internal knowledge management — capture answers, SOPs, and runbooks with powerful search.","b2b-saas","Internal Docs"),
  ("devpages","DevPages","Developer documentation platform — write API references, changelog, and guides with a code-aware editor.","devtools","Developer Docs"),
  ("stackbooks","StackBooks","Knowledge management system — organise team knowledge in a book-like structure with full-text search.","b2b-saas","Knowledge Management"),
  # Screen Recording / Productivity
  ("quickrecord","QuickRecord","Browser extension screen recorder — record, annotate, and share short videos with a single link.","consumer","Screen Recording"),
  ("snapcloud","SnapCloud","Screenshot and screen recording tool — capture, annotate, and share with a shareable link instantly.","b2b-saas","Screen Recording"),
  ("sharpshot","SharpShot","Mac screenshot tool with annotation, cloud storage, and team sharing — one keyboard shortcut.","consumer","Productivity"),
  # Meeting / HR
  ("minutemate","MinuteMate","Meeting notes app — auto-transcribe calls, highlight action items, and send a summary to attendees.","b2b-saas","Meeting Notes"),
  ("meetpilot","MeetPilot","Meeting management tool — structured agendas, talking points, and automatic follow-up emails.","b2b-saas","Meeting Management"),
  ("dailypulse","DailyPulse","Team check-ins — async daily standups that replace the 9am meeting and keep remote teams aligned.","hr-tech","Team Check-ins"),
  # Coworking / Booking
  ("deskroam","DeskRoam","Coworking space management — desk booking, member billing, access control, and occupancy analytics.","b2b-saas","Coworking"),
  ("spacelock","SpaceLock","Facility booking system — book meeting rooms, desks, and equipment with calendar sync and usage reporting.","b2b-saas","Facility Management"),
  ("groupcal","GroupCal","Shared team calendar — overlay multiple team calendars, manage availability, and book group slots.","b2b-saas","Scheduling"),
  ("bookease","BookEase","Appointment scheduling for SMBs — intake forms, reminder emails, and no-show protection built in.","consumer","Scheduling"),
  ("slotboss","SlotBoss","Booking page builder — create a branded scheduling page in minutes, embed on any website.","consumer","Booking"),
  ("freeslot","FreeSlot","Open-source scheduling platform — self-host or use our cloud, connect any calendar, share your link.","b2b-saas","Scheduling"),
  # Time Tracking
  ("timemark","TimeMark","Time tracking for teams — log hours, track budgets, and send client reports automatically.","hr-tech","Time Tracking"),
  ("logtrack","LogTrack","Time tracking with project budgets, client invoicing, and Jira / Asana integration.","hr-tech","Time Tracking"),
  ("clockpad","ClockPad","Free time tracking for individuals and small teams — simple timer, reports, and CSV export.","hr-tech","Time Tracking"),
  ("timeharvest","TimeHarvest","Agency time tracking with expense logging, invoicing, and Xero/QuickBooks sync.","hr-tech","Time Tracking"),
  # Resource Planning
  ("flowfloat","FlowFloat","Resource planning for agencies — visualise team capacity, assign projects, and spot overbooking instantly.","hr-tech","Resource Planning"),
  ("deckteam","DeckTeam","Team resource scheduling — drag-and-drop planner for allocating people across projects and clients.","hr-tech","Resource Planning"),
  ("opscore","OpsCore","Agency ERP — projects, time, billing, and client management in one purpose-built platform.","b2b-saas","Agency ERP"),
  ("nestpsa","NestPSA","Professional services automation — quote to cash, resource management, and project profitability.","b2b-saas","Professional Services"),
  # Sales / Proposals
  ("quotekit","QuoteKit","Online quoting tool — build interactive quotes, clients accept and pay online in one step.","b2b-saas","Sales"),
  ("proposaldeck","ProposalDeck","Sales proposal software — beautiful templates, e-signature, and read-tracking built in.","b2b-saas","Sales"),
  ("buildprop","BuildProp","Proposal and contract builder — customise, send, and sign all in one workflow.","b2b-saas","Sales"),
  ("freelanceprop","FreelanceProp","Proposal software for freelancers — create a proposal in 5 minutes, sign online, get paid.","consumer","Freelancers"),
  # eSignature
  ("signeasy","SignEasy","eSignature platform for SMBs — send documents for signature in under a minute, no account required for signers.","legaltech","Legal"),
  ("dochello","DocHello","Document signing platform — bulk send, template library, and audit trail for compliance.","legaltech","Legal"),
  # Link Management
  ("linkjot","LinkJot","Link management platform — branded short links, QR codes, link-in-bio pages, and analytics.","b2b-saas","Marketing"),
  ("snaplink","SnapLink","URL shortener with custom domains, click analytics, and UTM builder.","b2b-saas","Marketing"),
  ("linkbrand","LinkBrand","Branded URL management — white-label short links for agencies and enterprise marketing teams.","b2b-saas","Marketing"),
  ("clickmap","ClickMap","Link tracking and analytics — see who clicked, when, from where, and on which device.","b2b-saas","Marketing"),
  # Status Pages / Incident
  ("pageops","PageOps","Status page builder — create a hosted status page with component groups, incident updates, and subscriber emails.","devtools","DevOps"),
  ("instapage","InstaPage","Hosted status pages with no-code setup, custom domain, and automatic uptime feed from monitoring.","devtools","Infrastructure"),
  ("uptimealert","UptimeAlert","Incident management — on-call schedules, alert escalation, and postmortem templates.","devtools","DevOps"),
  ("crispstatus","CrispStatus","Embeddable status widget — add a live status indicator to your website header in one line of code.","devtools","Infrastructure"),
  # Customer Support / Chat
  ("sparkchat","SparkChat","Live chat for SMBs — chat widget, shared inbox, and automated FAQs in one simple tool.","b2b-saas","Customer Support"),
  ("supportnest","SupportNest","Shared inbox help desk — manage email support as a team without losing context or duplicating replies.","b2b-saas","Help Desk"),
  ("ticketbee","TicketBee","Customer support ticketing — convert emails to tickets, track SLAs, and measure team performance.","b2b-saas","Customer Service"),
  ("inboxgroove","InboxGroove","Email help desk for small teams — familiar email interface with collision detection and canned replies.","b2b-saas","Help Desk"),
  ("deskteamwork","DeskTeamwork","Help desk platform — multi-channel support with email, chat, and social media in one queue.","b2b-saas","Customer Support"),
  # Slack Apps
  ("pollsnap","PollSnap","Polls and surveys for Slack — create polls in seconds, collect votes, and see results live in-channel.","b2b-saas","Collaboration"),
  ("nerdbot","NerdBot","Async standup bot for Slack — collect updates on your schedule, post a digest, skip the meeting.","b2b-saas","Remote Work"),
  ("standbot","StandBot","Standup automation — ask your team questions on a schedule and compile a readable digest.","b2b-saas","Team Management"),
  ("kudobot","KudoBot","Peer recognition bot — let teams celebrate wins and give kudos that show up in Slack and on a leaderboard.","hr-tech","HR"),
  # Team Chat
  ("teamflow","TeamFlow","Team messaging app — organised channels, threads, and integrations without the noise of big platforms.","b2b-saas","Collaboration"),
  ("threadflow","ThreadFlow","Async team messaging — threaded conversations with no interruptions, designed for remote-first teams.","b2b-saas","Collaboration"),
  ("boxfront","BoxFront","Collaborative customer inbox — manage all customer conversations across email and chat as a team.","b2b-saas","Customer Support"),
  # Lead Generation / Conversion
  ("popconvert","PopConvert","Exit-intent and pop-up builder — convert abandoning visitors with targeted offers and lead forms.","b2b-saas","Marketing"),
  ("leadbox","LeadBox","Lead generation widgets — spin-to-win, slide-ins, and countdown forms with A/B testing.","b2b-saas","Marketing"),
  ("optinmax","OptinMax","Email opt-in builder — build high-converting pop-ups, bars, and inline forms with drag-and-drop.","b2b-saas","Marketing"),
  ("funneltime","FunnelTime","Countdown funnel builder — add scarcity and urgency with deadline timers that personalise per visitor.","b2b-saas","Marketing"),
  # Checkout / eCommerce
  ("cartthrive","CartThrive","Shopping cart and checkout builder — sell courses, memberships, and products with one-click upsells.","b2b-saas","eCommerce"),
  ("hookpay","HookPay","Checkout optimisation — add post-purchase upsells to any Shopify store without changing the checkout.","b2b-saas","eCommerce"),
  # Email Marketing
  ("foxsend","FoxSend","Email marketing for creators — simple broadcast emails, automations, and paid newsletter monetisation.","consumer","Creator Economy"),
  ("litemail","LiteMail","Email marketing for SMBs — drag-and-drop editor, automations, and deliverability tools at a fraction of Mailchimp's price.","b2b-saas","Email Marketing"),
  ("sendpulse","SendPulse","Email campaign tool — visual email builder, list segmentation, and in-depth engagement analytics.","b2b-saas","Email Marketing"),
  ("campaignflow","CampaignFlow","Email automation for ecommerce — pre-built flows for welcome, abandoned cart, and win-back sequences.","b2b-saas","Email Marketing"),
  ("leadmagnet","LeadMagnet","Lead magnet builder — create ebooks, checklists, and mini-courses that grow your email list automatically.","b2b-saas","Marketing"),
]

assert len(COMPANIES) == 100, f"Expected 100 companies, got {len(COMPANIES)}"

# ── Idea-level content per company ────────────────────────────────────────────

def hone_entries(slug, name, desc):
    """Generate hone stage entries for an idea."""
    # We define domain-specific content per idea
    return IDEA_HONE.get(slug, {
        "what": f"A SaaS tool called {name} — {desc[:120]}",
        "who": "SMB founders, product managers, and operators who currently solve this problem manually or with spreadsheets",
        "problem": "Existing solutions are either too complex, too expensive, or built for enterprise — leaving small teams without a practical option",
        "outcome": f"Teams using {name} save 5+ hours per week and consistently report that it pays for itself within the first month",
    })

def validate_entries(slug, name):
    return IDEA_VALIDATE.get(slug, {
        "validation_plan": f"Talk to 20 potential users via LinkedIn and relevant Slack communities. Run a landing page with email capture to measure intent. Aim for 10 discovery calls before building anything.",
        "early_signals": f"Posted in 3 relevant communities and got 47 upvotes and 12 DMs within 48 hours asking when it would be available.",
        "who_to_talk_to": f"Founders and operators at bootstrapped SaaS companies and agencies — the people who feel the pain most acutely.",
        "key_question": f"Will they pay for this before we build it? We're testing with a pre-order waitlist at our proposed price point.",
    })

def shape_entries(slug, name, desc):
    return IDEA_SHAPE.get(slug, {
        "mvp_features": f"3 features only:\n1. Core {name} workflow (the thing they actually need)\n2. Simple onboarding — live in under 5 minutes\n3. Basic reporting so users can see value immediately\n\nCut from v1: advanced settings, team collaboration, API access, white-labelling.",
        "launch_target": f"Launch to 50 beta users from our waitlist. Free for 30 days. Measure: do they come back 3 days in a row? That's our activation metric.",
    })

def done_entries(slug, name):
    return IDEA_DONE.get(slug, {
        "launched": f"{name} launched publicly 90 days ago. We hit Product Hunt #3 Product of the Day and got 800 sign-ups in the first 48 hours.",
        "first_customer": "First paying customer signed up on day 2. A founder who'd been on our waitlist since the landing page went live. They said they'd been waiting for something like this.",
        "revenue_update": "Now at £4,200 MRR with 63 paying customers. Month-on-month growth of 28%. Churn is under 4%. We're profitable on a unit basis.",
        "next_milestone": "Target: £10k MRR by end of Q4. Hiring first CS person in month 4. Building out integrations based on top user requests.",
    })

def bmc_entries(slug, name, desc):
    b = IDEA_BMC.get(slug)
    if b: return b
    return {
        "bmc_segments": f"SMBs and startups with 2–50 employees who are the primary buyers\nFounders who wear multiple hats and need tools that work out of the box\nOperations and product teams at SaaS companies\nAgencies managing multiple clients who need a scalable solution",
        "bmc_value": f"{name} saves teams 5+ hours per week by automating the most repetitive part of their workflow\nNo complex setup — live in under 10 minutes\nPriced for bootstrapped teams, not enterprise budgets\nIntegrates with the tools you already use (Slack, Zapier, Stripe)\nTransparent pricing with no per-seat surprises",
        "bmc_channels": f"Product Hunt and Hacker News for initial launch\nContent marketing via SEO targeting high-intent keywords\nSlack and Discord communities where our target customers hang out\nPartner integrations and app marketplaces\nWord of mouth — happy customers refer colleagues",
        "bmc_cr": f"Self-serve onboarding with an interactive tutorial\nIn-app guidance and tooltips during first-week experience\nWeekly email digest showing users their usage and wins\nProactive success check-in at day 7 and day 30\nSlack community for power users and feature requests",
        "bmc_revenue": f"Starter plan: £29/month (individuals and very small teams)\nGrowth plan: £79/month (teams up to 10)\nPro plan: £149/month (unlimited seats + API access)\nAnnual billing at 20% discount\nCustom enterprise contracts for teams 50+",
        "bmc_activities": f"Product development and engineering\nContent creation and SEO\nCommunity building and engagement\nCustomer success and onboarding\nIntegration partner relationship management",
        "bmc_resources": f"Engineering team (core product)\nContent and SEO capability\nCustomer support function\nIntegration infrastructure\nData and analytics to guide product decisions",
        "bmc_partners": f"Zapier and Make for workflow integrations\nStripe for payment processing\nSlack for in-product notifications\nIntercom or Crisp for in-app support\nApp marketplaces for discovery",
        "bmc_costs": f"Engineering salaries (largest cost — 60% of burn)\nInfrastructure: hosting, databases, CDN\nCustomer acquisition: content marketing and paid\nTools and SaaS subscriptions\nCustomer support and success",
    }

# ── BMC overrides for first 30 companies (to have variety) ───────────────────
IDEA_BMC = {
"calsnap": {
  "bmc_segments": "Freelancers and consultants who schedule 10+ meetings per week\nRemote-first teams needing async scheduling across time zones\nSales teams replacing Calendly for team booking pages\nCoaches and therapists who charge by the session",
  "bmc_value": "Share one link and let anyone book a slot that works for you — no back-and-forth emails\nCustom availability windows, buffer times, and advance notice rules\nTeam round-robin and collective availability built in\nTimezone auto-detection for international clients\nBeautiful booking pages that reflect your brand",
  "bmc_channels": "Product Hunt launch (#2 Product of the Day)\nSlack communities for freelancers and remote workers\nGoogle Workspace Marketplace\nIntegration with major calendar apps as discovery channel\nReferral programme — 1 month free per referred customer",
  "bmc_cr": "Instant setup — live booking link in 3 minutes\nWeekly meeting summary email keeps users engaged\nIntegration with Google Calendar removes any reason to leave\nFree plan creates habit before converting to paid\nIn-app prompt when booking count exceeds free limit",
  "bmc_revenue": "Free: 1 calendar, basic booking page\nPro: £9/month — unlimited calendars, team pages, and custom domain\nTeams: £19/seat/month — round-robin, availability pooling, analytics\nAnnual 20% discount\nWhite-label reseller for agencies",
  "bmc_activities": "Calendar integration maintenance (Google, Outlook, Apple)\nProduct development and UX refinement\nMarketing and community building\nPartner integrations (Zoom, Stripe, Salesforce)\nSupport and onboarding",
  "bmc_resources": "Calendar API integrations\nBooking engine and availability logic\nMarketing and content team\nCustomer support function\nInfrastructure for real-time availability",
  "bmc_partners": "Google Workspace Marketplace for distribution\nZoom and Teams for meeting link generation\nStripe for session payment collection\nSlack for booking notifications\nSalesforce and HubSpot for CRM sync",
  "bmc_costs": "Engineering team (core product and integrations)\nCloud infrastructure\nMarketing and content\nCustomer support\nPayment processing fees",
},
"clearmeter": {
  "bmc_segments": "Website owners who want analytics without GDPR consent banners\nMarketing teams at European companies facing DPA scrutiny\nSmall business owners frustrated by Google Analytics complexity\nPrivacy-conscious developers and indie hackers",
  "bmc_value": "Full analytics insight without cookie banners or GDPR risk\nData stored in the EU — compliant by design with GDPR and ePrivacy\nSimple, fast dashboard — no certification course needed\nNo sampling — every visitor counted, not estimated\nOne pricing page: no hidden seats, modules, or data limits",
  "bmc_channels": "Developer communities (Hacker News, Reddit, IndieHackers)\nPrivacy-focused tech press and newsletters\nWordPress and Webflow plugin marketplaces\nOrganic SEO on 'privacy analytics' and 'no cookie analytics' terms\nSlack communities for marketers and startup founders",
  "bmc_cr": "30-day free trial with full features — no card required\nWeekly traffic summary email creates habit\nOne-line script install removes switching friction\nTransparent public changelog keeps community engaged\nOpen-source stats SDK builds developer trust",
  "bmc_revenue": "Starter: £9/month (up to 10 websites, 100k page views/month)\nGrowth: £19/month (unlimited sites, 1M page views)\nBusiness: £49/month (5M page views, priority support)\nAnnual 20% discount\nSelf-hosted enterprise licence (one-off fee)",
  "bmc_activities": "Analytics engine development\nData pipeline and EU infrastructure\nCompliance monitoring and legal review\nContent marketing and SEO\nPlugin and integration maintenance",
  "bmc_resources": "Data pipeline infrastructure (EU-hosted)\nLegal and compliance expertise\nEngineering team\nContent and SEO capability\nPartner integration resources",
  "bmc_partners": "WordPress.org plugin directory\nWebflow App Marketplace\nGDPR compliance advisors\nEU cloud providers for data residency\nPrivacy advocacy organisations for credibility",
  "bmc_costs": "EU infrastructure (significantly more than US hosting)\nEngineering and DevOps\nContent marketing and SEO\nLegal and compliance\nCustomer support",
},
"formbee": {
  "bmc_segments": "Non-technical founders and marketers who need forms quickly\nFreelancers building forms for client websites\nStartups collecting beta signups and user research\nNon-profits gathering volunteer and donor information",
  "bmc_value": "Build a beautiful, multi-step form in 5 minutes without writing code\n50+ pre-built templates for common use cases\nConditional logic that shows or hides fields based on answers\nInstant email notifications and Zapier integration\nCustom branding — your colours, your logo, no FormBee watermark",
  "bmc_channels": "Webflow and Squarespace marketplace listings\nGoogle search for 'online form builder'\nProduct Hunt launch and IndieHackers community\nYouTube tutorials driving organic discovery\nFreelancer communities and design forums",
  "bmc_cr": "Free plan supports up to 3 forms — taste the product before paying\nDrag-and-drop UX creates immediate delight\nEmail summary of submissions builds daily habit\nIn-app template gallery removes blank-page problem\nResponse milestone notifications (first 10, 100, 1000 responses)",
  "bmc_revenue": "Free: 3 forms, 100 responses/month\nPro: £15/month — unlimited forms, 10k responses, remove branding\nBusiness: £39/month — team seats, file uploads, payment fields\nEnterprise: custom pricing for HIPAA/SOC2 requirements\nAnnual 25% discount",
  "bmc_activities": "Form builder UX development\nTemplate library curation\nIntegration maintenance (Zapier, Make, Slack)\nSEO and content marketing\nCustomer support and education",
  "bmc_resources": "Form rendering and submission engine\nIntegration infrastructure\nTemplate design team\nContent and SEO capability\nCustomer support team",
  "bmc_partners": "Zapier and Make for integrations\nStripe for payment form processing\nSlack for submission notifications\nWebflow for embedded form distribution\nAirtable for submission storage integration",
  "bmc_costs": "Engineering team\nCloud infrastructure for form submissions\nContent and SEO\nCustomer support\nTemplate design resources",
},
}

# ── Hone / Validate / Shape / Done content per idea ──────────────────────────
IDEA_HONE = {
"calsnap": {
  "what": "a smart scheduling link tool that lets you share your availability and let anyone book a time — without the email back-and-forth",
  "who": "freelancers, consultants, and sales reps who schedule 10+ meetings per week and waste 30 minutes per booking on email chains",
  "problem": "scheduling a meeting between two people should take one message but typically involves 5–8 emails over 2–3 days — everyone knows it's broken but nobody's fixed it cleanly for small teams",
  "outcome": "share a link, someone picks a time that works for both of you, it appears in both calendars — zero emails, zero back-and-forth, 20 seconds total",
},
"formbee": {
  "what": "a no-code form builder where anyone can build a beautiful, conditional-logic form with file uploads and instant notifications in under 5 minutes",
  "who": "non-technical founders, marketers, and freelancers who need forms for their website but don't want to learn code or pay for over-engineered enterprise tools",
  "problem": "building a custom form that looks good, handles logic, and notifies the right person is surprisingly hard without code — and existing tools are either too simple or too expensive",
  "outcome": "a working form on your website in 5 minutes, submissions in your inbox within seconds, no developer required",
},
"clearmeter": {
  "what": "a privacy-first web analytics platform that gives you full visitor insights without cookies, consent banners, or GDPR risk — all data stored in the EU",
  "who": "website owners and marketing teams in Europe who want analytics data but are scared of GDPR enforcement and annoyed by cookie banners that hurt conversion rates",
  "problem": "Google Analytics requires a cookie consent banner that kills conversion rates — but marketers still need data to make decisions — there's no clean middle ground",
  "outcome": "full website analytics data — sessions, sources, pages, referrers — without a consent banner, without GDPR risk, and without needing a privacy lawyer",
},
}

IDEA_VALIDATE = {
"calsnap": {
  "validation_plan": "Send cold emails to 50 freelancers and consultants I find via LinkedIn and Twitter. Offer a free beta and 30-minute discovery call. Also post in 3 Slack communities for consultants.",
  "early_signals": "Shared a waitlist page on Twitter — 320 sign-ups in 4 days. 18 people replied with their current workarounds (mostly manual 'does Thursday at 3pm work?' emails).",
  "who_to_talk_to": "Freelancers and consultants who schedule 10+ meetings per week. Sales reps doing outbound. Coaches who charge by the session. Remote team leads managing cross-timezone meetings.",
  "key_question": "Will they switch from Calendly if we're cheaper and cleaner? Testing with a free beta offer to remove that friction.",
},
}

IDEA_SHAPE = {
"calsnap": {
  "mvp_features": "3 features only:\n1. Availability link generator (connect Google Calendar, set hours, get a link)\n2. Booking page (visitor picks a slot, gets a confirmation email, event created in both calendars)\n3. Basic settings: buffer time, advance notice, max bookings per day\n\nCut from v1: team booking, round-robin, payment collection, custom reminders, timezone group views.",
  "launch_target": "Launch to 200 people on our waitlist. Free for 90 days. Track: do they share their link with at least 5 people in the first week? That's our activation metric. Aim for 30% activation rate.",
},
}

IDEA_DONE = {
"calsnap": {
  "launched": "CalSnap launched publicly 120 days ago. We hit Product Hunt #2 Product of the Day and got 1,200 sign-ups in the first 48 hours. The simple link-sharing angle resonated immediately.",
  "first_customer": "First paying customer on day 3 — a freelance UX consultant who'd been using Calendly but hated the per-seat pricing. She upgraded to Pro the moment we enabled payment.",
  "revenue_update": "Now at £6,800 MRR with 89 paying customers. Month-on-month growth of 22%. Annual plan uptake is 41%. Churn under 3%.",
  "next_milestone": "Target: £15k MRR by Q2. Building team booking features next — our biggest upsell opportunity. Exploring Google Workspace Marketplace listing.",
},
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def rand_name():
    return random.choice(FIRST) + " " + random.choice(LAST)

def rand_email(prefix="user"):
    n = rand_name().lower().replace(" ", ".").replace("'","")
    return f"{n}@example{random.randint(1,9)}.com"

def ago(days):
    return f"NOW()-INTERVAL '{days} days'"

def ts(days_ago):
    dt = datetime.utcnow() - timedelta(days=days_ago)
    return dt.strftime("'%Y-%m-%d %H:%M:%S'")

# ── SQL generation ────────────────────────────────────────────────────────────

lines = []
def w(s): lines.append(s)

w("-- ============================================================")
w("-- MVP Club — 100 Fictional Non-AI SaaS Ideas (Full Seed)")
w("-- Generated automatically. All ideas at 'done' stage.")
w("-- Password for all accounts: password123")
w("-- ============================================================")
w("")
w("-- Hidden provenance flag — marks this row as seeded demo/beta content")
w("-- (never surfaced in the UI or API) so it can be filtered out or")
w("-- disabled later without deleting it. See backend/src/db/migrate-all.sql.")
w("-- IF NOT EXISTS makes this script safe to run standalone too.")
w("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_seed_beta BOOLEAN NOT NULL DEFAULT FALSE;")
w("")
w("DO $SEED$ DECLARE")
w(f"  v_pw TEXT := '{PW}';")

# Declare user vars
for i in range(1,101):
    w(f"  v_u{i} UUID;")
# Declare idea vars
for i in range(1,101):
    w(f"  v_i{i} UUID;")

w("BEGIN")
w("")
w("-- ─── 1. CLEAR OLD SEED DATA ─────────────────────────────────────────────")
w("""
  DELETE FROM survey_responses WHERE survey_id IN (
    SELECT id FROM surveys WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%@seed100.dev'
        OR email LIKE '%@seed50.dev'
        OR email LIKE '%@famous.dev'
        OR email LIKE '%@seedapp.dev'
    )
  );
  DELETE FROM surveys WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%@seed100.dev'
      OR email LIKE '%@seed50.dev'
      OR email LIKE '%@famous.dev'
      OR email LIKE '%@seedapp.dev'
  );
  DELETE FROM interview_questions WHERE interview_id IN (
    SELECT id FROM interviews WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%@seed100.dev'
        OR email LIKE '%@seed50.dev'
        OR email LIKE '%@famous.dev'
        OR email LIKE '%@seedapp.dev'
    )
  );
  DELETE FROM interviews WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%@seed100.dev'
      OR email LIKE '%@seed50.dev'
      OR email LIKE '%@famous.dev'
      OR email LIKE '%@seedapp.dev'
  );
  DELETE FROM diagrams WHERE idea_id IN (
    SELECT id FROM ideas WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%@seed100.dev'
        OR email LIKE '%@seed50.dev'
        OR email LIKE '%@famous.dev'
        OR email LIKE '%@seedapp.dev'
    )
  );
  DELETE FROM reactions WHERE post_id IN (
    SELECT id FROM community_posts WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%@seed100.dev'
        OR email LIKE '%@seed50.dev'
        OR email LIKE '%@famous.dev'
        OR email LIKE '%@seedapp.dev'
    )
  );
  DELETE FROM comments WHERE post_id IN (
    SELECT id FROM community_posts WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%@seed100.dev'
        OR email LIKE '%@seed50.dev'
        OR email LIKE '%@famous.dev'
        OR email LIKE '%@seedapp.dev'
    )
  );
  DELETE FROM community_posts WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%@seed100.dev'
      OR email LIKE '%@seed50.dev'
      OR email LIKE '%@famous.dev'
      OR email LIKE '%@seedapp.dev'
  );
  DELETE FROM validation_contacts WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%@seed100.dev'
      OR email LIKE '%@seed50.dev'
      OR email LIKE '%@famous.dev'
      OR email LIKE '%@seedapp.dev'
  );
  DELETE FROM stage_entries WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%@seed100.dev'
      OR email LIKE '%@seed50.dev'
      OR email LIKE '%@famous.dev'
      OR email LIKE '%@seedapp.dev'
  );
  DELETE FROM ideas WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%@seed100.dev'
      OR email LIKE '%@seed50.dev'
      OR email LIKE '%@famous.dev'
      OR email LIKE '%@seedapp.dev'
  );
  DELETE FROM users WHERE email LIKE '%@seed100.dev'
    OR email LIKE '%@seed50.dev'
    OR email LIKE '%@famous.dev'
    OR email LIKE '%@seedapp.dev';
""")

w("-- ─── 2. USERS ────────────────────────────────────────────────────────────")

# Assign founder names deterministically
random.seed(123)
used_names = set()
founder_names = []
for _ in range(100):
    while True:
        fn = random.choice(FIRST)
        ln = random.choice(LAST)
        full = f"{fn} {ln}"
        if full not in used_names:
            used_names.add(full)
            founder_names.append((fn, ln))
            break

for i, (slug, name, desc, domain, segment) in enumerate(COMPANIES, 1):
    fn, ln = founder_names[i-1]
    full_name = f"{fn} {ln}"
    initials = fn[0] + ln[0]
    email = f"{fn.lower()}.{ln.lower().replace(chr(39),'').replace(' ','')}{i}@{DOM}"
    help_types = random.sample(HELP_TYPES, random.randint(1,3))
    ht_arr = "{" + ",".join(help_types) + "}"
    w(f"  INSERT INTO users (email, name, password_hash, current_stage, community_opt, avatar_initials, help_types, is_seed_beta)")
    w(f"  VALUES ('{email}', '{q(full_name)}', v_pw, 'done', TRUE, '{initials}', '{ht_arr}', TRUE)")
    w(f"  ON CONFLICT (email) DO UPDATE SET current_stage='done', is_seed_beta=TRUE, updated_at=NOW();")
    w(f"  SELECT id INTO v_u{i} FROM users WHERE email='{email}';")
    w("")

w("-- ─── 3. IDEAS ───────────────────────────────────────────────────────────")

random.seed(456)
for i, (slug, name, desc, domain, segment) in enumerate(COMPANIES, 1):
    days_created = random.randint(180, 400)
    w(f"  INSERT INTO ideas (user_id, name, description, stage, is_active, idea_status, business_domain, moderation_status, created_at, updated_at)")
    w(f"  VALUES (v_u{i}, '{q(name)}', '{q(desc)}', 'done', TRUE, 'done', '{domain}', 'approved', {ago(days_created)}, {ago(random.randint(10,30))})")
    w(f"  RETURNING id INTO v_i{i};")
    w("")

w("-- ─── 4. STAGE ENTRIES ───────────────────────────────────────────────────")
w("  INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content, completed_at) VALUES")

random.seed(789)
entry_rows = []

for i, (slug, name, desc, domain, segment) in enumerate(COMPANIES, 1):
    base_days = random.randint(120, 350)

    # HONE stage
    hone = hone_entries(slug, name, desc)
    for k, v in hone.items():
        entry_rows.append(f"  (v_u{i},v_i{i},'hone','{k}','{q(v)}',{ago(base_days-20)})")

    # VALIDATE stage
    validate = validate_entries(slug, name)
    for k, v in validate.items():
        entry_rows.append(f"  (v_u{i},v_i{i},'validate','{k}','{q(v)}',{ago(base_days-40)})")

    # SHAPE stage — MVP features + launch target
    shape = shape_entries(slug, name, desc)
    for k, v in shape.items():
        entry_rows.append(f"  (v_u{i},v_i{i},'shape','{k}',E'{q(v)}',{ago(base_days-60)})")

    # SHAPE stage — BMC
    bmc = bmc_entries(slug, name, desc)
    for k, v in bmc.items():
        entry_rows.append(f"  (v_u{i},v_i{i},'shape','{k}',E'{q(v)}',{ago(base_days-60)})")

    # DONE stage
    done = done_entries(slug, name)
    for k, v in done.items():
        entry_rows.append(f"  (v_u{i},v_i{i},'done','{k}','{q(v)}',{ago(base_days-90)})")

# Write entries in batches
BATCH = 200
for start in range(0, len(entry_rows), BATCH):
    batch = entry_rows[start:start+BATCH]
    w(",\n".join(batch))
    if start + BATCH < len(entry_rows):
        w(";")
        w("  INSERT INTO stage_entries (user_id, idea_id, stage, field_key, content, completed_at) VALUES")
    else:
        w("  ON CONFLICT (idea_id, stage, field_key) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW();")

w("")
w("-- ─── 5. VALIDATION CONTACTS ─────────────────────────────────────────────")
w("  INSERT INTO validation_contacts (user_id, idea_id, source, name, contact, status, notes) VALUES")

random.seed(101)
contact_rows = []
contact_notes = [
    "Confirmed the problem is real and painful. Said they'd pay for a solution today.",
    "Currently using a manual workaround costing 3 hours per week. Very interested.",
    "Referred us to 2 other potential customers at the end of the call.",
    "Validated our pricing — said the Starter plan is exactly right for them.",
    "Asked to be on the beta waitlist. Will introduce us to their team.",
    "Has tried 2 competitor tools and given up. Desperate for something better.",
    "Small team but high pain. Would be an early advocate if we solve this.",
    "Confirmed problem at company level — it's not just them, entire team is affected.",
    "Said compliance is their #1 driver, not efficiency — good framing for messaging.",
    "Would pay upfront annually if we launched today. Very strong signal.",
    "Currently paying a contractor to do this manually. Our price is less than the contractor.",
    "Said they'd demo to their boss if we had a working prototype.",
    "Confirmed they have budget allocated for this category of tool.",
    "Highlighted an edge case we hadn't considered — useful product feedback.",
    "Sceptical but engaged — said 'if it works as described, we'd switch immediately'.",
]

for i, (slug, name, desc, domain, segment) in enumerate(COMPANIES, 1):
    n_contacts = random.randint(5, 20)
    for j in range(n_contacts):
        cname = rand_name()
        source = random.choice(SOURCES)
        status = random.choice(CONTACT_STATUS)
        contact_email = rand_email()
        note = random.choice(contact_notes)
        contact_rows.append(f"  (v_u{i},v_i{i},{lit(source)},{lit(cname)},{lit(contact_email)},{lit(status)},{lit(note)})")

for start in range(0, len(contact_rows), BATCH):
    batch = contact_rows[start:start+BATCH]
    w(",\n".join(batch))
    if start + BATCH < len(contact_rows):
        w(";")
        w("  INSERT INTO validation_contacts (user_id, idea_id, source, name, contact, status, notes) VALUES")
    else:
        w(";")

w("")
w("-- ─── 6. INTERVIEWS ──────────────────────────────────────────────────────")

random.seed(202)
iv_notes_pool = [
    "Confirmed problem is real. They spend 4+ hours per week on this manually.",
    "Pain point validated. Said current tools are 'clunky and expensive for what they do'.",
    "Strong signal — said they'd switch to our tool the day we launch.",
    "Confirmed pricing is acceptable. Pro tier is the right fit for their team.",
    "Key insight: their biggest pain isn't the feature itself, it's the reporting.",
    "Discovered a workflow we hadn't considered — might influence v2 roadmap.",
    "Said the integration with Slack is table stakes for adoption in their team.",
    "Confirmed they have tried 3 alternatives and none solved the core problem.",
    "Would be willing to pay upfront annual contract for right product.",
    "Surprised by how much time they waste on this — 8 hours per month conservatively.",
    "Said their biggest frustration is setup complexity, not the ongoing usage.",
    "Mentioned 4 colleagues who have the same problem — potential referral.",
    "Confirmed budget exists — this falls under their software tools allocation.",
    "Said their CTO would be the economic buyer — can intro us if we build MVP.",
    "Excellent call. Every question confirmed the problem. Asking to be first beta user.",
    "Cautious buyer but confirmed the problem. Would need strong case study to switch.",
]

iv_questions_templates = [
    ("Tell me about the last time this problem cost you significant time or money.", [
        "It happens every week honestly. Just last Tuesday I spent 3 hours doing something I know should take 20 minutes.",
        "We had a client escalation last month that traced directly back to this exact issue.",
        "Monthly — we do a manual reconciliation that takes my whole afternoon.",
        "It's a constant background tax. Probably 2-3 hours per week without realising.",
    ]),
    ("How are you currently solving this problem?", [
        "Combination of spreadsheets, Slack messages, and a lot of manual copying and pasting.",
        "We hired a part-time VA just to manage this. It's not a good use of anyone's time.",
        "We're not, really. We just live with the pain and complain about it in Slack.",
        "We have a custom Airtable setup that half works. It breaks every time something changes.",
    ]),
    ("What would the ideal solution look like to you?", [
        "Something I can set up in an afternoon, not a month. And that doesn't require a consultant.",
        "Just something that does the one thing well. I don't need 200 features — I need 5 that work.",
        "Integrates with what we already use — Slack, Notion, and Stripe. And is under £50/month.",
        "A tool where my whole team can be in it without a PhD in the settings page.",
    ]),
    ("How much would you pay for a solution that fully solved this?", [
        "If it genuinely solved the problem? £50-100 per month easily. It would pay for itself.",
        "Somewhere between £30 and £80 per month depending on the seats. Annual if you give a discount.",
        "I'd pay what I'm paying my VA — which is £400/month. That's the benchmark.",
        "Honestly, under £200/month for the whole team. We're bootstrapped so budget is real.",
    ]),
    ("Who else in your organisation is affected by this?", [
        "The whole ops team. And it bleeds into sales when the data isn't clean.",
        "Just me honestly — I'm the one who suffers. But when I suffer, everyone notices.",
        "Product, engineering, and customer success all hit this problem differently.",
        "My co-founder and one employee. Small team but all three of us feel it daily.",
    ]),
]

# Write interviews in batches per company
for i, (slug, name, desc, domain, segment) in enumerate(COMPANIES, 1):
    n_interviews = random.randint(10, 100)
    base_days = random.randint(60, 200)

    w(f"  -- Company {i}: {name} ({n_interviews} interviews)")
    w(f"  PERFORM set_config('seed.uid', v_u{i}::text, true);")
    w(f"  PERFORM set_config('seed.iid', v_i{i}::text, true);")
    w("  DO $IV$ DECLARE")
    w("    v_uid UUID;")
    w("    v_iid UUID;")
    for j in range(1, n_interviews+1):
        w(f"    v_iv{j} UUID;")
    w("  BEGIN")
    w("    v_uid := current_setting('seed.uid')::uuid;")
    w("    v_iid := current_setting('seed.iid')::uuid;")

    for j in range(1, n_interviews+1):
        iname = rand_name()
        irole = random.choice(IV_ROLES)
        iemail = rand_email()
        days_ago = random.randint(1, base_days)
        scheduled = ago(days_ago)
        status = random.choice(IV_STATUS)
        align = random.randint(1, 3)
        confirmed = "TRUE" if align >= 2 else "FALSE"
        notes = random.choice(iv_notes_pool)
        insights = random.choice(IV_INSIGHTS_POOL)

        w(f"    INSERT INTO interviews (idea_id, user_id, interviewee_name, interviewee_role, interviewee_email, scheduled_at, status, notes, key_insights, alignment_score, confirmed_problem)")
        w(f"    VALUES (v_iid, v_uid, '{q(iname)}', '{q(irole)}', '{q(iemail)}', {scheduled}, '{status}', '{q(notes)}', '{q(insights)}', {align}, {confirmed})")
        w(f"    RETURNING id INTO v_iv{j};")

        # Add 3 answered questions per interview
        num_q = min(3, len(iv_questions_templates))
        selected_qs = random.sample(iv_questions_templates, num_q)
        for qi, (question, answers) in enumerate(selected_qs):
            answer = random.choice(answers)
            w(f"    INSERT INTO interview_questions (interview_id, question, answer, order_index)")
            w(f"    VALUES (v_iv{j}, '{q(question)}', '{q(answer)}', {qi});")

    w("  END $IV$;")
    w("")

w("-- ─── 7. SURVEYS ─────────────────────────────────────────────────────────")

random.seed(303)
import hashlib

survey_titles = [
    "Problem Validation Survey",
    "Customer Discovery: Your Pain Points",
    "Pricing Feedback Survey",
    "Product-Market Fit Survey",
    "Feature Priority Survey",
    "Early Adopter Feedback",
    "Beta User Research",
    "Competitive Landscape Survey",
    "Willingness to Pay Survey",
    "Workflow & Tool Audit",
]

survey_descs = [
    "Help us understand how much this problem affects you and how you currently deal with it.",
    "We're building a solution to this problem and want to make sure we're solving the right thing.",
    "5 quick questions to help us understand if our pricing makes sense for your situation.",
    "We want to know if what we've built fits your workflow. Honest answers only!",
    "Help us decide what to build next by ranking the features that matter most to you.",
    "Quick survey for our beta testers — your feedback shapes the product.",
    "A few questions for people interested in our private beta. Takes 3 minutes.",
    "Help us understand the competitive landscape from your perspective.",
    "We want to make sure we price fairly — tell us what you'd actually pay.",
    "Understanding your current tools and workflow so we can build something better.",
]

answer_texts = [
    "Definitely — this is something I deal with regularly and it's genuinely painful.",
    "Yes, and it affects the whole team, not just me.",
    "This is exactly what I've been looking for. Sign me up for the beta.",
    "The pricing seems fair given the time it would save.",
    "I'd switch from my current tool if you nail the integrations.",
    "Currently using a manual process — a tool like this would be a big upgrade.",
    "I've tried 2 other tools but neither solved this cleanly.",
    "Speed and ease of use are most important to me — not features.",
    "I'd pay monthly but would consider annual with a good discount.",
    "My team has this exact problem. We talked about it in our last retro.",
]

for i, (slug, name, desc, domain, segment) in enumerate(COMPANIES, 1):
    n_surveys = random.randint(10, 100)
    base_days = random.randint(60, 180)

    w(f"  -- Company {i}: {name} ({n_surveys} surveys)")
    w(f"  PERFORM set_config('seed.uid', v_u{i}::text, true);")
    w(f"  PERFORM set_config('seed.iid', v_i{i}::text, true);")
    w("  DO $SV$ DECLARE")
    w("    v_uid UUID;")
    w("    v_iid UUID;")
    for j in range(1, n_surveys+1):
        w(f"    v_sv{j} UUID;")
    w("  BEGIN")
    w("    v_uid := current_setting('seed.uid')::uuid;")
    w("    v_iid := current_setting('seed.iid')::uuid;")

    for j in range(1, n_surveys+1):
        title = random.choice(survey_titles)
        svdesc = random.choice(survey_descs)
        # token: use a hash of company+index for uniqueness
        token_raw = f"{slug}-survey-{i}-{j}-{random.randint(100000,999999)}"
        token = hashlib.md5(token_raw.encode()).hexdigest()[:16]

        # Pick 3-5 questions
        num_svq = random.randint(3, 5)
        selected_svqs = random.sample(SV_QUESTIONS_POOL, num_svq)
        qs_json = json.dumps(selected_svqs)

        days_ago = random.randint(1, base_days)
        w(f"    INSERT INTO surveys (idea_id, user_id, token, title, description, questions, created_at)")
        w(f"    VALUES (v_iid, v_uid, '{token}', '{q(title)}', '{q(svdesc)}', '{q(qs_json)}', {ago(days_ago)})")
        w(f"    RETURNING id INTO v_sv{j};")

        # Add 5-20 responses per survey
        n_responses = random.randint(5, 20)
        for r in range(n_responses):
            rname = rand_name()
            remail = rand_email()
            alignment = random.choice(ALIGN)
            # Build answers
            answers = []
            for svq in selected_svqs:
                answer_text = random.choice(answer_texts)
                if svq["type"] == "scale":
                    answers.append({"id": svq["id"], "value": random.randint(6, 10)})
                elif svq["type"] == "choice":
                    answers.append({"id": svq["id"], "value": random.choice(svq.get("options", ["Option A"]))})
                else:
                    answers.append({"id": svq["id"], "value": answer_text})
            answers_json = json.dumps(answers)
            resp_days = random.randint(0, days_ago)
            w(f"    INSERT INTO survey_responses (survey_id, respondent_name, respondent_email, answers, alignment, created_at)")
            w(f"    VALUES (v_sv{j}, '{q(rname)}', '{q(remail)}', '{q(answers_json)}', '{alignment}', {ago(resp_days)});")

    w("  END $SV$;")
    w("")

w("-- ─── 8. DIAGRAMS (BMC MOCKUP) ───────────────────────────────────────────")

random.seed(404)

BMC_BLOCKS = [
    {"id":"partners","label":"Key Partners","x":0.0,"y":0.0,"w":1,"h":2,"color":"#E0E7FF"},
    {"id":"activities","label":"Key Activities","x":1.0,"y":0.0,"w":1,"h":1,"color":"#DBEAFE"},
    {"id":"resources","label":"Key Resources","x":1.0,"y":1.0,"w":1,"h":1,"color":"#DBEAFE"},
    {"id":"value","label":"Value Proposition","x":2.0,"y":0.0,"w":1,"h":2,"color":"#FCE7F3"},
    {"id":"cr","label":"Customer Relationships","x":3.0,"y":0.0,"w":1,"h":1,"color":"#D1FAE5"},
    {"id":"channels","label":"Channels","x":3.0,"y":1.0,"w":1,"h":1,"color":"#D1FAE5"},
    {"id":"segments","label":"Customer Segments","x":4.0,"y":0.0,"w":1,"h":2,"color":"#FEF9C3"},
    {"id":"costs","label":"Cost Structure","x":0.0,"y":2.0,"w":2.5,"h":1,"color":"#F3F4F6"},
    {"id":"revenue","label":"Revenue Streams","x":2.5,"y":2.0,"w":2.5,"h":1,"color":"#F3F4F6"},
]

for i in range(1, 101):
    items = {}
    for b in BMC_BLOCKS:
        items[b["id"]] = {
            "x": b["x"] * 180 + 20,
            "y": b["y"] * 160 + 20,
            "w": b["w"] * 180 - 10,
            "h": b["h"] * 160 - 10,
            "label": b["label"],
            "color": b["color"],
            "text": "",
        }
    state = json.dumps({"items": items, "arrs": []})
    w(f"  INSERT INTO diagrams (idea_id, state, updated_by, updated_at)")
    w(f"  VALUES (v_i{i}, '{q(state)}', v_u{i}, {ago(random.randint(10,60))})")
    w(f"  ON CONFLICT (idea_id) DO UPDATE SET state = EXCLUDED.state, updated_at = EXCLUDED.updated_at;")

w("")
w("-- ─── 9. COMMUNITY POSTS ─────────────────────────────────────────────────")
w("  INSERT INTO community_posts (user_id, idea_id, stage, post_type, content, moderation_status) VALUES")

random.seed(505)
win_templates = [
    "Just hit our first £1k MRR milestone! 30 days since launch. Feels surreal to get paid for something I built.",
    "First enterprise customer signed today — 6-month contract. This is the signal I needed to go all in.",
    "Product Hunt launch went better than expected — #2 of the day, 800 sign-ups in 24 hours. Inbox is flooded.",
    "Beta user just renewed for a full year without me asking. That's the strongest signal I've ever had.",
    "Just got our first referral from a customer — they sent us 3 new users without any incentive. Word of mouth is real.",
    "Onboarded our 50th paying customer today. From idea to 50 customers in 4 months. The grind was worth it.",
    "First cold inbound lead — someone found us via Google and signed up without ever talking to me. Distribution is working.",
    "Crossed £5k MRR this morning. Never thought I'd say this but I think we might actually have a business.",
]
update_templates = [
    "Week 3 of beta — 12 active users, 8 logged in today. Retention looks healthy.",
    "Finished validation this week. 18 interviews, 14 confirmed the problem. Building now.",
    "Just shipped the Slack integration. First feature built from direct user feedback.",
    "Had our best week yet — 22 sign-ups, 8 activated. Figuring out what activating users have in common.",
    "Pivoted our pricing after 3 interviews said our original plan was too high. Now converting at 3x the rate.",
    "Two months in. Slower than expected but the users we have love it. Focusing on depth over breadth.",
]
question_templates = [
    "Anyone been through the process of getting into a Webflow marketplace? How long does review take?",
    "How many user interviews did you do before you felt confident enough to start building?",
    "We're debating monthly vs annual pricing for our launch. What's worked for others here?",
    "Best approach to cold outreach for B2B SaaS validation? LinkedIn, email, or communities?",
    "How did you decide which integration to build first? We have 10 requests and no clear winner.",
]

post_rows = []
for i, (slug, name, desc, domain, segment) in enumerate(COMPANIES, 1):
    # Each company gets 2-5 posts
    n_posts = random.randint(2, 5)
    for _ in range(n_posts):
        post_type = random.choice(POST_TYPES)
        if post_type == "win":
            content = random.choice(win_templates)
        elif post_type == "update":
            content = random.choice(update_templates)
        else:
            content = random.choice(question_templates)
        post_rows.append(f"  (v_u{i},v_i{i},'done','{post_type}','{q(content)}','approved')")

w(",\n".join(post_rows))
w(";")

w("")
w("-- ─── 10. FINALIZE ──────────────────────────────────────────────────────")
w("  UPDATE users SET current_stage = 'done' WHERE email LIKE '%@seed100.dev';")
w("  UPDATE ideas SET moderation_status = 'approved' WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@seed100.dev');")
w("")
w("  RAISE NOTICE 'Seed complete: 100 users, 100 ideas, all stages, BMC, interviews, surveys, diagrams, community posts.';")
w("END $SEED$;")

print("\n".join(lines))
