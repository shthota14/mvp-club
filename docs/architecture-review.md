# Architecture Review — Grafter

*Grafter is the codename for the AI Sales Module epic.*

**Reviewing:** the `/docs` set for Grafter, the AI Sales Module epic (00-overview through 08-backlog, plus the vibe-coding kickoff prompts)
**Date:** 2026-09-25
**Status:** review only — no code or schema changes made

Codebase claims in this document were verified against the repo at review time:
`backend/src/db/schema.sql`, `backend/src/db/migrations/*`, `backend/src/routes/*`,
`backend/package.json`, `docker-compose.yml`, `docker-compose.prod.yml`,
`backend/src/middleware/auth.ts`. Where a claim comes from operational notes
rather than the repo, it says so.

---

## Summary in plain terms

**What the spec designs.** A system that finds companies who should buy a founder's product,
works out who to contact there, emails them, and books a meeting on the founder's calendar.
Seven AI agents, each in its own container, talking to each other through a message bus.

**The verdict in one sentence.** The thinking is sound, but the plan is roughly three times
bigger than it needs to be, and it skips two questions that decide whether the product can
work at all.

### The two skipped questions

**How does the email actually get sent?** Mail currently goes through Brevo, and Brevo's rules
forbid cold sales email. If they shut the account down, password-reset emails stop working too
— same account, same domain. The likely answer is to send from each founder's own Gmail or
Outlook instead, but that is a different system from the one in the spec, so it has to be
decided before anything is built.

**Where do the email addresses come from?** The spec says "public sources." Public sources do
not contain people's work email addresses. In reality you buy them from a company like Apollo —
which costs money, breaks the spec's own "public data only" rule, and legally obliges you to
send each person a privacy notice. None of that is in the plan.

### Three ways it is too big

1. **Thirteen containers where five run today.** One per agent is not necessary — they can be
   seven files inside one program.
2. **A gateway so the agents cannot touch the database directly.** It guards against a hacker,
   but you write the agents yourself, so it prevents nothing and adds a layer of work.
3. **New tables for things already built.** Contacts, conversations, and a complete
   meeting-booking system with availability and calendar invites all exist. The spec rebuilds
   all three, and two of its table names clash with live ones.

### The timeline

Eight weeks is more like six months at the pace this codebase was actually built. The order is
also backwards: the first email goes out in week 5, but the privacy and consent work is
scheduled for week 8.

### The single change worth making

Build the **list** first — companies, plus why each one fits — and show it to five founders with
no email sending at all.

That answers the only question that really matters, *is the AI any good at choosing companies?*,
in about five weeks, with no legal exposure and no email setup. If the list is bad, nothing
downstream matters. Everything else waits behind that answer.

The sections below are the detailed backup for each of these points, in order of consequence.

---

## Verdict

The instincts in this spec are good, and they are the instincts most people get wrong:

- **Provenance-first.** Every `research_fact` carries `source_type`, `source_url`, `observed_at`. Facts without provenance are rejected. This is the right constraint and it is load-bearing for both trust and compliance.
- **Deterministic workflow with LLMs inside it**, rather than an LLM deciding what happens next. Principle 3 is the single most valuable line in the document set.
- **An explicit event catalog** written before the code. Rare and genuinely useful.
- **Tenant column on every table**, with scoping enforced in one place.

What is wrong is **proportion** — the plan builds a platform where a feature is needed — and **one missing chapter** that happens to be the one the product lives or dies on.

The findings below are ranked by consequence, not by how much of the spec they touch.

---

## 1. There is no sending-infrastructure chapter, and it is the whole product

**Severity: blocking.**

The spec treats "the Outreach Agent sends a first-touch message" as a solved primitive. On the current stack it is not.

