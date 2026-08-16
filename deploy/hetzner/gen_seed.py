#!/usr/bin/env python3
"""
Generates MVP Club demo seed SQL:
  - 100 fictional founders (email notifications OFF so cron jobs never mail them)
  - 100 ideas: idea 30 / hone 25 / validate 25 / shape 12 / done 8
  - cumulative stage_entries (a 'shape' idea has idea+hone+validate+shape answers)
  - validation contacts + interviews with AI alignment classification
  - community posts, comments, reactions, challenges, polls
Deterministic: fixed RNG seed, so re-running produces identical SQL.
"""
import random, uuid, json

random.seed(20260815)

def q(s):
    if s is None: return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"

def arr(items):
    if not items: return "'{}'"
    return "ARRAY[" + ",".join(q(i) for i in items) + "]::text[]"

def jsonb(o):
    return q(json.dumps(o, ensure_ascii=False)) + "::jsonb"

PW = '$2a$12$undmfpnOGUw4AGMvv3NWguUGIfWaODarqgnG/oMU5nK4bGyzcw.di'  # password123

FIRST = ["Amara","Priya","Tom","Ines","Wei","Lucas","Fatima","Owen","Sofia","Dmitri",
 "Nia","Rafael","Hana","Callum","Zara","Mateo","Aoife","Kenji","Leila","Bram",
 "Chidi","Marta","Sven","Anaya","Theo","Yara","Pablo","Ingrid","Rohan","Cleo",
 "Idris","Noor","Felix","Amaia","Tariq","Elin","Gabriel","Meera","Janek","Nadia",
 "Oscar","Rania","Milo","Saoirse","Kwame","Lena","Diego","Anjali","Erik","Farida",
 "Jonas","Priyanka","Beatriz","Hugo","Mei","Adam","Zoë","Ravi","Clara","Nikolai",
 "Amina","Sean","Yuki","Marcus","Ivana","Emeka","Greta","Paulo","Sana","Viktor",
 "Rosa","Dylan","Aisha","Henrik","Camila","Omar","Elsa","Kabir","Juliette","Andre",
 "Thandi","Niall","Anouk","Pedro","Lior","Maya","Tobias","Reem","Ciara","Santiago",
 "Freya","Arjun","Isabel","Kofi","Lucia","Dae","Rosalind","Emil","Nour","Petra"]

LAST = ["Okonkwo","Raman","Whitfield","Delacroix","Zhang","Moreau","El-Amin","Brennan","Castellanos","Volkov",
 "Adeyemi","Silva","Nakamura","Ferguson","Haddad","Rossi","Gallagher","Ito","Mansour","Visser",
 "Eze","Kowalski","Lindqvist","Nair","Papadakis","Khoury","Herrera","Bergman","Kapoor","Marchetti",
 "Bello","Rahman","Braun","Etxeberria","Aziz","Sorensen","Mendes","Iyer","Nowak","Petrova",
 "Lindgren","Chaoui","Fiorentino","Byrne","Mensah","Vogel","Navarro","Deshpande","Halvorsen","Bouzid",
 "Weber","Chatterjee","Almeida","Bernard","Lin","Novak","Aaltonen","Menon","Duarte","Sokolov",
 "Diallo","O'Connell","Tanaka","Lindholm","Horvat","Nwosu","Bauer","Carvalho","Qureshi","Marek",
 "Ferreira","Pritchard","Balogun","Nilsson","Rojas","Tahir","Lundqvist","Sethi","Laurent","Barros",
 "Mokoena","Doherty","De Vries","Nogueira","Ben-David","Sundaram","Reinhardt","Farouk","Doyle","Vargas",
 "Ostergaard","Malhotra","Fuentes","Asante","Reyes","Park","Ashby","Lindberg","Sabbagh","Kovac"]

