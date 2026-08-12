# MVP Club — Product Roadmap

> **One-line definition:** A guided execution system that helps founders turn ideas into real startups by giving them one clear next step at every stage.

---

## Design Direction: Apple-Level Polish

The platform aesthetic is clean, confident, and minimal — inspired by Apple's website design:

- **Typography:** SF Pro / Inter — large, bold headlines, generous line height
- **Color:** White-first. Black text. One accent color (deep indigo or electric blue). No gradients unless intentional.
- **Spacing:** Breathe. Everything needs more whitespace than you think.
- **Motion:** Subtle, purposeful. Fade-ins, smooth transitions — never decorative.
- **Components:** Pill buttons, frosted glass cards, clean input fields with no visual clutter
- **Mobile-first:** Every screen looks perfect at 390px wide (iPhone 15 Pro)

---

## Tech Stack (Right-Sized for "Some Coding")

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 + Tailwind CSS | Fast to build, React ecosystem, great for SEO |
| Backend / DB | Supabase | Auth, database, real-time — all in one, no backend code needed |
| Hosting | Vercel | One-click deploys, free tier, works perfectly with Next.js |
| Payments (later) | Stripe | Industry standard, easy to integrate |
| Email | Resend | Developer-friendly, beautiful transactional emails |
| Analytics | PostHog | Product analytics + session replay, generous free tier |

**Total cost to start: ~$0/month** until you hit meaningful scale.

---

## Phase 0 — Validate Before You Build (Week 1–2)

**Goal:** Confirm people want this before writing a line of platform code.

### What to build
- A single landing page (Apple-quality design)
- Waitlist form (email capture)
- One-sentence value prop above the fold

### What it looks like
```
MVP Club

Turn your idea into a real startup.
One step at a time.

[ Join the waitlist ]

Currently helping 0 founders ship.
```

### How to validate
- Share in 3 founder communities (Indie Hackers, Product Hunt Ship, Twitter)
- Target: 50 signups in 7 days = green light to build
- Talk to 5 people from the waitlist before Phase 1

### Tools
- Carrd or a simple Next.js page
- Mailchimp or Loops for email capture
- No code, no database — just signal

---

## Phase 1 — The Core Product (Week 3–8)

**Goal:** The 3-screen product working end-to-end for a single user.

### Screen 1: Your Journey (Home)
- User sees their current stage
- One next step displayed
- One action button
- Stage progress indicator (Idea → Hone → Validate → Shape → Done)

### Screen 2: Do the Work
- Stage-specific prompt appears
- Text input with auto-save
- Optional guidance text (collapsed by default)
- Example answers (reveal on tap)
- "Mark complete" advances the stage

### Screen 3: Community Proof
- Filtered by current stage
- Structured post format only (no freeform wall of text)
- 3 actions: Encourage / Comment / Ask how
- Posts are 1–3 sentences max, enforced by the input

### Auth
- Email magic link (no passwords — frictionless)
- Supabase Auth handles this in ~30 minutes

### Database schema (simplified)
```
users: id, email, name, current_stage, created_at
stage_entries: id, user_id, stage, content, completed_at
community_posts: id, user_id, stage, content, created_at
reactions: id, post_id, user_id, type (encourage/ask)
comments: id, post_id, user_id, content
```

### Definition of done for Phase 1
- [ ] User can sign up via email
- [ ] User can set their stage
- [ ] User can complete a stage prompt and advance
- [ ] User can post to community
- [ ] User can encourage and comment on others' posts

---

## Phase 2 — Make It Sticky (Week 9–14)

**Goal:** Users come back tomorrow. And the day after.

### What to add
- **Daily nudge emails** — "You haven't logged your step today" (Resend)
- **Stage streaks** — Visual momentum tracker (how many days in a row you've moved)
- **Founder profile** — Name, idea, current stage, wins so far
- **Win announcements** — When someone completes a stage, the community sees it
- **Stage transitions** — Celebratory moment when you advance (Apple-style full-screen animation)

### What NOT to add yet
- DMs between users
- Badges / gamification
- A "discover" or "explore" feed
- Notifications (beyond email nudge)

---

## Phase 3 — Intelligence Layer (Week 15–20)

**Goal:** The product gets smarter about where you're stuck.

### Stage detection
- Ask 3 diagnostic questions on signup
- Map answers to the right starting stage
- Don't make users self-assess (founders always think they're further along than they are)

### Next action generator
- Hardcoded for now (5 stages × 3 actions = 15 prompts total)
- Later: personalize based on what you've entered
- Much later: AI-generated based on your specific idea

### Community matching
- Surface posts from people with similar ideas (same industry, similar stage)
- "3 founders working on marketplace ideas validated this week"

---

## Phase 4 — Growth & Revenue (Month 6+)

**Goal:** Make MVP Club a real business.

### Monetization options (pick one to test first)
| Model | What it is | Pros | Cons |
|---|---|---|---|
| Freemium | Free for basics, paid for coaching/calls | Easy to grow | Harder to convert |
| Cohort | Paid 6-week cohort (group of 20 founders) | High value, high price | Harder to scale |
| SaaS | Monthly subscription for full access | Predictable revenue | Need strong retention first |

**Recommendation:** Start with a paid cohort ($299–$499/person, 20 founders, 6 weeks). Zero infrastructure cost, direct feedback, community density. Run 3 cohorts manually before automating anything.

### Growth levers
- Founder success stories (each shipped MVP = case study)
- "I built this with MVP Club" as social proof
- Referral: "Invite a co-founder, skip the waitlist"

---

## What You're NOT Building (And Why)

| Thing | Why you're skipping it |
|---|---|
| Mobile app | Web-first until you have 500+ daily actives |
| AI co-pilot / chatbot | Adds complexity, removes clarity |
| Resource library / content | Founders don't fail from lack of content |
| Leaderboards / badges | Gamification distracts from shipping |
| Integration marketplace | Way too early |

---

## 12-Week Sprint Plan

| Week | Focus | Key Output |
|---|---|---|
| 1 | Landing page + waitlist | Live URL, email capture working |
| 2 | Talk to waitlist users (5 calls) | Validated problem statement |
| 3–4 | Auth + home screen (Screen 1) | Users can sign in and see their stage |
| 5–6 | Do the Work screen (Screen 2) | Users can complete prompts and advance |
| 7–8 | Community Proof screen (Screen 3) | Users can post and react |
| 9 | Bug fixes + polish | Everything works smoothly |
| 10 | Beta launch to waitlist (50 users) | Real usage, real feedback |
| 11 | Retention analysis | Which users came back? Why? |
| 12 | Decide: iterate or launch publicly | Public launch or another sprint |

---

## The One Metric That Matters

**% of users who advance at least one stage within 7 days of signing up.**

Everything else is noise. If this number is above 40%, you're building the right thing.

---

*MVP Club — Clarity creates movement. Movement creates founders.*