Verified current state: mail goes out via `nodemailer` from `backend/src/utils/mailer.ts`, through a generic SMTP transport. Per operational notes, production sends through Brevo on port 587 (Hetzner blocks outbound 25 and 465), on shared IPs, with the domain authenticated as `mvpclub.io` — the same sender identity used for password resets, meeting-request emails and calendar invites.

Three problems compound:

1. **Provider terms.** Brevo prohibits cold outreach to non-opted-in lists. So do Postmark, Resend and SendGrid on transactional plans. This is not a grey area; it is the stated basis on which those accounts are terminated.
2. **Blast radius.** A suspension takes password resets down with it, because they share the sender domain. A spam-complaint wave against outbound mail becomes an authentication outage for the whole app.
3. **Reputation coupling.** Even short of suspension, cold-outbound complaint rates degrade the domain reputation that transactional mail depends on.

Underneath all three is **the architectural decision the spec never makes: who is the sender?**

| Option | Consequences |
|---|---|
| **The founder's own mailbox** (Gmail / Microsoft OAuth with send scope) | Their reputation, their relationship, their legitimate interest, their LIA. Deliverable and defensible. Requires per-founder OAuth, per-mailbox rate limits, and per-mailbox send state. |
| **Platform infrastructure** | Per-founder sending subdomains, warmup schedules, volume caps, bounce and complaint thresholds, suppression lists. MVP Club owns the liability and the reputation risk. |

These are completely different systems, with different schemas and different UIs. Nothing in `06-infrastructure` or `07-compliance` picks one.

**Recommendation:** decide this before writing any outreach code, and add a `06-infrastructure/sending-and-deliverability.md`. The founder-mailbox option is almost certainly right for an MVP — it is cheaper, more deliverable, and puts the lawful basis where it naturally belongs.

Regardless of the choice: **outbound must send from a different domain or subdomain than `mvpclub.io` transactional mail.**

---

## 2. Contact discovery has no source, legal or practical

**Severity: blocking.**

`03-agents/buyer-research.md` outputs a `contact` row with an email address, sourced from the research gateway's "public sources". Work email addresses are not reliably available from public sources at any useful hit rate. In practice this is done with Apollo, Cognism, Clearbit or Hunter — which:

- directly contradicts `product-principles.md` principle 1, "Public data only in MVP. No customer CRM dependency";
- requires a DPA with the provider;
- triggers a **UK GDPR Article 14 notice**. You would be processing personal data not obtained from the data subject, which means you owe that person a privacy notice at first contact. `07-compliance/gdpr-uk.md` does not mention Article 14 at all.

LinkedIn scraping is not an alternative. It breaches their terms and they litigate.

The `contactability` score in `prospect` is a euphemism sitting on top of this hole — it quantifies the gap rather than filling it.

**Two further compliance gaps in the same file:**

- `gdpr-uk.md` cites "legitimate interest for B2B outreach (documented LIA)", which is broadly right for corporate subscribers. But **PECR treats sole traders and partnerships as individuals**, so they need excluding from that basis. Nothing in the prospecting filters does this.
- The spec never states whether **MVP Club is controller or processor**. That one question decides who is liable, whether a DPA with each founder is required, whose LIA it is, and who answers a subject access request. For a product that sends mail on other people's behalf it is a page-one question.

**Recommendation:** name the licensed data provider and its monthly cost, or accept that the prospecting engine produces companies with no reachable humans. Then answer the controller/processor question in writing before Stage 1 below.

---

## 3. Thirteen containers where there are five, and no Redis at all

**Severity: high — cost and velocity, not correctness.**

Verified current production topology (`docker-compose.prod.yml`): five services — `db`, `backend`, `ollama`, `frontend`, `caddy` — on a single Hetzner AX41 dedicated box, deployed by `git push` followed by `./03-deploy.sh` on the server. **There is no Redis anywhere in the repository.** Scheduling is in-process `node-cron` (four jobs registered in `backend/src/index.ts`).