# (name, domain, persona, problem, pain, alternative, metric)
IDEAS = [
 ("ShiftMend","hr-tech","independent care home managers","last-minute shift gaps get filled by ringing round staff one by one","a missed shift means agency cover at triple cost","a WhatsApp group and a paper rota","hours spent filling a gap"),
 ("Rootstock","agritech","small vineyard owners","spray and harvest records live in notebooks that fail audits","a failed audit blocks the season's sale","paper logbooks and a spreadsheet","time to produce an audit pack"),
 ("Ledgerly","fintech","bookkeepers at 5-15 person firms","month-end reconciliation means re-keying bank lines by hand","two days a month lost per client","Excel and manual bank exports","hours per client per month"),
 ("Clinicake","healthtech","private physiotherapy clinics","patients no-show because reminders are manual","every no-show is an unbilled hour","texting from a personal phone","weekly no-show rate"),
 ("Sublet","proptech","student accommodation officers","room swaps mid-term are handled over email threads","disputes and double-bookings each term","email and a shared spreadsheet","days to resolve a swap"),
 ("Testfoot","devtools","QA leads at 20-50 person startups","flaky tests get muted instead of fixed","releases ship with silent gaps","a Slack channel and good intentions","muted tests per release"),
 ("Chalkline","edtech","heads of department in secondary schools","cover lessons are allocated at 8am with no visibility","teachers get cover with no materials","a whiteboard in the staff room","minutes spent allocating cover"),
 ("Wattnote","cleantech","facilities managers on multi-site estates","energy anomalies surface a month late on invoices","thousands wasted before anyone notices","monthly invoice review","days to notice an anomaly"),
 ("Casefold","legaltech","paralegals in small conveyancing firms","chasing missing documents happens over email","completions slip by days","email and a checklist","days to complete a file"),
 ("Prepline","foodtech","head chefs in independent restaurants","prep lists are rewritten from scratch each morning","over-prep becomes waste, under-prep becomes 86s","a notepad by the pass","food waste per week"),
 ("Routewise","logistics","dispatchers at regional couriers","route changes mid-shift are phoned through","drivers double back, fuel wasted","phone calls and paper manifests","miles driven per drop"),
 ("Bylinr","media","freelance journalists","invoicing and rights tracking span twelve publications","payments chased months late","a spreadsheet per publication","days to payment"),
 ("Stockmate","b2b-saas","ops leads at DTC brands","stock levels drift between warehouse and storefront","overselling means refunds and bad reviews","nightly CSV exports","oversell incidents per month"),
 ("Nurserly","consumer","nursery managers","daily reports to parents are written by hand at pickup","staff stay late every day","paper slips","minutes per child per day"),
 ("Bidbase","marketplace","subcontractors bidding on small builds","tender documents arrive as scanned PDFs","hours re-typing quantities","printing and a calculator","hours per tender"),
 ("Doseform","healthtech","community pharmacists","dosette box prep is checked twice on paper","errors caught late, or not at all","a paper checking sheet","checks per hour"),
 ("Fieldnote","agritech","agronomy consultants","field visit notes are typed up in the evening","recommendations reach farmers a week late","a notebook and evening admin","days from visit to report"),
 ("Payrun","fintech","payroll bureaus","client payroll changes arrive by email in twelve formats","re-keying errors hit real wages","email and a shared inbox","corrections per pay run"),
 ("Trialpath","healthtech","clinical trial coordinators","participant scheduling collides with clinic capacity","visits missed, protocol deviations logged","a wall planner","deviations per study"),
 ("Reposit","proptech","letting agents","deposit disputes need photo evidence nobody organised","agents lose disputes by default","a phone camera roll","disputes lost per quarter"),
 ("Buildlog","devtools","platform engineers","CI failures get triaged by whoever notices first","the same failure is debugged three times","a Slack thread","repeat triage per week"),
 ("Tutorloop","edtech","private tutoring agencies","matching tutors to students is done from memory","poor matches churn in three sessions","a spreadsheet of availability","sessions before churn"),
 ("Gridnote","cleantech","community energy co-ops","member billing depends on half-hourly data nobody can read","billing errors erode trust","a CSV and a volunteer","billing queries per cycle"),
 ("Clausemap","legaltech","in-house counsel at scale-ups","contract obligations live in signed PDFs","renewal deadlines missed","a calendar reminder, sometimes","missed renewals per year"),
 ("Menushift","foodtech","multi-site cafe operators","allergen data changes faster than printed menus","a wrong menu is a legal risk","reprinting menus","days to update all sites"),
 ("Palletiq","logistics","warehouse supervisors","pallet locations are remembered, not recorded","pickers hunt for stock","shouting across the aisle","minutes per pick"),
 ("Subcast","media","independent podcasters","sponsor reporting is assembled by hand each month","sponsors churn without proof","screenshots in a doc","hours per sponsor report"),
 ("Onboardly","hr-tech","people ops at 50-200 person companies","new starter setup spans eight tools","day one is a mess","a checklist in Notion","tasks missed per starter"),
 ("Quotefast","b2b-saas","field sales engineers","quotes need pricing sign-off before sending","deals stall for days","email to a manager","hours to send a quote"),
 ("Splitkeep","consumer","housemates in shared rentals","shared bills are settled from memory","resentment and unpaid balances","a group chat","weeks to settle"),
 ("Craftlist","marketplace","independent makers at craft fairs","stall inventory and takings tracked separately","no idea what actually sells","a cash tin and a notebook","hours of post-fair admin"),
 ("Vitalsend","healthtech","district nurses","home visit observations are written twice","double entry every visit","paper forms then a laptop","minutes per visit"),
 ("Soilsense","agritech","regenerative farming advisors","soil test results arrive as PDFs per field","trends across seasons invisible","a folder of PDFs","hours to compare seasons"),
 (" Reconcile","fintech","finance leads at charities","restricted fund reporting is rebuilt each quarter","trustees get numbers late","a heavily formatted spreadsheet","days per quarterly report"),
 ("Cohortly","edtech","bootcamp operations managers","learner progress lives across four platforms","at-risk learners spotted too late","a weekly manual export","days to spot a drop-off"),
 ("Emberwatch","cleantech","biomass boiler installers","service visits are scheduled from memory","warranty claims rejected","a diary","claims rejected per year"),
 ("Deposition","legaltech","litigation support teams","transcripts are searched by scrolling","key passages missed","Ctrl+F in a PDF","hours per bundle"),
 ("Brewmetrics","foodtech","craft brewery production leads","batch consistency tracked on clipboards","a bad batch found at packaging","a clipboard by the tanks","batches rejected per quarter"),
 ("Loadmatch","logistics","freight brokers","backhaul capacity is matched over the phone","empty miles on every return","phone and a whiteboard","empty miles per week"),
 ("Presskit","media","music PRs","coverage tracking is manual Googling","reporting to artists is guesswork","Google alerts and a doc","hours per coverage report"),
 ("Rotafair","hr-tech","hospitality shift managers","rota fairness complaints have no data behind them","best staff leave first","a spreadsheet rota","staff turnover per quarter"),
 ("Pipeclean","devtools","data engineers","broken pipelines are noticed by dashboard users","stakeholders lose trust in data","a monitoring alert nobody reads","hours to detect a break"),
 ("Tenantvoice","proptech","housing association repairs teams","repair reports arrive by phone with no photos","wrong trade sent, second visit needed","a call centre script","second visits per month"),
 ("Sitesafe","b2b-saas","construction site managers","toolbox talks are recorded on paper and lost","audits fail on missing records","a signed paper sheet","time to evidence compliance"),
 ("Kitset","consumer","hobbyist woodworkers","project cut lists are recalculated by hand","wasted timber on every project","a pencil and paper","offcut waste per project"),
 ("Slotwise","marketplace","independent driving instructors","lesson rescheduling is a phone tag loop","empty slots never refilled","texts and a diary","unfilled slots per week"),
 ("Medstock","healthtech","GP practice managers","vaccine fridge stock counted weekly on paper","expired stock discovered at use","a paper tally","expired doses per quarter"),
 ("Harvestly","agritech","pick-your-own farm owners","gate takings and field yields never reconcile","no idea which crop pays","a cash box","hours reconciling per week"),
 ("Grantpath","fintech","grant fundraisers at small charities","deadlines and eligibility tracked in a spreadsheet","applications missed entirely","a shared spreadsheet","grants missed per year"),
 ("Labshare","edtech","university lab technicians","equipment booking clashes across modules","practicals cancelled","an email to the technician","cancellations per term"),
 ("Retrofix","cleantech","retrofit assessors","survey photos and measurements arrive unsorted","reports take a full day each","a phone and a clipboard","hours per survey report"),
 ("Willwise","legaltech","private client solicitors","will instructions are captured in free text","drafting errors on execution","dictation and typing","drafting revisions per will"),
 ("Servedeck","foodtech","catering event managers","dietary requirements arrive across three channels","a missed allergy is catastrophic","email, phone and a form","errors per event"),
 ("Coldchain","logistics","pharma courier coordinators","temperature excursions are found on delivery","whole shipments written off","a data logger read at the end","shipments lost per quarter"),
 ("Newsloop","media","local newspaper editors","reader tip-offs arrive across five inboxes","stories missed by days","five separate inboxes","hours to triage tips"),
 ("Refercircle","hr-tech","technical recruiters","referral pipelines die in DMs","best candidates never followed up","LinkedIn messages","referrals lost per month"),
 ("Envspec","devtools","backend engineers at small teams","environment variables drift between staging and prod","deploys break for config reasons","a shared .env in 1Password","config-related incidents"),
 ("Snagfix","proptech","new build site handover teams","snagging lists are photographed and emailed","the same snag reported four times","photos in an email","duplicate snags per handover"),
 ("Fleetpulse","b2b-saas","small fleet operators","MOT and service dates tracked in a diary","vehicles off road unexpectedly","a wall calendar","unplanned VOR days"),
 ("Plotmate","consumer","allotment holders","crop rotation planning is done from memory","disease builds up in beds","a sketch on paper","yield loss per season"),
 ("Gearloop","marketplace","camera equipment renters","kit condition disputes have no baseline","deposits withheld unfairly","photos, sometimes","disputes per month"),
 ("Careplan","healthtech","care coordinators","care plans are reviewed on a paper cycle","reviews overdue without anyone knowing","a paper diary","overdue reviews per month"),
 ("Yieldmap","agritech","arable farm managers","yield maps sit in the combine's proprietary software","decisions made on last year's memory","the dealer's software","days to act on yield data"),
 ("Invoicechase","fintech","freelance designers","chasing late invoices is emotionally exhausting","cashflow gaps every quarter","polite emails, eventually","days sales outstanding"),
 ("Skillstack","edtech","apprenticeship training providers","off-the-job hours are evidenced retrospectively","funding clawed back at audit","a paper timesheet","hours evidenced correctly"),
 ("Heatmapp","cleantech","heat pump installers","sizing surveys are redone because data was lost","wrong sizing means a callback","a paper survey form","callbacks per install"),
 ("Complyline","legaltech","compliance officers at IFAs","file reviews are sampled by hand","breaches found at inspection","a sampling spreadsheet","breaches found late"),
 ("Batchbake","foodtech","artisan bakeries","production quantities guessed from last week","stale stock or sold-out shelves","a mental note","waste as percent of bake"),
 ("Dockflow","logistics","port haulage planners","container collection slots booked by phone","trucks queue for hours","phone and a booking portal","hours queueing per truck"),
 ("Clipfile","media","documentary researchers","archive footage rights are tracked in email","clearance blocks the edit","an email folder","days to clear a clip"),
 ("Exitwell","hr-tech","HR business partners","exit interview themes are never aggregated","the same causes repeat","a Word template","time to spot a pattern"),
 ("Schemaguard","devtools","full-stack developers","database migrations break staging silently","a rollback under pressure","hope and a code review","failed migrations per month"),
 ("Voidcheck","proptech","student housing operators","void period turnaround is uncoordinated","rooms empty into term time","a spreadsheet per block","void days per room"),
 ("Auditrail","b2b-saas","ISO coordinators","evidence for audits is gathered in a panic","weeks of preparation each year","a shared drive","weeks per audit cycle"),
 ("Tidepool","consumer","open water swimmers","tide and water quality data live on four sites","swims planned on bad data","four browser tabs","minutes planning a swim"),
 ("Studiobook","marketplace","independent music studios","booking deposits are chased manually","no-shows cost a full session","a booking form and bank transfers","no-shows per month"),
 ("Referpath","healthtech","physiotherapy triage teams","referral letters are read and sorted by hand","urgent cases sit in a queue","a paper in-tray","days to triage urgent cases"),
 ("Flockwise","agritech","sheep farmers","medicine records required for assurance are on scraps","assurance visits fail","a notebook in the barn","time to produce records"),
 ("Splitfee","fintech","mortgage brokers","commission splits are calculated per case in Excel","disputes with introducers","a spreadsheet per case","hours per month reconciling"),
 ("Coursecraft","edtech","independent course creators","learner questions repeat across cohorts","the same answer written weekly","a growing FAQ doc","hours answering repeats"),
 ("Solarcheck","cleantech","solar O&M technicians","underperforming strings found on annual visits","a year of lost generation","an annual inspection","days to detect underperformance"),
 ("Bundleup","legaltech","barristers' clerks","court bundles are paginated manually","late-night bundle panic","Adobe and patience","hours per bundle"),
 ("Sourcemap","foodtech","specialty coffee roasters","lot traceability is reconstructed for buyers","a traceability claim can't be evidenced","invoices and memory","hours to evidence a lot"),
 ("Yardsync","logistics","cold store yard managers","trailer positions tracked on a whiteboard","loads delayed hunting trailers","a whiteboard","minutes locating a trailer"),
 ("Cutlist","media","video editors at agencies","client feedback arrives as timecoded emails","revisions missed, rounds repeated","email and a spreadsheet","revision rounds per project"),
 ("Shiftswap","hr-tech","NHS bank staff coordinators","shift swaps need three approvals by phone","shifts go unfilled","phone calls","unfilled bank shifts"),
 ("Portmatch","devtools","DevOps consultants","client infrastructure varies wildly per engagement","weeks lost mapping estates","reading Terraform manually","days to map an estate"),
 ("Rentroll","proptech","small portfolio landlords","rent arrears noticed late","arrears compound before action","a bank statement glance","days to notice arrears"),
 ("Assetloop","b2b-saas","IT asset managers","laptop returns from leavers go untracked","hardware written off unnecessarily","a spreadsheet and hope","devices unreturned per year"),
 ("Fixitup","consumer","first-time homeowners","small repairs are deferred because scope is unclear","small problems become big ones","YouTube and procrastination","jobs deferred per year"),
 ("Sparelot","marketplace","event parking operators","spare capacity sold on the day at the gate","revenue left on the table","cash and a cone","unsold spaces per event"),
 ("Wardwatch","healthtech","ward managers","staffing acuity recorded but never used","unsafe shifts repeat","a paper acuity tool","unsafe shifts per month"),
 ("Grainsight","agritech","grain store managers","moisture readings logged on paper","spoilage found at outload","a moisture meter and a pad","tonnes spoiled per season"),
 ("Fundflow","fintech","startup finance leads","runway modelling rebuilt after every hire","board asks, answer takes days","a spreadsheet model","hours per runway update"),
 ("Practicepal","edtech","peripatetic music teachers","practice tracking relies on parents","progress stalls unnoticed","a practice diary","weeks to spot stalled practice"),
 ("Windcheck","cleantech","small wind site operators","curtailment events reconciled months later","payments under-claimed","an annual statement","months to reconcile"),
 ("Noticeboard","legaltech","property litigation teams","statutory notice deadlines tracked manually","a missed notice loses the case","a diary and a checklist","notices missed per year"),
 ("Fermentr","foodtech","kombucha producers","batch pH and temperature logged by hand","inconsistent product reaches shelves","a clipboard","batch variance"),
 ("Lastmile","logistics","grocery delivery planners","delivery slot promises break at peak","refunds and lost customers","a static slot plan","late deliveries at peak"),
 ("Storyqueue","media","content marketing managers","content ideas scattered across tools","the pipeline dries up unpredictably","Slack, Notion and memory","weeks with no content ready"),
]
assert len(IDEAS) == 100, len(IDEAS)