`01-architecture/docker-topology.md` adds nine services plus Redis, and `06-infrastructure/observability.md` adds OpenTelemetry and Grafana. That is roughly 3× the operational surface for a pre-revenue module, on one box that already runs a local LLM, with no staging environment and a deploy script that health-gates exactly one backend.

One container per agent buys two things: independent deployment and independent scaling. Neither is needed yet. The agents are stateless functions whose dominant cost is LLM latency, not CPU — they do not contend for the same resource, so isolating them buys no headroom. The same code as seven modules inside one worker process gives identical *logical* isolation, and any one of them can be split out later when there is a measured reason (a different runtime, or a noisy-neighbour problem that actually happened).

**The research gateway is the exception.** A single controlled egress point with caching, rate limiting and robots.txt handling earns its boundary, because it is where the legal and reputational risk concentrates and because network isolation is a real property you cannot get from a module boundary.

---

## 4. The agent gateway defends against an attacker that does not exist

**Severity: high — it is pure cost.**

`03-agents/agent-contract.md` and `04-api/agent-gateway.md` specify that agents hold no database credentials and that every read and write is proxied through `POST /gateway/agent/{read,write}/:entity` with a scoped JWT.

The implied threat is a compromised or confused agent crossing tenant boundaries. But you write all seven agents, you build their images, and you run them on your own box on your own network. The gateway does not prevent a bug in your own prospecting code from writing the wrong `workspace_id` — it relocates that bug behind an HTTP hop. What it does buy you is a generic entity-write endpoint, which is an ORM over HTTP: slower to change, harder to type, and impossible to query across.

What actually prevents cross-tenant leakage is exactly what the spec already proposes elsewhere: a `scopedDb(workspaceId)` helper, `workspace_id NOT NULL` on every table, and tests that assert it.

**Recommendation:** keep `scopedDb`. Drop the agent gateway. Keep the research gateway.

---

## 5. The data model forks the application in two

**Severity: high.**

There is **no workspace concept anywhere in the codebase.** Verified: tenancy is `users` → `ideas`, and `backend/src/middleware/auth.ts` puts only `userId` on the request. A grep for `workspace` across `backend/src` and `frontend/src` returns nothing but prose in AI prompts and marketing copy.

The spec's `workspace` and `project` tables are therefore a **parallel tenancy layer over concepts that already exist**. `workspace.owner_id` is declared `UUID NOT NULL` with no `REFERENCES users(id)` — it is not even wired to the user table it shadows.

Worse, three of the spec's table names collide with live tables:

| Spec table | Already exists in the app | What the existing one does |
|---|---|---|
| `conversation` / `conversation_message` | `conversations` / `messages` | founder-to-founder direct messages (`add-social-features.sql`) |
| `contact` | `validation_contacts`, `network_contacts` | validation outreach tracker; community network |
| `meeting` | `interviews`, `availability_rules`, `availability_settings`, `availability_overrides` | the booking system already shipped |

The last row matters most. There is already a working scheduling feature: availability rules, override dates, meeting-request emails, a public booking page, and calendar invites via `ical-generator`. **The Meeting Agent should call that, not reimplement it.** Building `meeting` alongside `interviews` means two meeting models and two booking flows in one database.

**Migrations.** `02-data-model/migrations-strategy.md` proposes node-pg-migrate or Drizzle Kit. The repo has 14 hand-written SQL files under `backend/src/db/migrations/`, applied manually by the operator, and per operational notes "which migrations have actually run" is already a standing unresolved question. Introducing a second migration system into that situation will make it permanently unanswerable.

**Recommendation:** drop `workspace` and `project`; use `users` and `ideas`. Prefix every new table (`grafter_*`). Keep the existing migration convention. Reuse the booking system.

---

## 6. Nobody has done the arithmetic on the promise

**Severity: high — this is a product risk, not a code risk.**

`vision.md` promises "qualified meetings on the calendar" for a founder who has just left validation: no brand, no case studies, no reference customers. Cold outbound for that profile runs roughly 1–3% reply rate on a good list, with meeting rates well under 1%. One booked meeting therefore means several hundred contacted prospects.

That volume is precisely what triggers finding 1. It is also the volume at which "every claim must map to a `research_fact`" costs real money — research plus personalisation, per prospect, through an LLM.

The backlog has 15 epics and no cost model. The number that decides whether this is a business:

> **What does one booked meeting cost in LLM tokens plus data-provider credits, and is that below what a pre-revenue founder will pay?**

Related: the qualification thresholds in `03-agents/qualification.md` (ICP fit ≥ 70, signal ≥ 60, contactability ≥ 50) are invented numbers presented in the register of specification. They are reasonable v1 defaults; the document should say they are arbitrary and due for refitting once there is outcome data, so nobody later treats them as derived.

---

## 7. Smaller findings

- **`deal` contradicts a stated non-goal.** `vision.md` lists "CRM replacement" as a non-goal; `core-tables.md` adds a `deal` table and `routes-and-pages.md` adds `/ai-sales/deals`. For the MVP a won/lost flag plus a value on `prospect` is enough.
- **Meeting 1/2/3 is a methodology baked into a constraint.** `stage SMALLINT NOT NULL CHECK (stage BETWEEN 1 AND 3)` makes "this deal took four conversations" unrepresentable. Make it a nullable sequence number.
- **SSE is premature and has a deployment gotcha.** `realtime-updates.md` adds an SSE stream. Polling every 10 seconds is sufficient at this scale, and SSE would need response buffering disabled in *both* Caddy and the nginx inside the frontend container.
- **The frontend has no structural plan.** `WorkPage.tsx` is **20,596 lines**; the frontend is ~95,000 LOC. The spec adds 11 routes and a component library with no note on where that code lives or how it avoids becoming a second WorkPage. Given the history of nested-component remount bugs in that file, set the rule before writing page one.
- **Idempotency is asserted, not mechanised.** "Agents must be idempotent per `taskId`" — but an agent that calls an LLM and writes rows is not naturally idempotent. This needs a dedupe table or a unique constraint keyed on `taskId`, and the spec specifies neither.
- **"The system learns" has no mechanism.** E3 includes "As a founder, I can reject a prospect and the system learns." Nothing anywhere defines what that means.
- **Cross-tenant courtesy is unspecified.** Deduplication is per-workspace, so two founder-tenants can target the same company, and a prospect may themselves be an MVP Club user. Not fatal; should be a decision rather than an accident.

---

## 8. Review of the milestone plan and kickoff prompts

### The kickoff prompts silently decide the in-app / separate question

Prompt 1 creates a monorepo `mvpclub-ai-sales` with its own `/frontend` and `/api` on **Fastify + Drizzle**. The live app is **Express + raw `pg`** (verified in `backend/package.json`) with hand-written SQL.

That prompt therefore commits to a separate product, a second web framework, and a second data layer — three consequential decisions, none argued, all expensive to reverse once code exists. Run as written, it leaves one person maintaining two stacks.

Whatever is decided about the product boundary, the framework and data layer should either match what already runs, or diverge deliberately and in writing.

### Eight weeks is off by roughly 3×

M0–M5 in eight weeks builds a monorepo, nine services, an agent SDK, a queue, a new ORM, seven agents, eleven UI routes, calendar OAuth, and a compliance baseline.

The calibration point is this project's own history: ~16,000 backend LOC and ~95,000 frontend LOC over about fifteen months, and a first production deploy that needed four separate fixes because the backend had never been type-checked before it compiled on the server.

The concern is not the slip itself — it is the shape of the failure. A 3×-optimistic plan arrives at week 8 with infrastructure built and nothing a founder can look at. That is the exact failure mode MVP Club's own philosophy exists to prevent: *clarity creates movement*.

### Compliance and provenance are in the wrong milestone