STAGES = ['idea']*30 + ['hone']*25 + ['validate']*25 + ['shape']*12 + ['done']*8
assert len(STAGES) == 100

FREQ = ['Daily','Several times a week','Weekly','Monthly']
TIMEC = ['Evenings and weekends','Part-time (2-3 days)','Full-time','A few hours a week']

out = []
W = out.append

W("-- ============================================================")
W("-- MVP Club — demo seed: 100 fictional founders and ideas")
W("-- idea 30 / hone 25 / validate 25 / shape 12 / done 8")
W("-- All accounts use password: password123")
W("-- Emails are @example.com (RFC-reserved, undeliverable) and every")
W("-- seeded user has email_notifications = FALSE, so the weekly digest")
W("-- and re-engagement cron jobs will never mail them.")
W("-- Generated by deploy/hetzner/gen_seed.py — do not hand-edit.")
W("-- ============================================================")
W("")
W("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_seed_beta BOOLEAN NOT NULL DEFAULT FALSE;")
W("")
W("BEGIN;")
W("")

users, ideas_rows = [], []
for i, (idea, stage) in enumerate(zip(IDEAS, STAGES)):
    name_, domain, persona, problem, pain, alt, metric = idea
    name_ = name_.strip()
    fn, ln = FIRST[i], LAST[i]
    uid, iid = str(uuid.uuid4()), str(uuid.uuid4())
    email = f"{fn.lower()}.{ln.lower().replace(chr(39),'').replace(' ','')}@example.com"
    initials = (fn[0] + ln[0]).upper()
    users.append((uid, email, f"{fn} {ln}", stage, initials))
    ideas_rows.append((iid, uid, name_, stage, domain, persona, problem, pain, alt, metric, fn, ln))

W("-- ---------- founders ----------")
for uid, email, full, stage, initials in users:
    days = random.randint(5, 240)
    W(f"INSERT INTO users (id,email,name,password_hash,current_stage,community_opt,help_types,"
      f"avatar_initials,email_notifications,is_seed_beta,created_at,updated_at) VALUES "
      f"({q(uid)},{q(email)},{q(full)},{q(PW)},{q(stage)},TRUE,"
      f"{arr(random.sample(['feedback','intros','testing','mentoring'], k=random.randint(1,3)))},"
      f"{q(initials)},FALSE,TRUE,NOW()-INTERVAL '{days} days',NOW()-INTERVAL '{random.randint(0,4)} days');")
W("")

W("-- ---------- ideas ----------")
for iid, uid, name_, stage, domain, persona, problem, pain, alt, metric, fn, ln in ideas_rows:
    desc = f"Helping {persona} where {problem}."
    days = random.randint(3, 200)
    status = 'done' if stage == 'done' else 'active'
    W(f"INSERT INTO ideas (id,user_id,name,description,is_active,stage,business_domain,idea_status,"
      f"created_at,updated_at) VALUES ({q(iid)},{q(uid)},{q(name_)},{q(desc)},TRUE,{q(stage)},"
      f"{q(domain)},{q(status)},NOW()-INTERVAL '{days} days',NOW()-INTERVAL '{random.randint(0,3)} days');")