M5 places "provenance everywhere" and "GDPR docs" in week 8, under the heading *Polish*. M3 sends the first email in week 5–6.

Provenance, opt-out and the lawful-basis assessment are **preconditions for the first send**, not cleanup afterwards. And `Outreach agent (email channel v1)` is one checkbox standing in for sending domain, warmup, reputation separation, bounce handling, suppression and volume caps — weeks of work with no milestone of its own.

Week 8 also stacks observability, GDPR documentation *and* a beta launch to five founders in the same week.

### The Definition of Done will not survive contact

"Typed end-to-end" plus "unit + integration tests", **per story**, against a codebase whose frontend carries a 42-error `tsc` baseline in `WorkPage.tsx` and whose backend's first-ever typecheck happened on the production server.

It will be abandoned in week two, which is worse than a lighter standard that is actually held.

**Keep the two that are cheap and make the system debuggable — *agent run logged* and *event emitted*.** Move typing and tests to a per-milestone gate.

### Two traps in the prompts

- **Prompt 2:** "Enable RLS but enforce tenant scoping in the API layer." RLS enabled without policies either blocks everything or silently does nothing, depending on the connecting role. Half-enabled RLS is worse than none, because in review it reads like protection. Write the policies, or leave it off and rely on `scopedDb`.
- **Prompt 5 is the best item in the set** — `signup → Company Brain → ICP proposal → approve` is exactly the right first slice. It is also listed last, behind four infrastructure prompts. Invert that order.

---

## 9. Recommended plan

### Stage 0 — two days, no code

Decide on paper, because all three change the schema and the UI, and anything built before they are answered gets rewritten:

1. **Sender identity** — founder's own mailbox, or platform infrastructure.
2. **Contact data source** — which provider, what it costs per month.
3. **Controller or processor** — and therefore what agreement each founder signs.

### Stage 1 — ~2 weeks. Company Brain + ICP, inside the existing app

- New router at `backend/src/grafter/`, tables prefixed `grafter_`, one `grafter_run` table for run logging.
- Research fetch with a cache table; the egress rules from `research-gateway.md` apply from day one.
- **One** UI page, not eleven.
- No worker, no queue, no Redis. One founder clicking a button — run it inline with a spinner.

### Stage 2 — ~3 weeks. Prospect list with provenance

- Add the worker process here; this is the first genuinely long-running work.
- Queue is Postgres `SELECT … FOR UPDATE SKIP LOCKED`. Postgres is already there and this volume does not justify Redis.
- Founder approves or rejects each prospect, with the reason recorded (this is also the data that would make "the system learns" mean something).
- **Ship to the five beta founders here, with no email capability at all.**

That last point is the most important scheduling change in this document. "Is this list any good?" is the core product risk, and it can be tested in week five with no sending infrastructure, no data-provider contract and no compliance exposure. The spec's plan reaches week 8 with everything built and that question still unanswered.

### Stage 3 — gated on Stage 2 being good

Buyer research and paid contact data. There is no point paying a data provider to enrich a company list that is not yet worth enriching.

### Stage 4 — ~4 weeks. Outreach, human-in-the-loop

- Founder's own mailbox via OAuth; separate sending subdomain from `mvpclub.io`.
- Founder approves **every** message for the first batch, relaxing only once the prompts have earned it.
- Opt-out, provenance and a kill switch (per-founder and platform-wide) land **before** the first send.

### Stage 5 — Qualification + meetings

Reuse the existing `interviews` / `availability_rules` / `availability_settings` booking system rather than the spec's `meeting` table.

### Throughout, from Stage 1

**Evals.** Not a milestone — a standing practice. Nothing in the spec says how you would know that a prompt change made the Company Brain or the prospect list worse. For a seven-agent LLM system this is the thing most likely to hurt quietly.

Roughly twelve weeks to the first email sent, with the hard question answered in week five.

---

## 10. In-app or separate product