W("")

ORDER = ['idea', 'hone', 'validate', 'shape', 'done']

def entries_for(row):
    """Cumulative field values appropriate to the idea's stage."""
    iid, uid, name_, stage, domain, persona, problem, pain, alt, metric, fn, ln = row
    upto = ORDER.index(stage)
    e = {}
    e['idea'] = {
        'ideaName': name_,
        'oneLiner': f"{name_} helps {persona} stop losing time to {problem}.",
        'spark': f"I spent three years working alongside {persona}. Watching {alt} fail the same way every week is what pushed me to build this.",
    }
    if upto >= 1:
        score = random.randint(6, 9)
        e['hone'] = {
            'whoExactly': persona,
            'whoPays': f"The owner or operations lead — they already carry the cost of {problem}.",
            'problemSentence': f"For {persona}, {problem}.",
            'painIfNothing': pain,
            'frequency': random.choice(FREQ),
            'solutionAlternatives': f"Today most of them rely on {alt}.",
            'founderTime': random.choice(TIMEC),
            'founderSkills': f"Domain experience with {persona}, plus enough technical skill to build a first version.",
            'founderCofounder': random.choice(['Solo for now','Looking for a technical co-founder','Two of us']),
            'founderFit': f"I have direct access to {persona} through previous work, so I can get to conversations quickly.",
            'founderStatement': f"I am building {name_} because {persona} deserve better than {alt}.",
            'honeScore': str(score),
        }
    if upto >= 2:
        convos = random.choice(['8','10','12','15'])
        e['validate'] = {
            'valGoalSuccess': f"At least {random.choice(['6','7','8'])} of {convos} describe {problem} unprompted.",
            'valGoalConvos': convos,
            'valGoalRate': random.choice(['60','65','70','75']),
            'valGoalSignal': f"They tell me what {alt} costs them, in hours or money, without being asked.",
            'valGoalICP': persona,
            'valGoalTime': random.choice(['2 weeks','3 weeks','4 weeks']),
            'valGoalProve': f"That {problem} is painful enough to pay to remove.",
            'valGoalStop': f"If fewer than half raise {metric} as a real cost, I stop.",
            'assumptions': "\n".join([
                f"{persona} already track {metric} in some form",
                f"{alt} is the actual status quo, not something I imagined",
                f"Someone in the organisation has budget to fix {problem}",
            ]),
            'keyQuestion': f"Tell me about the last time {problem} — what did you actually do?",
            'customInterviewQuestions': "\n".join([
                f"Walk me through the last time {problem}.",
                f"What did that cost you, in {metric}?",
                f"What are you using instead of a proper tool today?",
                f"Who else in the business feels this?",
                "What would have to be true for you to change how you do this?",
            ]),
            'warmContacts': "Former colleagues, two industry WhatsApp groups, and a trade association contact.",
            'icpJobs': f"Keep operations running without {problem} derailing the week",
            'icpFrustrations': f"{alt} breaks down exactly when things get busy",
            'icpAlternatives': alt,
            'interviewTarget': persona,
            'demandSignals': f"Three asked to be told when it launches. Two asked about pricing unprompted.",
        }
    if upto >= 3:
        e['validate'].update({
            'validatedProblem': f"Confirmed: {problem} is real and quantified in {metric}.",
            'validationSignal': 'strong',
            'insights': "\n".join([
                f"{metric} is the number they already report on",
                f"{alt} is trusted precisely because it is theirs, so replacing it needs a migration story",
                "Buying decisions sit with operations, not IT",
            ]),
        })
        e['shape'] = {
            'validationLearnings': f"They confirmed {problem}|They quantified it in {metric}|They would switch from {alt}",
            'validationSurprise': f"I expected price to be the blocker. It was trust in the data coming out of {alt}.",
            'primaryUser': persona,
            'productType': random.choice(['Web app','Mobile-first web app','Web app with mobile capture']),
            'simplestVersion': f"A single screen that replaces {alt} for one week, then shows {metric} back to them.",
            'feature1': f"Capture what {alt} captures today, in under a minute",
            'feature2': f"Show {metric} on one screen",
            'feature3': "Export a record their auditor or manager will accept",
            'outOfScope': "Integrations, multi-site rollups, and anything resembling a permissions model.",
            'mvpAction': f"Replace {alt} for one team for two weeks.",
            'mvpOutcome': f"They stop opening {alt} without being told to.",
            'revenueModel': random.choice(['Monthly subscription per site','Per seat, monthly','Flat monthly fee']),
            'shapePayer': "The operations lead who owns the budget line.",
            'pricePoint': random.choice(['£29/month','£49/month','£99/month','£149/month']),
            'topCost': "Hosting and my own time.",
            'distributionPlan': "Trade association newsletter, two industry WhatsApp groups, and direct outreach to warm contacts.",
            'buildApproach': random.choice(['Build it myself','No-code first, rebuild later','Contract a developer for the first version']),
        }
    if upto >= 4:
        e['done'] = {
            'whatBuilt': f"A working {name_} that replaces {alt} for one team and reports {metric} weekly.",
            'buildTool': random.choice(['React + Node','Next.js','Rails','No-code, then rebuilt']),
            'mvpLaunched': 'true',
            'mvpSuccessCriteria': f"Three teams using it weekly without being reminded.",
            'firstUsers': f"Four {persona} from validation interviews.",
            'mvpFirstTask': f"Log this week's {metric} without opening {alt}.",
            'technicalConfidence': random.choice(['Medium','High']),
            'unexpectedAdditions': "An export button. Everyone asked for it in week one.",
            'shipChangeNotes': f"Cut the dashboard entirely. They only wanted {metric} and an export.",
        }
    return e

W("-- ---------- stage answers ----------")
n_entries = 0
for row in ideas_rows:
    iid, uid = row[0], row[1]
    for st, fields in entries_for(row).items():
        for k, v in fields.items():
            W(f"INSERT INTO stage_entries (user_id,idea_id,stage,field_key,content,completed_at) VALUES "
              f"({q(uid)},{q(iid)},{q(st)},{q(k)},{q(v)},NOW()-INTERVAL '{random.randint(1,60)} days') "
              f"ON CONFLICT (idea_id,stage,field_key) DO UPDATE SET content=EXCLUDED.content;")
            n_entries += 1
W("")

# ---------- validation contacts + interviews ----------
ROLES = ["Operations Manager","Owner","Team Lead","Director","Coordinator","Supervisor","Head of Service","Partner"]
CFIRST = ["Sam","Jo","Alex","Chris","Robin","Morgan","Riley","Casey","Jamie","Drew","Kai","Sky","Ash","Frankie","Charlie"]
CLAST  = ["Hughes","Patel","Okafor","Novak","Ferrari","Sandberg","Duval","Marsh","Quinn","Bright","Holt","Reyes","Baptiste","Lund","Whitmore"]

n_contacts = n_interviews = 0
W("-- ---------- validation contacts & interviews ----------")
for row in ideas_rows:
    iid, uid, name_, stage, domain, persona, problem, pain, alt, metric = row[:10]
    if ORDER.index(stage) < 2:
        continue
    n_c = random.randint(4, 8)
    for c in range(n_c):
        cname = f"{random.choice(CFIRST)} {random.choice(CLAST)}"
        cid = str(uuid.uuid4())
        st = random.choice(['Not sent','Sent','Replied','Call booked','Done'])
        W(f"INSERT INTO validation_contacts (id,user_id,idea_id,source,name,contact,status,icp_fit,email,notes,created_at) VALUES "
          f"({q(cid)},{q(uid)},{q(iid)},{q(random.choice(['community','linkedin','email']))},{q(cname)},"
          f"{q(random.choice(ROLES))},{q(st)},{q(random.choice(['yes','unsure']))},"
          f"{q(cname.lower().replace(' ','.')+'@example.com')},"
          f"{q(f'Met through the {domain} network.')},NOW()-INTERVAL '{random.randint(2,70)} days');")
        n_contacts += 1
        if st in ('Call booked', 'Done'):
            ai = random.choice([1,2,2,3,3,3])
            own = ai if random.random() < 0.75 else max(1, min(3, ai + random.choice([-1,1])))
            ev = [
                {"quote": f"Last month {problem}. It cost us most of a day.",
                 "signal": "positive" if ai >= 2 else "negative"},
                {"quote": f"We still use {alt}. Nobody loves it.",
                 "signal": "positive" if ai == 3 else "neutral"},
            ]
            W(f"INSERT INTO interviews (idea_id,user_id,interviewee_name,interviewee_role,interviewee_email,"
              f"scheduled_at,status,notes,key_insights,alignment_score,ai_alignment_score,ai_reasoning,ai_evidence,"
              f"confirmed_problem,booking_status,meeting_provider,duration_mins,validation_contact_id,created_at) VALUES "
              f"({q(iid)},{q(uid)},{q(cname)},{q(random.choice(ROLES))},{q(cname.lower().replace(' ','.')+'@example.com')},"
              f"NOW()-INTERVAL '{random.randint(1,45)} days',{q('completed')},"
              f"{q(f'Described {problem} in detail without prompting. Quantified it in {metric}.')},"
              f"{q(f'{metric} is the number they already track. {alt} is trusted because it is theirs.')},"
              f"{own},{ai},{q('Interviewee described the problem from lived experience and quantified the cost.' if ai>=2 else 'Interviewee described a related but different problem; evidence was hypothetical.')},"
              f"{jsonb(ev)},{str(ai>=2).upper()},{q('booked')},{q(random.choice(['zoom','manual']))},"
              f"{random.choice([20,30,30,45])},{q(cid)},NOW()-INTERVAL '{random.randint(1,45)} days');")
            n_interviews += 1