**Recommendation: same repo, same database, same deployment — as a genuinely bounded module.**

- `backend/src/grafter/*`, one router mounted once.
- All new tables prefixed `grafter_`.
- Frontend under its own directory with its own structural conventions.
- Reuses `users` and `ideas`; does **not** invent `workspace` and `project`.

The reasons are concrete. The module needs the validation data (`stage_entries` field keys such as `icpJobs`, `icpFrustrations`, `icpAlternatives`), the existing auth, the mailer, and the availability/booking system already built. Splitting it now means duplicating all of that, or building an API between two products that have zero users between them.

**The case for a separate product is real, but it is commercial, not technical.** Different buyer — a post-MVP founder with something to sell and money to spend, versus a pre-idea founder — and it is sellable to people who never touch MVP Club. If that is where the revenue is, the right move is still to build inside and extract later; the module boundary above is what makes extraction cheap.

**What would change this answer:** an intention to charge separately and sell to non-MVP-Club users within about six months. In that case, start now with the new tables in **their own Postgres schema** and **no foreign keys into `users` or `ideas`** — carry a `user_id` and resolve profile data through one thin internal interface. That is the seam along which it later separates cleanly.

One coupling to break either way: **outbound mail must not share a sending domain with `mvpclub.io` transactional mail.** Otherwise one complaint wave takes down password resets.

---

## 11. Missing from the doc set entirely

1. **Sending infrastructure and deliverability** — the largest gap (finding 1).
2. **Controller/processor decision**, DPA with founders, Article 14 notice to prospects.
3. **Cost model** — LLM tokens plus data credits per booked meeting.
4. **Kill switch** — per-founder and platform-wide halt on all outbound.
5. **Human-approval mode** for v1, both for trust and for improving the prompts.
6. **Reply-classification failure modes** — out-of-office, wrong person, "who are you", hostile — and escalation paths.
7. **What "the system learns" means** when a founder rejects a prospect.
8. **Evals** for every agent.
9. **Feature flags and rollback** for adding a module to an application that already has live users.

---

## Appendix — verified codebase facts used above

| Claim | Source |
|---|---|
| Tenancy is `users` → `ideas`; JWT carries `userId` only | `backend/src/db/schema.sql`, `backend/src/middleware/auth.ts` |
| No `workspace` concept in code | grep of `backend/src`, `frontend/src` |
| No Redis in the project | grep of `backend/src`, both compose files, `package.json` |
| Scheduling is in-process `node-cron`, 4 jobs | `backend/src/index.ts`, `backend/src/jobs/` |
| Backend is Express 4 + `pg` 8, no ORM | `backend/package.json` |
| Migrations are 14 hand-run SQL files | `backend/src/db/migrations/` |
| `conversations` / `messages` already exist (founder DMs) | `backend/src/db/add-social-features.sql` |
| `validation_contacts`, `network_contacts` already exist | `schema.sql`, `migrate-all.sql` |
| `interviews`, `availability_rules`, `availability_settings`, `availability_overrides` already exist | `backend/src/db/migrations/add-scheduling.sql`, `add-availability-overrides.sql` |
| Production is 5 containers on one box, including `ollama` | `docker-compose.prod.yml` |
| Mail via `nodemailer` over generic SMTP | `backend/src/utils/mailer.ts` |
| Both Anthropic SDK and local ollama are in use | `backend/package.json`, `backend/src/utils/{aiQuestionCheck,startupNewsFeed,painPointModeration,pollModeration}.ts` |
| `WorkPage.tsx` is 20,596 lines; frontend ~95k LOC | `wc -l` over `frontend/src` |
| Hetzner blocks outbound 25/465; Brevo on 587; single SPF record | project operational notes (not repo-verifiable) |
| Backend's first `tsc` run was on the production server, 14 errors | project operational notes |
| Frontend carries a 42-error `tsc` baseline in `WorkPage.tsx` | project operational notes |