W("")

# ---------- community ----------
POSTS = {
 'win': ["Just finished conversation number {n} — {persona} confirmed {problem} without me prompting.",
         "Shipped the first working version of {name} today. Four users on it by tonight.",
         "First paying customer for {name}. £{price} a month. It felt unreal."],
 'question': ["How many interviews did you do before you trusted the signal? I'm at {n} and still unsure.",
              "Anyone else building for {persona}? Struggling to get past the gatekeeper.",
              "Do you show pricing during validation calls, or does it poison the conversation?"],
 'validation_request': ["Looking for {persona} to talk to about {problem} — 20 minutes, no pitch.",
                        "Need 3 more conversations to hit my target for {name}. Any intros appreciated."],
 'update': ["Week {n} on {name}: cut two features, kept one. The export button is what they actually use.",
            "Pivoted the framing for {name} — same users, different problem. Feels much sharper.",
            "Moved {name} into Shape. Validation took longer than I planned, worth it."],
}
COMMENTS = ["This mirrors exactly what I found. The status quo is trusted because it's theirs.",
 "Ten was where it clicked for me. The first five all told me what I wanted to hear.",
 "Ask what it cost them last time, not whether they'd pay. Completely different answers.",
 "Happy to introduce you to two people in this space — DM me.",
 "The export button thing is universal. Everyone rebuilds it eventually.",
 "Strong signal. I'd push on who owns the budget before building.",
 "We hit the same wall. Going through the trade association worked far better than cold outreach."]

W("-- ---------- community activity ----------")
n_posts = n_comments = n_reactions = 0
post_ids = []
for row in random.sample(ideas_rows, 62):
    iid, uid, name_, stage, domain, persona, problem, pain, alt, metric = row[:10]
    ptype = random.choice(['win','question','validation_request','update'])
    tmpl = random.choice(POSTS[ptype])
    content = tmpl.format(n=random.randint(3,15), persona=persona, problem=problem,
                          name=name_, price=random.choice([29,49,99,149]))
    pid = str(uuid.uuid4()); post_ids.append((pid, uid))
    W(f"INSERT INTO community_posts (id,user_id,idea_id,stage,content,post_type,moderation_status,created_at) VALUES "
      f"({q(pid)},{q(uid)},{q(iid)},{q(stage)},{q(content)},{q(ptype)},{q('visible')},"
      f"NOW()-INTERVAL '{random.randint(1,50)} days');")
    n_posts += 1

all_uids = [u[0] for u in users]
for pid, author in post_ids:
    for _ in range(random.randint(0, 3)):
        cu = random.choice([u for u in all_uids if u != author])
        W(f"INSERT INTO comments (post_id,user_id,content,created_at) VALUES "
          f"({q(pid)},{q(cu)},{q(random.choice(COMMENTS))},NOW()-INTERVAL '{random.randint(1,40)} days');")
        n_comments += 1
    reactors = random.sample([u for u in all_uids if u != author], random.randint(1, 9))
    for ru in reactors:
        W(f"INSERT INTO reactions (post_id,user_id,type,created_at) VALUES "
          f"({q(pid)},{q(ru)},{q(random.choice(['encourage','encourage','encourage','ask']))},"
          f"NOW()-INTERVAL '{random.randint(1,40)} days') ON CONFLICT DO NOTHING;")
        n_reactions += 1
W("")

W("-- ---------- challenges ----------")
n_ch = 0
for row in random.sample([r for r in ideas_rows if ORDER.index(r[3]) >= 2], 14):
    iid, uid, name_, stage, domain, persona, problem = row[0], row[1], row[2], row[3], row[4], row[5], row[6]
    goal = random.choice([5, 8, 10])
    done_n = random.randint(0, goal)
    st = 'completed' if done_n >= goal else 'active'
    verdict = random.choice(['validated','uncertain','pivoted']) if st == 'completed' else None
    chid = str(uuid.uuid4())
    W(f"INSERT INTO challenges (id,idea_id,user_id,idea_name,target_profile,target_domain,status,"
      f"conversations_goal,deadline,verdict_signal,created_at) VALUES ({q(chid)},{q(iid)},{q(uid)},{q(name_)},"
      f"{q(persona)},{q(domain)},{q(st)},{goal},NOW()+INTERVAL '{random.randint(2,21)} days',"
      f"{q(verdict) if verdict else 'NULL'},NOW()-INTERVAL '{random.randint(3,30)} days');")
    for c in range(done_n):
        W(f"INSERT INTO challenge_conversations (challenge_id,user_id,interviewee_role,quote_1,signal,created_at) VALUES "
          f"({q(chid)},{q(uid)},{q(random.choice(ROLES))},"
          f"{q(f'They described {problem} straight away.')},"
          f"{q(random.choice(['validates','validates','challenges','neutral']))},"
          f"NOW()-INTERVAL '{random.randint(1,20)} days');")
    n_ch += 1
W("")

W("-- ---------- community polls ----------")
POLLS = [
 ("How many customer interviews before you trusted your signal?", ["Under 5","5-10","10-20","More than 20"]),
 ("What killed your last idea?", ["No real problem","Couldn't reach users","Lost motivation","Ran out of money"]),
 ("Where do your first users come from?", ["My own network","Cold outreach","Communities","Content"]),
 ("Do you show pricing during validation calls?", ["Always","Only if asked","Never","Depends on the user"]),
]
for qn, opts in POLLS:
    pu = random.choice(all_uids)
    W(f"INSERT INTO community_polls (user_id,question,options,created_at,closes_at) VALUES "
      f"({q(pu)},{q(qn)},{arr(opts)},NOW()-INTERVAL '{random.randint(2,20)} days',"
      f"NOW()+INTERVAL '{random.randint(3,14)} days');")
W("")

W("COMMIT;")
W("")
W("-- ---------- summary ----------")
W("SELECT 'users' t, count(*) FROM users WHERE is_seed_beta")
W("UNION ALL SELECT 'ideas', count(*) FROM ideas")
W("UNION ALL SELECT 'stage_entries', count(*) FROM stage_entries")
W("UNION ALL SELECT 'validation_contacts', count(*) FROM validation_contacts")
W("UNION ALL SELECT 'interviews', count(*) FROM interviews")
W("UNION ALL SELECT 'community_posts', count(*) FROM community_posts")
W("UNION ALL SELECT 'comments', count(*) FROM comments")
W("UNION ALL SELECT 'reactions', count(*) FROM reactions")
W("UNION ALL SELECT 'challenges', count(*) FROM challenges")
W("UNION ALL SELECT 'community_polls', count(*) FROM community_polls;")

open('/home/claude/seedwork/seed-demo-100.sql', 'w').write("\n".join(out) + "\n")
print(f"generated: entries={n_entries} contacts={n_contacts} interviews={n_interviews} "
      f"posts={n_posts} comments={n_comments} reactions={n_reactions} challenges={n_ch}")
