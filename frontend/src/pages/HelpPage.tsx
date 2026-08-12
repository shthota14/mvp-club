import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';

// ─── Content data ────────────────────────────────────────────────────────────

interface GuideResource {
  icon: string;
  text: string;
}

interface GuideContent {
  id: string;
  section: 'How-to' | 'Guides' | 'Business' | 'Concepts';
  label: string;
  navIcon: string;
  color: string;       // accent
  bg: string;          // light bg
  border: string;
  tagline: string;
  intro: string;
  visual: {            // mini infographic steps/phases
    type: 'steps' | 'grid' | 'flow';
    items: { icon: string; label: string; color?: string }[];
  };
  resources: GuideResource[];
  cta: { label: string; href: string };
}

const GUIDES: GuideContent[] = [
  // ── HOW-TO ──────────────────────────────────────────────────────────────────
  {
    id: 'getting-started',
    section: 'How-to',
    label: 'Getting Started',
    navIcon: '🚀',
    color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe',
    tagline: 'From sign-up to your first step in under 5 minutes',
    intro: 'MVP Club is a guided execution system. This guide walks you through setting up your account, finding your stage, and taking your very first action on the platform.',
    visual: {
      type: 'steps',
      items: [
        { icon: '📝', label: 'Create account' },
        { icon: '🎯', label: 'Set your stage' },
        { icon: '💡', label: 'Add your idea' },
        { icon: '🚀', label: 'Take first action' },
      ],
    },
    resources: [
      { icon: '✅', text: 'Sign up using your email — no credit card needed.' },
      { icon: '✅', text: 'Choose your current stage on the onboarding screen: Idea, Hone, Validate, Shape, or Done.' },
      { icon: '✅', text: 'Add your startup idea in "My Idea Vault" — one sentence is enough to start.' },
      { icon: '✅', text: 'Your home screen always shows your current stage and one clear next step.' },
      { icon: '✅', text: 'Complete the next step shown — this moves you forward in the platform.' },
      { icon: '✅', text: 'Use the Community tab to see what others at your stage are doing.' },
      { icon: '✅', text: 'Click the ? button anywhere to open a context-aware guide.' },
      { icon: '✅', text: 'Update your profile with a one-line description of your startup.' },
      { icon: '✅', text: 'Message another founder via the ✉️ inbox button in the top nav.' },
      { icon: '✅', text: 'Return to your journey whenever you need your next step — the platform tracks where you left off.' },
    ],
    cta: { label: 'View full getting started guide →', href: '/guides/01-getting-started.html' },
  },
  {
    id: 'journey',
    section: 'How-to',
    label: '5-Stage Journey',
    navIcon: '🗺',
    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',
    tagline: 'Idea → Hone → Validate → Shape → Done',
    intro: 'Every founder on MVP Club moves through 5 stages. Each stage has one clear purpose and one clear output. You don\'t skip stages — you complete them.',
    visual: {
      type: 'flow',
      items: [
        { icon: '💡', label: 'Idea', color: '#fdf4ff' },
        { icon: '🔧', label: 'Hone', color: '#eff6ff' },
        { icon: '🗣', label: 'Validate', color: '#f0fdf4' },
        { icon: '📐', label: 'Shape', color: '#fff7ed' },
        { icon: '🚢', label: 'Done', color: '#fef9c3' },
      ],
    },
    resources: [
      { icon: '🔵', text: 'Idea stage: you have a problem or concept but haven\'t yet defined it clearly.' },
      { icon: '🔵', text: 'Hone stage: you sharpen the idea — define the problem, the customer, and the one-line pitch.' },
      { icon: '🔵', text: 'Validate stage: you test the idea with real people before building anything.' },
      { icon: '🔵', text: 'Shape stage: you scope your MVP — what exactly you\'ll build and what you\'ll leave out.' },
      { icon: '🔵', text: 'Done stage: you\'ve shipped something real and are working toward your first customer.' },
      { icon: '🔵', text: 'Each stage shows a single "next action" — one concrete thing you do today.' },
      { icon: '🔵', text: 'You move stages by completing the action and marking it done.' },
      { icon: '🔵', text: 'You can always go back a stage if your thinking changes — that\'s part of the process.' },
      { icon: '🔵', text: 'Your Community feed shows founders at every stage — filter by your stage to see what\'s relevant.' },
      { icon: '🔵', text: 'Each stage has example outputs so you always know what "done" looks like.' },
    ],
    cta: { label: 'View full 5-stage journey guide →', href: '/guides/02-five-stage-journey.html' },
  },
  {
    id: 'community',
    section: 'How-to',
    label: 'Community',
    navIcon: '💬',
    color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc',
    tagline: 'Share wins, ask questions, and find your people',
    intro: 'The MVP Club community is built around structured updates — not endless scrolling. Every post answers one of three questions: What did you do? What did you learn? What do you need help with?',
    visual: {
      type: 'grid',
      items: [
        { icon: '📢', label: 'Share a win' },
        { icon: '🙋', label: 'Ask for help' },
        { icon: '💡', label: 'Share a lesson' },
        { icon: '👍', label: 'Encourage others' },
        { icon: '💬', label: 'Leave a comment' },
        { icon: '🔍', label: 'Ask how they did it' },
      ],
    },
    resources: [
      { icon: '📌', text: 'Post type "Win" — share something you shipped, validated, or completed.' },
      { icon: '📌', text: 'Post type "Question" — ask a specific question; the more specific, the better the answer.' },
      { icon: '📌', text: 'Post type "Lesson" — share something you learned, even if it came from a mistake.' },
      { icon: '📌', text: 'Filter the feed by stage — see only posts from founders at the same stage as you.' },
      { icon: '📌', text: 'Use the "Encourage" button (👍) to show support for another founder\'s post.' },
      { icon: '📌', text: 'Use the "Ask how" button (🔍) to request a breakdown of how they did something.' },
      { icon: '📌', text: 'Comment to add context, share your experience, or answer a question.' },
      { icon: '📌', text: 'Every post shows the founder\'s stage — you can filter to your own stage for relevance.' },
      { icon: '📌', text: 'Post at least once a week — accountability is the community\'s biggest value.' },
      { icon: '📌', text: 'DM a founder you admire — they\'re building in the same trenches as you.' },
    ],
    cta: { label: 'View full community guide →', href: '/guides/03-community.html' },
  },
  {
    id: 'messaging',
    section: 'How-to',
    label: 'Private Messaging',
    navIcon: '✉️',
    color: '#059669', bg: '#f0fdf4', border: '#86efac',
    tagline: 'Direct, private conversations with other founders',
    intro: 'Private messaging lets you have one-on-one conversations with any founder in the community. Use it to collaborate, get specific feedback, or simply connect with someone building something similar.',
    visual: {
      type: 'steps',
      items: [
        { icon: '🔍', label: 'Find founder' },
        { icon: '✉️', label: 'Compose message' },
        { icon: '💬', label: 'Start thread' },
        { icon: '🔔', label: 'Get notified' },
      ],
    },
    resources: [
      { icon: '✉️', text: 'Click the ✉️ icon in the top navigation to open your inbox.' },
      { icon: '✉️', text: 'Click "Compose" to start a new conversation with any founder by name.' },
      { icon: '✉️', text: 'Type a name in the search box to find and select who you want to message.' },
      { icon: '✉️', text: 'Messages are private — only you and the other person can see the conversation.' },
      { icon: '✉️', text: 'Unread messages show a red badge on the ✉️ icon in the nav.' },
      { icon: '✉️', text: 'Press Enter to send. Press Shift+Enter to add a new line.' },
      { icon: '✉️', text: 'Messages show read receipts — you\'ll see "✓ Read" when the other person has seen your message.' },
      { icon: '✉️', text: 'Your conversation list is on the left — click any thread to open it.' },
      { icon: '✉️', text: 'Use messaging for deep conversations that don\'t belong in the public community feed.' },
      { icon: '✉️', text: 'Message founders who post about challenges similar to yours — they\'re usually happy to talk.' },
    ],
    cta: { label: 'View full messaging guide →', href: '/guides/04-private-messaging.html' },
  },

  // ── PRACTICAL GUIDES ────────────────────────────────────────────────────────
  {
    id: 'guide-validate',
    section: 'Guides',
    label: 'How to Validate an Idea',
    navIcon: '🔬',
    color: '#9333ea', bg: '#fdf4ff', border: '#f0abfc',
    tagline: 'Find out if people will pay — before you write code',
    intro: 'Validation is the process of proving your idea solves a real problem that real people will pay to fix. It happens before you write code. Most founders skip it. Most founders fail.',
    visual: {
      type: 'steps',
      items: [
        { icon: '🎯', label: 'Define problem' },
        { icon: '👥', label: 'Find people' },
        { icon: '🗣', label: 'Interview' },
        { icon: '📊', label: 'Spot signal' },
        { icon: '🚦', label: 'Decide' },
      ],
    },
    resources: [
      { icon: '✅', text: 'Write your problem statement in one sentence before anything else — vague problems get vague answers.' },
      { icon: '✅', text: 'Identify a specific customer segment: name them precisely, not "anyone who has this problem".' },
      { icon: '✅', text: 'Interview 20–50 potential users — not friends, not family, not people who know you.' },
      { icon: '✅', text: 'Never mention your solution until the last 5 minutes of the interview.' },
      { icon: '✅', text: 'Ask: "Tell me about the last time this was a problem. What happened?" — past beats hypothetical.' },
      { icon: '✅', text: 'Ask: "How do you deal with it today?" — existing workarounds prove real pain.' },
      { icon: '✅', text: 'Ask: "How much does this cost you in time, money, or stress per month?" — quantify the pain.' },
      { icon: '✅', text: 'Real signal: "I\'ve already tried to build something for this" or "I\'d pay today without hesitation."' },
      { icon: '🚩', text: 'Noise: "Yeah that sounds like a good idea" or "My friend would definitely want this." Walk away.' },
      { icon: '🎯', text: 'After 10 interviews: 3+ confirmed the pain and 2+ said they\'d pay = validated. Build now.' },
    ],
    cta: { label: 'View practical guides infographic →', href: '/guides/concept-07-howto-guides.html' },
  },
  {
    id: 'guide-pmf',
    section: 'Guides',
    label: 'How to Find Product-Market Fit',
    navIcon: '🧲',
    color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd',
    tagline: 'The holy grail — and how to know when you have it',
    intro: 'PMF happens when customers consistently find value and keep returning without you pushing them. It\'s not a moment — it\'s a signal pattern. Here\'s how to read it.',
    visual: {
      type: 'steps',
      items: [
        { icon: '🚢', label: 'Launch' },
        { icon: '📊', label: 'Measure retention' },
        { icon: '🔄', label: 'Iterate fast' },
        { icon: '🔍', label: 'Find the signal' },
        { icon: '🧲', label: 'Lock in PMF' },
      ],
    },
    resources: [
      { icon: '📌', text: 'PMF is not when people like your product. It\'s when they\'d be genuinely upset if it disappeared.' },
      { icon: '📌', text: 'Measure week-over-week retention: are users coming back without prompting?' },
      { icon: '📌', text: 'The 40% test: ask users "How would you feel if you could no longer use this?" — 40%+ say "very disappointed" = PMF.' },
      { icon: '📌', text: 'Net Promoter Score: are customers recommending you to others without being asked?' },
      { icon: '📌', text: 'Organic growth: are new users arriving without paid acquisition? That\'s a PMF signal.' },
      { icon: '📌', text: 'Solve one painful problem extremely well before expanding features. Breadth kills PMF.' },
      { icon: '📌', text: 'Talk to churned users: what did they expect that you didn\'t deliver? That gap is your PMF roadmap.' },
      { icon: '📌', text: 'Look for "pull" — when customers are asking for specific features, you\'re close.' },
      { icon: '📌', text: 'PMF is segment-specific: you may have PMF with one user type and zero with another.' },
      { icon: '📌', text: 'Once retention stabilises, then scale. Scaling before PMF accelerates failure.' },
    ],
    cta: { label: 'View practical guides infographic →', href: '/guides/concept-07-howto-guides.html' },
  },
  {
    id: 'guide-mvp',
    section: 'Guides',
    label: 'How to Build an MVP That Matters',
    navIcon: '🛠',
    color: '#15803d', bg: '#f0fdf4', border: '#86efac',
    tagline: 'An MVP is not a smaller product — it\'s a focused experiment',
    intro: 'An MVP is the simplest thing you can build to test your core assumption. Not a prototype. Not a demo. A real thing that real people use to do a real job. Scope ruthlessly.',
    visual: {
      type: 'steps',
      items: [
        { icon: '🎯', label: 'One assumption' },
        { icon: '✂️', label: 'Cut features' },
        { icon: '⚡', label: 'Build fast' },
        { icon: '🚀', label: 'Launch early' },
        { icon: '📊', label: 'Learn & iterate' },
      ],
    },
    resources: [
      { icon: '🛠', text: 'Write your core assumption: "We believe [user] will [action] because [reason]." That\'s your MVP target.' },
      { icon: '🛠', text: 'List every feature you want to build. Then cross out everything not required to test the core assumption.' },
      { icon: '🛠', text: 'No edge cases in v1. No admin dashboards. No settings pages. One happy path only.' },
      { icon: '🛠', text: 'Set a hard deadline: 4 weeks maximum. A real constraint forces real decisions.' },
      { icon: '🛠', text: 'Prioritise learning over polish. An embarrassingly simple MVP that runs beats a beautiful one that doesn\'t.' },
      { icon: '🛠', text: 'Your first users don\'t want perfect software. They want their problem solved.' },
      { icon: '🛠', text: 'Manual before automated: do things by hand first, then automate what works. Stripe started with manual payments.' },
      { icon: '🛠', text: 'Launch to your interview contacts first — they already told you they have the problem.' },
      { icon: '🛠', text: 'Ship when it works, not when it feels ready. If you\'re not embarrassed by v1, you waited too long.' },
      { icon: '🛠', text: 'After launch: talk to every single user. The first 10 conversations are worth more than any analytics.' },
    ],
    cta: { label: 'View practical guides infographic →', href: '/guides/concept-07-howto-guides.html' },
  },
  {
    id: 'guide-cofounder',
    section: 'Guides',
    label: 'How to Choose a Co-Founder',
    navIcon: '🤝',
    color: '#c2410c', bg: '#fff7ed', border: '#fdba74',
    tagline: 'The most important hire you\'ll ever make — choose wisely',
    intro: 'A co-founder relationship outlasts most marriages and is harder to exit. The right one multiplies your speed. The wrong one destroys the company. Evaluate slowly.',
    visual: {
      type: 'grid',
      items: [
        { icon: '🧠', label: 'Complementary skills' },
        { icon: '⚖️', label: 'Shared values' },
        { icon: '💪', label: 'Work ethic' },
        { icon: '🗣', label: 'Communication' },
        { icon: '🔥', label: 'Mission aligned' },
        { icon: '🧩', label: 'Conflict style' },
      ],
    },
    resources: [
      { icon: '🤝', text: 'Complementary skills matter more than compatible personalities. You need someone who does what you can\'t.' },
      { icon: '🤝', text: 'Work together on a real project for at least 3 months before formalising anything. Pressure reveals character.' },
      { icon: '🤝', text: 'Align on risk tolerance before starting: how long can each of you go without salary? Different answers = future conflict.' },
      { icon: '🤝', text: 'Discuss equity, roles, and decision-making rights explicitly — before you need to.' },
      { icon: '🤝', text: 'Shared mission is non-negotiable: you both need to care deeply about the problem, not just the company.' },
      { icon: '🤝', text: 'How do they handle disagreement? Watch for stonewalling, blame-shifting, or shutting down under stress.' },
      { icon: '🤝', text: 'Work ethic compatibility: one person running 80-hour weeks and one running 40 creates resentment fast.' },
      { icon: '🤝', text: 'Reference check them: ask former colleagues, employers, or anyone they\'ve worked closely with.' },
      { icon: '🤝', text: 'Legal: vesting schedules (4 years, 1-year cliff) protect both parties if someone leaves early. Non-negotiable.' },
      { icon: '🤝', text: 'Red flag: a co-founder who\'s never shipped anything. Ideas are cheap. Execution history is the tell.' },
    ],
    cta: { label: 'View practical guides infographic →', href: '/guides/concept-07-howto-guides.html' },
  },
  {
    id: 'guide-customers',
    section: 'Guides',
    label: 'How to Get First 100 Customers',
    navIcon: '👥',
    color: '#0e7490', bg: '#ecfeff', border: '#67e8f9',
    tagline: 'Do things that don\'t scale — at first',
    intro: 'Early growth is manual. Persistence and personal outreach beat scalable channels every time for your first 100. Founders who\'ve done it all say the same thing: go direct, be human.',
    visual: {
      type: 'steps',
      items: [
        { icon: '📋', label: 'List 100 targets' },
        { icon: '✉️', label: 'Reach out 1:1' },
        { icon: '🎯', label: 'Run demos' },
        { icon: '🙏', label: 'Ask for referrals' },
        { icon: '🔁', label: 'Repeat' },
      ],
    },
    resources: [
      { icon: '👥', text: 'List 100 people in your target segment. Name, contact, and why they fit. Then work the list.' },
      { icon: '👥', text: 'Start with your warm network — not to get customers but to get introductions to the right people.' },
      { icon: '👥', text: 'Personalise every outreach message. One generic email = zero replies. One tailored DM = 40% response rate.' },
      { icon: '👥', text: 'Find communities where your target customers already gather: Reddit, Slack groups, LinkedIn, niche forums.' },
      { icon: '👥', text: 'Offer to onboard personally: "15-minute call and I\'ll set it up for you" removes all friction.' },
      { icon: '👥', text: 'After every demo, ask: "Is there one person you know with this same problem I could speak to?"' },
      { icon: '👥', text: 'Content that genuinely helps your target customer is a slow but compounding channel. Start early.' },
      { icon: '👥', text: 'Attend 3 events or communities where your customer hangs out and just listen and help.' },
      { icon: '👥', text: 'Turn each customer into a case study: a two-paragraph story of their problem and how you solved it.' },
      { icon: '👥', text: 'Referrals come from customers who succeeded. Invest in their success before asking for referrals.' },
    ],
    cta: { label: 'View practical guides infographic →', href: '/guides/concept-07-howto-guides.html' },
  },
  {
    id: 'guide-pricing',
    section: 'Guides',
    label: 'How to Price Your Product',
    navIcon: '💰',
    color: '#a16207', bg: '#fef9c3', border: '#fde047',
    tagline: 'Price based on value delivered — not development cost',
    intro: 'Pricing is one of the highest-leverage decisions in a startup. It affects positioning, margin, growth, and investor perception. Most founders underprice by trying to be competitive rather than valuable.',
    visual: {
      type: 'grid',
      items: [
        { icon: '💡', label: 'Value delivered' },
        { icon: '🔍', label: 'Alternatives' },
        { icon: '🙋', label: 'Willingness to pay' },
        { icon: '📊', label: 'Cost + margin' },
        { icon: '🧪', label: 'A/B test' },
        { icon: '📈', label: 'Raise over time' },
      ],
    },
    resources: [
      { icon: '💰', text: 'Never base price on development cost. Base it on the value you deliver to the customer.' },
      { icon: '💰', text: 'Ask customers directly: "What would you pay for this?" then ask "What if it was $X?" — watch their reaction.' },
      { icon: '💰', text: 'Research what alternatives cost, including manual workarounds. Your floor is the alternatives\' price.' },
      { icon: '💰', text: 'Charge more than feels comfortable. Founders almost universally underprice at the start.' },
      { icon: '💰', text: 'Freemium works when: the free tier creates real value and the conversion path is obvious. Not every product.' },
      { icon: '💰', text: 'Subscriptions create predictable revenue. One-time fees feel safer to customers. Know the trade-off.' },
      { icon: '💰', text: 'Usage-based pricing aligns your revenue with customer success. Hard to forecast but builds trust.' },
      { icon: '💰', text: 'Test two price points with your first 20 users: see at what price people stop without negotiating.' },
      { icon: '💰', text: 'Pricing signal: if nobody complains about the price, you\'re priced too low.' },
      { icon: '💰', text: 'Raise prices as you add value. Existing customers who stay after a price rise validate the product.' },
    ],
    cta: { label: 'View practical guides infographic →', href: '/guides/concept-07-howto-guides.html' },
  },
  {
    id: 'guide-funding',
    section: 'Guides',
    label: 'How to Raise Funding',
    navIcon: '📈',
    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',
    tagline: 'Only raise if funding accelerates a strategy you already have',
    intro: 'Fundraising should support a plan that works, not replace having one. Most founders need it less than they think. When you do need it, here\'s how to approach it.',
    visual: {
      type: 'steps',
      items: [
        { icon: '📊', label: 'Show traction' },
        { icon: '🗣', label: 'Tell the story' },
        { icon: '🔍', label: 'Find right investors' },
        { icon: '📋', label: 'Run the process' },
        { icon: '🤝', label: 'Close' },
      ],
    },
    resources: [
      { icon: '📈', text: 'The question before fundraising: can this business grow without external capital? If yes, reconsider.' },
      { icon: '📈', text: 'Investors fund traction, not ideas. Show at least 3 months of consistent growth in any metric that matters.' },
      { icon: '📈', text: 'Have a clear vision of the market, the problem, and why this team is the right one to solve it.' },
      { icon: '📈', text: 'Know your numbers cold: MRR, growth rate, CAC, LTV, churn, burn rate, runway.' },
      { icon: '📈', text: 'The pitch deck: problem → solution → market → traction → team → ask. Six slides that tell one story.' },
      { icon: '📈', text: 'Find investors who\'ve funded similar companies. Their pattern recognition makes diligence faster.' },
      { icon: '📈', text: 'Warm introductions convert 5× better than cold outreach. Build investor relationships before you need money.' },
      { icon: '📈', text: 'Run a process: talk to 20+ investors in parallel. Momentum creates urgency. Drip-feeding kills deals.' },
      { icon: '📈', text: 'Investors say yes to the team as much as the idea. Show coachability, speed, and judgment.' },
      { icon: '📈', text: 'Term sheets: understand dilution, pro-rata rights, and board control before signing anything.' },
    ],
    cta: { label: 'View practical guides infographic →', href: '/guides/concept-07-howto-guides.html' },
  },
  {
    id: 'guide-team',
    section: 'Guides',
    label: 'How to Build an Effective Team',
    navIcon: '🏗',
    color: '#0369a1', bg: '#f0f9ff', border: '#7dd3fc',
    tagline: 'Hire slow. A small excellent team beats a large average one',
    intro: 'Your first 10 hires define the culture and execution speed for the next 3 years. Early team members aren\'t just filling roles — they\'re encoding the DNA of the company.',
    visual: {
      type: 'grid',
      items: [
        { icon: '⚡', label: 'Adaptability' },
        { icon: '🔑', label: 'Ownership' },
        { icon: '💬', label: 'Communication' },
        { icon: '🎯', label: 'Mission aligned' },
        { icon: '📦', label: 'Shipping history' },
        { icon: '🔍', label: 'References' },
      ],
    },
    resources: [
      { icon: '🏗', text: 'Hire for adaptability first — early startups pivot constantly. Specialists who can\'t adapt become liabilities.' },
      { icon: '🏗', text: 'Look for ownership: candidates who ask "what\'s the outcome?" not "what\'s the job description?"' },
      { icon: '🏗', text: 'Strong communication is underrated. Remote or in-person, unclear communication kills coordination.' },
      { icon: '🏗', text: 'Mission alignment: do they care about the problem, or just the job? Test this by asking why they applied.' },
      { icon: '🏗', text: 'Work sample before offer: a 2-hour paid task reveals more than 5 interviews.' },
      { icon: '🏗', text: 'Always reference check: ask "would you hire them again?" and wait for the pause before the answer.' },
      { icon: '🏗', text: 'Hire for the next 12 months, not the next 5 years. Over-hiring for scale too early creates dead weight.' },
      { icon: '🏗', text: 'Define clear roles with measurable outcomes before hiring, not after.' },
      { icon: '🏗', text: 'Culture is built by who you promote and who you exit. Both decisions are culture signals.' },
      { icon: '🏗', text: 'Fire fast when it\'s clearly wrong. Keeping a poor fit longer doesn\'t help anyone.' },
    ],
    cta: { label: 'View practical guides infographic →', href: '/guides/concept-07-howto-guides.html' },
  },
  {
    id: 'guide-metrics',
    section: 'Guides',
    label: 'How to Measure What Matters',
    navIcon: '📊',
    color: '#be185d', bg: '#fdf2f8', border: '#f9a8d4',
    tagline: 'Track a small number of metrics aligned with your business model',
    intro: 'Vanity metrics feel good. Real metrics change decisions. Most founders track too many things and act on none of them. Pick 3–5 that directly reflect the health of your business model.',
    visual: {
      type: 'grid',
      items: [
        { icon: '💳', label: 'MRR' },
        { icon: '📉', label: 'Churn rate' },
        { icon: '👤', label: 'CAC' },
        { icon: '💰', label: 'LTV' },
        { icon: '⚡', label: 'Activation' },
        { icon: '🔄', label: 'Retention' },
      ],
    },
    resources: [
      { icon: '📊', text: 'Monthly Recurring Revenue (MRR): the single most important number for a subscription business.' },
      { icon: '📊', text: 'Churn rate: what % of customers leave each month? High churn means the product isn\'t working yet.' },
      { icon: '📊', text: 'Customer Acquisition Cost (CAC): what does it cost to acquire one paying customer?' },
      { icon: '📊', text: 'Customer Lifetime Value (LTV): what does a customer pay over their lifetime? LTV:CAC should be 3:1 minimum.' },
      { icon: '📊', text: 'Activation rate: what % of sign-ups reach the key action that makes them a real user?' },
      { icon: '📊', text: 'Week-over-week retention curve: if it flattens above 0%, you have something. If it hits 0%, fix retention first.' },
      { icon: '📊', text: 'Avoid vanity metrics: page views, total sign-ups, social followers, app downloads. None of these pay bills.' },
      { icon: '📊', text: 'North Star Metric: one number that best captures value delivered. Airbnb = nights booked. Slack = messages sent.' },
      { icon: '📊', text: 'Build a simple weekly dashboard: just 5 numbers. If you can\'t fit it in 5, you\'re tracking noise.' },
      { icon: '📊', text: 'If a metric doesn\'t change how you make decisions this week, stop tracking it.' },
    ],
    cta: { label: 'View practical guides infographic →', href: '/guides/concept-07-howto-guides.html' },
  },
  {
    id: 'guide-scale',
    section: 'Guides',
    label: 'How to Scale Without Losing Focus',
    navIcon: '🚀',
    color: '#334155', bg: '#f5f5f7', border: '#cbd5e1',
    tagline: 'Growth should amplify what works — not fix what doesn\'t',
    intro: 'Scaling before you\'re ready is one of the most common ways startups die. Growth creates complexity that overwhelms organisations that aren\'t ready for it. Here\'s the sequence that works.',
    visual: {
      type: 'flow',
      items: [
        { icon: '🧲', label: 'PMF', color: '#f0fdf4' },
        { icon: '🔁', label: 'Repeatable sales', color: '#eff6ff' },
        { icon: '📋', label: 'Document', color: '#fff7ed' },
        { icon: '👥', label: 'Expand team', color: '#fdf4ff' },
        { icon: '📈', label: 'Scale', color: '#fef9c3' },
      ],
    },
    resources: [
      { icon: '🚀', text: 'The sequence: PMF first → repeatable sales → documented processes → team expansion → scale. Not before.' },
      { icon: '🚀', text: 'Say no to most things. Scaling requires more focus, not more options.' },
      { icon: '🚀', text: 'Document before you delegate: write down how you do the thing before handing it to someone else.' },
      { icon: '🚀', text: 'Hire to extend capacity, not to solve problems you haven\'t figured out yet.' },
      { icon: '🚀', text: 'Keep customer feedback loops short as you scale. The distance from customer to decision must stay small.' },
      { icon: '🚀', text: 'Protect cash: scaling burns money fast. Know your burn rate and runway at all times.' },
      { icon: '🚀', text: 'Track leading indicators, not just lagging ones. Don\'t wait for churn to tell you the product is broken.' },
      { icon: '🚀', text: 'Culture scales through behaviour, not policies. Model what you want the company to be.' },
      { icon: '🚀', text: 'Systems over heroics: if the only way something works is because one person does it brilliantly, it doesn\'t scale.' },
      { icon: '🚀', text: 'Growth is the reward for doing the basics right repeatedly. There are no shortcuts at scale.' },
    ],
    cta: { label: 'View practical guides infographic →', href: '/guides/concept-07-howto-guides.html' },
  },

  // ── BUSINESS FUNDAMENTALS ────────────────────────────────────────────────────
  {
    id: 'biz-tam',
    section: 'Business',
    label: 'TAM, SAM & SOM',
    navIcon: '📊',
    color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe',
    tagline: 'Market sizing — investors fund SOM, not TAM',
    intro: 'TAM, SAM, and SOM are three lenses for understanding market opportunity. Get these wrong and investors won\'t believe the rest of your pitch. Get them right and you anchor the entire conversation.',
    visual: {
      type: 'steps',
      items: [
        { icon: '🌐', label: 'TAM (Total)' },
        { icon: '🎯', label: 'SAM (Serviceable)' },
        { icon: '🏆', label: 'SOM (Obtainable)' },
        { icon: '📊', label: 'Defend SOM' },
      ],
    },
    resources: [
      { icon: '📊', text: 'TAM (Total Addressable Market): everyone in the world who could theoretically buy your product.' },
      { icon: '📊', text: 'SAM (Serviceable Addressable Market): the segment you can actually reach with your model and geography.' },
      { icon: '📊', text: 'SOM (Serviceable Obtainable Market): the share you\'ll realistically win in 3–5 years. This is what matters.' },
      { icon: '📊', text: 'Bottom-up sizing is more credible: number of customers × average contract value, not "1% of a $10B market."' },
      { icon: '📊', text: 'Investors fund SOM. Know your SOM number and be able to defend every assumption behind it.' },
      { icon: '📊', text: 'A $10M SOM with a clear path is worth more than a $1B TAM with no clear entry.' },
      { icon: '📊', text: 'Market size affects which investors will meet you. VCs typically need a $1B+ TAM to justify their fund economics.' },
      { icon: '📊', text: 'Use publicly available data: industry reports, competitor revenue disclosures, association statistics.' },
      { icon: '📊', text: 'Niche markets can be fine for bootstrapped businesses. For VC, you need a narrative of how the market grows.' },
      { icon: '📊', text: 'Revisit your market sizing every 6 months — new entrants or regulatory shifts change the picture.' },
    ],
    cta: { label: 'View business fundamentals infographic →', href: '/guides/concept-08-business-fundamentals.html' },
  },
  {
    id: 'biz-revenue-model',
    section: 'Business',
    label: 'Revenue Models',
    navIcon: '💳',
    color: '#15803d', bg: '#f0fdf4', border: '#86efac',
    tagline: 'How you charge determines your entire growth curve',
    intro: 'Your revenue model isn\'t just how you get paid — it shapes your CAC, LTV, customer relationship, and what investors will fund. Choose deliberately, not by default.',
    visual: {
      type: 'grid',
      items: [
        { icon: '🔄', label: 'SaaS subscription' },
        { icon: '⚡', label: 'Usage-based' },
        { icon: '🛒', label: 'Marketplace' },
        { icon: '🎁', label: 'Freemium' },
        { icon: '📦', label: 'One-time' },
        { icon: '🤝', label: 'Licensing' },
      ],
    },
    resources: [
      { icon: '💳', text: 'SaaS subscription: predictable MRR, high customer lifetime value, high sales cycle. Best for recurring problems.' },
      { icon: '💳', text: 'Usage-based: revenue scales with customer success. Great for trust but hard to forecast.' },
      { icon: '💳', text: 'Marketplace/transaction: takes a % of GMV. Needs liquidity on both sides before it works.' },
      { icon: '💳', text: 'Freemium: free tier drives adoption; paid tier converts power users. Works only with genuine upgrade motivation.' },
      { icon: '💳', text: 'One-time fee: lower LTV but faster sales cycle. Better for tools with infrequent use.' },
      { icon: '💳', text: 'Licensing/royalty: someone else distributes your IP. Low effort, but you lose direct customer relationships.' },
      { icon: '💳', text: 'Hybrid models can work: Notion charges per seat but also has a free tier. Match model to customer behaviour.' },
      { icon: '💳', text: 'Revenue model affects investor type: VCs love recurring SaaS; PE prefers profitable one-time services.' },
      { icon: '💳', text: 'Can you change model later? Yes, but it\'s painful. Get alignment with early customers before you switch.' },
      { icon: '💳', text: 'Annual vs monthly billing: annual increases LTV, reduces churn, and improves cash flow. Offer a discount for it.' },
    ],
    cta: { label: 'View business fundamentals infographic →', href: '/guides/concept-08-business-fundamentals.html' },
  },
  {
    id: 'biz-unit-economics',
    section: 'Business',
    label: 'Unit Economics',
    navIcon: '📉',
    color: '#c2410c', bg: '#fff7ed', border: '#fdba74',
    tagline: 'If CAC, LTV, and payback don\'t work, growth makes it worse',
    intro: 'Unit economics describe the profitability of your business at the level of a single customer. They tell you whether scaling will make you more or less profitable.',
    visual: {
      type: 'steps',
      items: [
        { icon: '👤', label: 'CAC' },
        { icon: '💰', label: 'LTV' },
        { icon: '📐', label: '3:1 LTV:CAC' },
        { icon: '⏱', label: 'Payback period' },
      ],
    },
    resources: [
      { icon: '📉', text: 'CAC (Customer Acquisition Cost): total sales + marketing spend ÷ new customers acquired in a period.' },
      { icon: '📉', text: 'LTV (Lifetime Value): average revenue per customer × gross margin × average customer lifespan.' },
      { icon: '📉', text: 'LTV:CAC ratio: should be at least 3:1. Below 1:1 means you lose money on every customer acquired.' },
      { icon: '📉', text: 'Payback period: months until a customer has paid back their acquisition cost. Under 12 months is strong.' },
      { icon: '📉', text: 'Blended vs channel CAC: calculate CAC per acquisition channel — some channels are 5× better than others.' },
      { icon: '📉', text: 'Gross margin matters: 70%+ gross margin is healthy for SaaS. Services businesses often run 30–40%.' },
      { icon: '📉', text: 'Improving LTV: better onboarding, expansion revenue (upsells), and reduced churn all compound.' },
      { icon: '📉', text: 'Reducing CAC: content marketing, word-of-mouth, and partnerships cost less than paid acquisition at scale.' },
      { icon: '📉', text: 'Cohort analysis: track groups of customers acquired in the same month to see how LTV evolves over time.' },
      { icon: '📉', text: 'Know your magic number: net new ARR ÷ prior quarter sales + marketing spend. >0.75 is efficient.' },
    ],
    cta: { label: 'View business fundamentals infographic →', href: '/guides/concept-08-business-fundamentals.html' },
  },
  {
    id: 'biz-valuation',
    section: 'Business',
    label: 'Startup Valuation',
    navIcon: '🎯',
    color: '#a21caf', bg: '#fdf4ff', border: '#f0abfc',
    tagline: 'Valuation is a negotiation — traction is your leverage',
    intro: 'Startup valuation is part art, part negotiation. At early stages it\'s mostly story and team. At later stages it\'s revenue multiples. Understanding both helps you negotiate better deals.',
    visual: {
      type: 'grid',
      items: [
        { icon: '🏷', label: 'Pre-money' },
        { icon: '💰', label: 'Post-money' },
        { icon: '📈', label: 'ARR multiple' },
        { icon: '🤝', label: 'Negotiation' },
        { icon: '📊', label: 'Comparables' },
        { icon: '🎯', label: 'Traction = leverage' },
      ],
    },
    resources: [
      { icon: '🎯', text: 'Pre-money valuation: company value before the investment goes in. Post-money = pre-money + investment amount.' },
      { icon: '🎯', text: 'Pre-revenue valuation drivers: team pedigree, market size, IP, and how convinced the investor is.' },
      { icon: '🎯', text: 'Post-revenue: typically 5–15× ARR at Series A depending on growth rate and market.' },
      { icon: '🎯', text: 'Rule of 40: revenue growth rate + profit margin. >40 is healthy. Investors use this to benchmark SaaS.' },
      { icon: '🎯', text: 'Comparable transactions: look at what similar companies raised at in the last 12 months (Crunchbase, Beauhurst).' },
      { icon: '🎯', text: 'Dilution: if you raise £500k at a £2M pre-money valuation, investors own 20% post-investment.' },
      { icon: '🎯', text: 'The best way to raise at a high valuation: have competing term sheets. Competition changes the conversation.' },
      { icon: '🎯', text: 'Valuation caps on SAFEs/convertible notes: the maximum valuation at which the note converts to equity.' },
      { icon: '🎯', text: 'Down rounds: raising at a lower valuation than the previous round. Massively damaging to morale and cap table.' },
      { icon: '🎯', text: 'Don\'t over-optimise for valuation at seed. A fair deal with a great investor beats a high val with a bad one.' },
    ],
    cta: { label: 'View business fundamentals infographic →', href: '/guides/concept-08-business-fundamentals.html' },
  },
  {
    id: 'biz-bootstrapping',
    section: 'Business',
    label: 'Bootstrapping',
    navIcon: '🌱',
    color: '#a16207', bg: '#fef9c3', border: '#fde047',
    tagline: 'Grow with your own revenue — keep 100% control',
    intro: 'Bootstrapping means building a company without external funding. It forces discipline, customer focus, and profitability from day one. It\'s the path most companies actually take.',
    visual: {
      type: 'steps',
      items: [
        { icon: '💡', label: 'Idea' },
        { icon: '💳', label: 'First revenue' },
        { icon: '🔄', label: 'Reinvest' },
        { icon: '📈', label: 'Grow profitably' },
      ],
    },
    resources: [
      { icon: '🌱', text: 'Bootstrapping = no external funding. You grow using customer revenue, savings, or loans.' },
      { icon: '🌱', text: 'Advantage: 100% equity until you choose otherwise. No board, no quarterly reporting, no investor pressure.' },
      { icon: '🌱', text: 'Customer revenue is the best validation. If they pay, you\'re solving something real.' },
      { icon: '🌱', text: 'Keep fixed costs minimal: avoid office leases, excessive headcount, and tools you don\'t need yet.' },
      { icon: '🌱', text: 'Many successful companies bootstrapped to PMF, then raised strategically (Mailchimp, Basecamp, Notion early).' },
      { icon: '🌱', text: 'Bootstrapping forces you to focus on what makes money, not what sounds impressive.' },
      { icon: '🌱', text: 'Revenue milestones: £1k/mo → £10k/mo → £100k/mo. Each is a significant proof point.' },
      { icon: '🌱', text: 'Profit-first mentality: pay yourself, tax, and operating costs before reinvesting. Prevents running out of cash.' },
      { icon: '🌱', text: 'Consultancy → product: many founders bootstrap by doing client work while building the product.' },
      { icon: '🌱', text: 'If you later raise investment, bootstrapping to PMF gives you far more leverage in valuation and terms.' },
    ],
    cta: { label: 'View business fundamentals infographic →', href: '/guides/concept-08-business-fundamentals.html' },
  },
  {
    id: 'biz-angels',
    section: 'Business',
    label: 'Angel Investing',
    navIcon: '👼',
    color: '#0e7490', bg: '#ecfeff', border: '#67e8f9',
    tagline: 'High-net-worth individuals who invest personal capital early',
    intro: 'Angels are typically ex-founders or operators who invest their own money in early-stage companies. They move faster than VCs, write smaller cheques, and the best ones bring experience money can\'t buy.',
    visual: {
      type: 'grid',
      items: [
        { icon: '💸', label: '£10k–£150k' },
        { icon: '🧠', label: 'Operator expertise' },
        { icon: '🔗', label: 'Warm intros' },
        { icon: '⚡', label: 'Fast decisions' },
        { icon: '🎯', label: 'Niche focus' },
        { icon: '📋', label: 'Less due diligence' },
      ],
    },
    resources: [
      { icon: '👼', text: 'Angels invest personal capital, typically £10k–£150k per deal. No fund structure, faster decisions.' },
      { icon: '👼', text: 'Best angels are ex-founders or operators in your domain. Their advice is worth more than their money.' },
      { icon: '👼', text: 'Find angels via: AngelList, LinkedIn, Sifted databases, YC alumni networks, Founder communities.' },
      { icon: '👼', text: 'Angel syndicates: group of angels pooling capital under one lead — one deal, many investors.' },
      { icon: '👼', text: 'What angels want: big market, strong team, early traction, and a founder they believe in personally.' },
      { icon: '👼', text: 'Angels typically take 5–15% for a seed cheque. Negotiate based on their value add, not just money.' },
      { icon: '👼', text: 'Reference check your angels: talk to other founders they\'ve backed. Do they add value post-investment?' },
      { icon: '👼', text: 'Build relationships before you need money. An angel who knows you for 6 months will move faster and invest more.' },
      { icon: '👼', text: 'SEIS/EIS in the UK: government schemes give angels 50%/30% tax relief. Makes angel investing very attractive.' },
      { icon: '👼', text: 'Dilution: giving up 10–20% at seed for the right angel + capital is usually worth it. Don\'t be too precious.' },
    ],
    cta: { label: 'View business fundamentals infographic →', href: '/guides/concept-08-business-fundamentals.html' },
  },
  {
    id: 'biz-term-sheets',
    section: 'Business',
    label: 'Term Sheets',
    navIcon: '📄',
    color: '#dc2626', bg: '#fef2f2', border: '#fca5a5',
    tagline: 'The investment document that sets every future precedent',
    intro: 'A term sheet outlines the key economic and governance terms of an investment. It\'s non-binding but sets precedent for the final legal documents. Read every clause — especially the ones that seem standard.',
    visual: {
      type: 'grid',
      items: [
        { icon: '💰', label: 'Valuation cap' },
        { icon: '🥇', label: 'Liquidation pref' },
        { icon: '🔄', label: 'Pro-rata rights' },
        { icon: '🏛', label: 'Board control' },
        { icon: '🔒', label: 'Anti-dilution' },
        { icon: '🚪', label: 'Drag-along' },
      ],
    },
    resources: [
      { icon: '📄', text: 'Valuation cap: the maximum company value at which a convertible note or SAFE converts to equity.' },
      { icon: '📄', text: 'Liquidation preference: who gets paid first in a sale. 1× non-participating is standard; 2× is aggressive.' },
      { icon: '📄', text: 'Pro-rata rights: investor\'s right to maintain their ownership % in future rounds. Protect the best angels.' },
      { icon: '📄', text: 'Anti-dilution: protects investors if you raise at a lower valuation later. Full ratchet is worst for founders.' },
      { icon: '📄', text: 'Board composition: who controls the board controls the company. Don\'t give up board control without thought.' },
      { icon: '📄', text: 'Drag-along rights: majority can force minority shareholders to agree to a sale. Know the threshold.' },
      { icon: '📄', text: 'Information rights: investors\' right to receive financials. Standard for institutional investors.' },
      { icon: '📄', text: 'Participating vs non-participating preferred: participating means investors get preference PLUS upside. Avoid it.' },
      { icon: '📄', text: 'SAFE vs convertible note vs priced round: SAFEs are simplest for early angels; priced rounds are most transparent.' },
      { icon: '📄', text: 'Always have a startup lawyer review term sheets. The £1,500 fee has saved founders tens of millions in bad deals.' },
    ],
    cta: { label: 'View business fundamentals infographic →', href: '/guides/concept-08-business-fundamentals.html' },
  },
  {
    id: 'biz-equity',
    section: 'Business',
    label: 'Stock Options & ESOPs',
    navIcon: '📋',
    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',
    tagline: 'Equity is how startups compete for talent they can\'t afford to pay',
    intro: 'Stock options give employees the right to buy shares at a fixed price in the future. Employee Share Option Plans (ESOPs) formalise this. Get the structure right early — it\'s nearly impossible to fix later.',
    visual: {
      type: 'steps',
      items: [
        { icon: '🏊', label: 'Create ESOP pool' },
        { icon: '📅', label: '4yr vesting' },
        { icon: '💼', label: 'Grant options' },
        { icon: '🚀', label: 'Exit / IPO' },
      ],
    },
    resources: [
      { icon: '📋', text: 'ESOP pool: typically 10–20% of shares reserved for employee equity. Create it at incorporation.' },
      { icon: '📋', text: 'Standard vesting: 4 years with a 1-year cliff. The cliff means nothing vests until month 12.' },
      { icon: '📋', text: 'Strike price (exercise price): the fixed price at which employees can buy shares. Set at fair market value.' },
      { icon: '📋', text: 'EMI options (UK): tax-advantaged scheme for employees. Significant tax savings on exercise and sale.' },
      { icon: '📋', text: 'Options vs shares: options give the right to buy, not actual ownership — until exercised.' },
      { icon: '📋', text: 'Cliff reasoning: it protects the company if someone leaves in the first year without contributing fully.' },
      { icon: '📋', text: 'Communicate clearly: most employees don\'t understand option value. Explain the upside scenario honestly.' },
      { icon: '📋', text: 'Refresh grants: offer additional options to high performers after 2 years to maintain retention incentive.' },
      { icon: '📋', text: 'Good leaver / bad leaver clauses: define what happens to options when someone leaves under different circumstances.' },
      { icon: '📋', text: 'Cap table tools: use Vestd, Carta, or SeedLegals to manage equity. Spreadsheets break at scale.' },
    ],
    cta: { label: 'View business fundamentals infographic →', href: '/guides/concept-08-business-fundamentals.html' },
  },
  {
    id: 'biz-cap-table',
    section: 'Business',
    label: 'Cap Tables & Equity Splits',
    navIcon: '🥧',
    color: '#0369a1', bg: '#f0f9ff', border: '#7dd3fc',
    tagline: 'Who owns what — and why it matters for every decision',
    intro: 'The capitalisation table is a record of who owns what percentage of your company. How you split equity among co-founders sets the tone for trust, decision-making, and future fundraising.',
    visual: {
      type: 'grid',
      items: [
        { icon: '👤', label: 'Founders' },
        { icon: '👼', label: 'Angels' },
        { icon: '💼', label: 'VCs' },
        { icon: '📋', label: 'ESOP pool' },
        { icon: '📉', label: 'Dilution' },
        { icon: '🧮', label: 'Fully diluted' },
      ],
    },
    resources: [
      { icon: '🥧', text: 'Cap table shows: founders, investors, ESOP pool, and any convertible notes — in % and share count.' },
      { icon: '🥧', text: 'Equal splits work when all founders are full-time from day 1 with equal commitment.' },
      { icon: '🥧', text: 'Unequal splits: reflect contribution to the idea, time invested pre-founding, and domain value.' },
      { icon: '🥧', text: 'Every funding round dilutes all existing shareholders proportionally (unless pro-rata rights exercised).' },
      { icon: '🥧', text: 'Fully diluted cap: assumes all options are exercised. Investors always calculate this way.' },
      { icon: '🥧', text: 'Avoid giving equity too early: advisors get 0.1–0.5%, not 5%. Be precise about what equity buys.' },
      { icon: '🥧', text: 'Founders should retain at least 40–50% post-seed. Below 20% by Series A is a red flag for later investors.' },
      { icon: '🥧', text: 'Dead equity: a founder who left but still owns 20% is a cap table problem that will bite you in due diligence.' },
      { icon: '🥧', text: 'Model three funding rounds now: what will you own at Series B if each round is 20% dilution? Know the number.' },
      { icon: '🥧', text: 'Use SeedLegals or Carta to model scenarios — and store your cap table there, not in a spreadsheet.' },
    ],
    cta: { label: 'View business fundamentals infographic →', href: '/guides/concept-08-business-fundamentals.html' },
  },
  {
    id: 'biz-negotiation',
    section: 'Business',
    label: 'Negotiation Skills',
    navIcon: '🤝',
    color: '#334155', bg: '#f5f5f7', border: '#cbd5e1',
    tagline: 'Every founder negotiates every day — most are underprepared',
    intro: 'Founders negotiate with investors, customers, co-founders, hires, and suppliers constantly. Negotiation is a learnable skill. A few frameworks make a disproportionate difference.',
    visual: {
      type: 'grid',
      items: [
        { icon: '🎯', label: 'Know your BATNA' },
        { icon: '⚓', label: 'Anchor first' },
        { icon: '🤫', label: 'Use silence' },
        { icon: '🔄', label: 'Create options' },
        { icon: '⚖️', label: 'Separate positions' },
        { icon: '🏆', label: 'Win-win framing' },
      ],
    },
    resources: [
      { icon: '🤝', text: 'BATNA (Best Alternative To a Negotiated Agreement): know yours before entering any discussion.' },
      { icon: '🤝', text: 'Anchor first: the first number sets the psychological range. Start higher than your floor.' },
      { icon: '🤝', text: 'Silence is a tool: after making an offer, stop talking. Discomfort with silence leads to unnecessary concessions.' },
      { icon: '🤝', text: 'Separate positions from interests: what does the other party actually need vs what they\'re asking for?' },
      { icon: '🤝', text: 'Create competition: "We\'re speaking with others" shifts power even if you have no other offers yet.' },
      { icon: '🤝', text: 'Package your concessions: never give something without getting something. Every trade has a cost.' },
      { icon: '🤝', text: 'Investor negotiation: focus on terms (board seats, pro-rata) more than valuation at early stages.' },
      { icon: '🤝', text: 'Hire negotiation: candidates expect negotiation. Starting at your max leaves no room for mutual satisfaction.' },
      { icon: '🤝', text: 'Customer negotiation: discount on price OR extend the contract length. Never just drop price unilaterally.' },
      { icon: '🤝', text: 'The "flinch": visibly reacting to a price or term signals dissatisfaction without words. Use it sparingly.' },
    ],
    cta: { label: 'View business fundamentals infographic →', href: '/guides/concept-08-business-fundamentals.html' },
  },
  {
    id: 'biz-investors',
    section: 'Business',
    label: 'Types of Investors',
    navIcon: '💼',
    color: '#a21caf', bg: '#fdf4ff', border: '#f0abfc',
    tagline: 'Not all money is the same — who you take it from shapes everything',
    intro: 'The investor landscape ranges from angels to sovereign wealth funds. Each type has different cheque sizes, timelines, value-add, and expectations. Matching the right investor to your stage is as important as valuation.',
    visual: {
      type: 'flow',
      items: [
        { icon: '👼', label: 'Angel', color: '#fdf4ff' },
        { icon: '🌱', label: 'Seed VC', color: '#f0fdf4' },
        { icon: '💼', label: 'Series A', color: '#eff6ff' },
        { icon: '🏦', label: 'Growth', color: '#fff7ed' },
        { icon: '🌐', label: 'PE/IPO', color: '#f5f3ff' },
      ],
    },
    resources: [
      { icon: '💼', text: 'Angels: personal capital, £10k–£150k, fastest to close. Best for pre-revenue or very early traction.' },
      { icon: '💼', text: 'Micro VCs / seed funds: £100k–£2M, early institutional, may take board observer seat.' },
      { icon: '💼', text: 'Series A VCs: £2M–£10M+, require PMF evidence, board seat, quarterly reporting.' },
      { icon: '💼', text: 'Growth equity: £10M+, want proven model and predictable revenue. Less involved operationally.' },
      { icon: '💼', text: 'Accelerators (YC, Techstars, Antler): small cheque + network + program. Huge on validation and warm intros.' },
      { icon: '💼', text: 'Corporate VCs: strategic fit matters as much as financial return. Can open enterprise doors.' },
      { icon: '💼', text: 'Government grants (Innovate UK, SBIR): non-dilutive capital. Slow but no equity given away.' },
      { icon: '💼', text: 'Crowdfunding (Seedrs, Crowdcube): good for B2C with an audience. Creates many small shareholders to manage.' },
      { icon: '💼', text: 'Revenue-based financing: non-dilutive capital against future revenue. Suits profitable bootstrapped companies.' },
      { icon: '💼', text: 'Match your stage to investor type. Approaching a growth VC at pre-revenue wastes everyone\'s time.' },
    ],
    cta: { label: 'View business fundamentals infographic →', href: '/guides/concept-08-business-fundamentals.html' },
  },
  {
    id: 'biz-legal',
    section: 'Business',
    label: 'Legal Basics for Startups',
    navIcon: '⚖️',
    color: '#a16207', bg: '#fef9c3', border: '#fde047',
    tagline: 'Wrong legal structure or missed IP protection kills deals',
    intro: 'Legal mistakes at founding are expensive to fix later — if fixable at all. The basics take one day and a few hundred pounds. Skipping them can cost millions.',
    visual: {
      type: 'grid',
      items: [
        { icon: '🏢', label: 'Incorporation' },
        { icon: '🔒', label: 'IP assignment' },
        { icon: '📑', label: 'Founder vesting' },
        { icon: '🔏', label: 'NDAs' },
        { icon: '📜', label: 'Employment law' },
        { icon: '🛡', label: 'GDPR/Privacy' },
      ],
    },
    resources: [
      { icon: '⚖️', text: 'Incorporate early: Ltd (UK) or C-Corp (US) gives personal liability protection from day 1.' },
      { icon: '⚖️', text: 'IP assignment agreement: all code, designs, and IP created by anyone must be formally assigned to the company.' },
      { icon: '⚖️', text: 'Founder vesting: even if you fully trust your co-founders, get vesting agreements signed. It protects everyone.' },
      { icon: '⚖️', text: 'Shareholders\' agreement: defines how decisions are made, what happens if a founder leaves, and exit rights.' },
      { icon: '⚖️', text: 'Employee vs contractor: misclassification is expensive. Know the difference before hiring.' },
      { icon: '⚖️', text: 'Privacy policy and GDPR: if you collect user data in the EU/UK, you must comply. Non-negotiable.' },
      { icon: '⚖️', text: 'Terms of service: sets out your product\'s usage rules, limitations of liability, and dispute resolution.' },
      { icon: '⚖️', text: 'NDAs have limited value early on — don\'t burn relationships asking investors to sign them before a pitch.' },
      { icon: '⚖️', text: 'Use standard documents: YC SAFE, SeedLegals standard docs, or Founders\' Agreement templates are battle-tested.' },
      { icon: '⚖️', text: 'Spend £500–£1,500 on startup legal advice at incorporation. It prevents £50,000 of cleanup later.' },
    ],
    cta: { label: 'View business fundamentals infographic →', href: '/guides/concept-08-business-fundamentals.html' },
  },
  {
    id: 'biz-gtm',
    section: 'Business',
    label: 'Go-to-Market Strategy',
    navIcon: '🚀',
    color: '#065f46', bg: '#ecfdf5', border: '#6ee7b7',
    tagline: 'Who buys it, how you reach them, what you say to make them care',
    intro: 'A go-to-market strategy defines how you take your product to the people who need it. Great products with poor GTM die. Mediocre products with sharp GTM win. It\'s a strategic priority, not a marketing afterthought.',
    visual: {
      type: 'steps',
      items: [
        { icon: '🎯', label: 'Define ICP' },
        { icon: '📣', label: 'Pick channel' },
        { icon: '💬', label: 'Craft message' },
        { icon: '🚀', label: 'Launch' },
        { icon: '📊', label: 'Iterate' },
      ],
    },
    resources: [
      { icon: '🚀', text: 'ICP (Ideal Customer Profile): name the exact company type, role, team size, industry, and pain they feel.' },
      { icon: '🚀', text: 'Buyer vs user: know who signs the purchase order vs who uses the product daily. They need different messages.' },
      { icon: '🚀', text: 'Pick one primary channel and go deep before adding a second. Channel dilution kills early GTM.' },
      { icon: '🚀', text: 'Outbound: works for high-ACV, well-defined ICP. Email + LinkedIn + phone in sequence.' },
      { icon: '🚀', text: 'Inbound: content, SEO, community. Slower to start but compounds and reduces CAC over time.' },
      { icon: '🚀', text: 'Product-led growth (PLG): the product itself drives acquisition — free tier, virality, sharing. Slack, Notion, Figma.' },
      { icon: '🚀', text: 'Messaging: lead with the customer\'s problem, not your product\'s features. "We help X do Y" beats "We are Z."' },
      { icon: '🚀', text: 'Sales motion: is this self-serve or assisted? Low-ACV (<£500/yr) almost always needs to be self-serve.' },
      { icon: '🚀', text: 'GTM fit check: are conversion rates improving each month? Flat or declining = wrong channel or message.' },
      { icon: '🚀', text: 'Partnerships can accelerate GTM: integrations, resellers, or co-marketing with non-competing products your ICP already uses.' },
    ],
    cta: { label: 'View business fundamentals infographic →', href: '/guides/concept-08-business-fundamentals.html' },
  },
  {
    id: 'biz-growth-hacking',
    section: 'Business',
    label: 'Growth Hacking',
    navIcon: '⚡',
    color: '#15803d', bg: '#f0fdf4', border: '#86efac',
    tagline: 'Systematic, low-cost experimentation to find what scales',
    intro: 'Growth hacking is a mindset: every growth lever is a hypothesis to test, and the goal is to find the repeatable, scalable ones as fast as possible. It\'s data-driven, not creative guesswork.',
    visual: {
      type: 'flow',
      items: [
        { icon: '🧪', label: 'Hypothesise', color: '#f0fdf4' },
        { icon: '⚡', label: 'Experiment', color: '#eff6ff' },
        { icon: '📊', label: 'Measure', color: '#fef9c3' },
        { icon: '🔁', label: 'Scale or kill', color: '#fff7ed' },
      ],
    },
    resources: [
      { icon: '⚡', text: 'AARRR funnel: Acquisition → Activation → Retention → Referral → Revenue. Identify your biggest leak first.' },
      { icon: '⚡', text: 'Run 10 experiments per month. 9 will fail. 1 will move the needle. That\'s how the math works.' },
      { icon: '⚡', text: 'Activation is underrated: what does a user need to do in the first 5 minutes to become a retained user?' },
      { icon: '⚡', text: 'Viral coefficient: if each user brings in 1.1 new users on average, you have viral growth. Below 1 = no virality.' },
      { icon: '⚡', text: 'Referral mechanics: Dropbox gave extra storage for referrals. Simple, measurable, and aligned with product value.' },
      { icon: '⚡', text: 'Email sequences: automated onboarding emails in the first 14 days double activation rates for most SaaS products.' },
      { icon: '⚡', text: 'A/B testing: never redesign your entire landing page. Change one element at a time and measure the impact.' },
      { icon: '⚡', text: 'Community-led growth: a community creates lock-in, referrals, and feedback loops that marketing can\'t buy.' },
      { icon: '⚡', text: 'Scarcity and social proof: waitlists, "X users joined this week," and logos of known customers accelerate conversion.' },
      { icon: '⚡', text: 'Fix retention first: a leaky bucket filled faster empties faster. Growth amplifies your existing dynamics.' },
    ],
    cta: { label: 'View business fundamentals infographic →', href: '/guides/concept-08-business-fundamentals.html' },
  },
  {
    id: 'biz-pivoting',
    section: 'Business',
    label: 'Pivoting',
    navIcon: '🔄',
    color: '#c2410c', bg: '#fff7ed', border: '#fdba74',
    tagline: 'A strategic change of direction — not quitting when things are hard',
    intro: 'Pivoting means changing your strategy while retaining your learning and mission. The best pivots aren\'t random — they\'re based on specific evidence that the current approach won\'t work.',
    visual: {
      type: 'grid',
      items: [
        { icon: '👥', label: 'Customer pivot' },
        { icon: '🎯', label: 'Problem pivot' },
        { icon: '💻', label: 'Tech pivot' },
        { icon: '📈', label: 'Channel pivot' },
        { icon: '💰', label: 'Revenue pivot' },
        { icon: '🔮', label: 'Platform pivot' },
      ],
    },
    resources: [
      { icon: '🔄', text: 'A pivot is a structured course correction based on evidence — not an emotional response to difficulty.' },
      { icon: '🔄', text: 'Customer pivot: same product, different buyer. Instagram started as Burbn, a check-in app for different users.' },
      { icon: '🔄', text: 'Problem pivot: same customer, different pain point. Use what you know about them to solve a bigger problem.' },
      { icon: '🔄', text: 'Technology pivot: your tech solves a different problem than you originally planned for. Lean into it.' },
      { icon: '🔄', text: 'Channel pivot: same product, different distribution. Direct sales vs. self-serve vs. channel partners.' },
      { icon: '🔄', text: 'When to pivot: retention is flat after 6 months of iteration, customer feedback is consistently off-target.' },
      { icon: '🔄', text: 'When NOT to pivot: when you\'re three months in and it\'s just hard. Hard ≠ wrong direction.' },
      { icon: '🔄', text: 'The evidence test: can you articulate specifically what you learned that makes the new direction more compelling?' },
      { icon: '🔄', text: 'Communicate with investors early: a well-explained pivot builds trust. A surprise pivot erodes it.' },
      { icon: '🔄', text: 'Preserve learning: the customer insights, relationships, and architecture from v1 are assets in the pivot.' },
    ],
    cta: { label: 'View business fundamentals infographic →', href: '/guides/concept-08-business-fundamentals.html' },
  },
  {
    id: 'biz-roadmap',
    section: 'Business',
    label: 'Product Roadmap',
    navIcon: '🗺',
    color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe',
    tagline: 'A prioritised set of bets tied to business outcomes',
    intro: 'A product roadmap is not a list of features — it\'s a series of strategic bets, each tied to a measurable outcome. It should say as much about what you\'re NOT building as what you are.',
    visual: {
      type: 'flow',
      items: [
        { icon: '🎯', label: 'Now', color: '#fef2f2' },
        { icon: '🔭', label: 'Next', color: '#fffbeb' },
        { icon: '🌅', label: 'Later', color: '#f0fdf4' },
        { icon: '🚫', label: 'Never', color: '#f5f5f7' },
      ],
    },
    resources: [
      { icon: '🗺', text: 'Now / Next / Later framework: avoids over-committing to timelines and keeps the team focused on today.' },
      { icon: '🗺', text: 'Every roadmap item needs: an expected outcome, an owner, and the evidence that justifies prioritising it.' },
      { icon: '🗺', text: 'Problems vs solutions: roadmaps should describe the problem to solve, not the feature to build.' },
      { icon: '🗺', text: 'Ruthless prioritisation: the RICE framework — Reach × Impact × Confidence ÷ Effort. Score everything.' },
      { icon: '🗺', text: 'Say no to 80% of feature requests. Every feature has a maintenance cost even if its development is free.' },
      { icon: '🗺', text: 'Dead features: remove functionality that\'s unused. Complexity is the enemy of quality.' },
      { icon: '🗺', text: 'Customer-facing roadmap vs internal: share themes and outcomes publicly, not specific timelines you can\'t control.' },
      { icon: '🗺', text: 'Review the roadmap monthly. Markets and user needs change — a 12-month plan is usually wrong by month 3.' },
      { icon: '🗺', text: 'Align roadmap with GTM: build what helps sales convert and retain customers, not what is technically interesting.' },
      { icon: '🗺', text: 'Roadmap discipline signals maturity to investors. Founders who chase every feature request terrify Series A investors.' },
    ],
    cta: { label: 'View business fundamentals infographic →', href: '/guides/concept-08-business-fundamentals.html' },
  },
  {
    id: 'biz-moats',
    section: 'Business',
    label: 'Competitive Moats',
    navIcon: '🏰',
    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',
    tagline: 'A durable advantage that makes it harder for competitors to copy you',
    intro: 'Every startup faces competitors eventually. A moat is what makes you hard to displace. Without one, a larger company with more resources will eventually out-execute you on the same product.',
    visual: {
      type: 'grid',
      items: [
        { icon: '🔗', label: 'Network effects' },
        { icon: '🗄', label: 'Data moat' },
        { icon: '🔒', label: 'Switching costs' },
        { icon: '⚙️', label: 'Tech advantage' },
        { icon: '🏷', label: 'Brand' },
        { icon: '📜', label: 'Regulatory' },
      ],
    },
    resources: [
      { icon: '🏰', text: 'Network effects: the product gets more valuable as more people use it. LinkedIn, Slack, Uber — classic moats.' },
      { icon: '🏰', text: 'Data moat: proprietary data that improves your model with usage. Hard to replicate without time and users.' },
      { icon: '🏰', text: 'Switching costs: deep integrations, data migration friction, or workflow lock-in that makes leaving painful.' },
      { icon: '🏰', text: 'Economies of scale: lower unit cost at higher volume. Important in hardware, logistics, and cloud infrastructure.' },
      { icon: '🏰', text: 'Brand: perception of quality, trust, or belonging. Harder to build but compounds faster than features.' },
      { icon: '🏰', text: 'Community: an active user community creates lock-in, advocacy, and UGC that competitors can\'t replicate.' },
      { icon: '🏰', text: 'Regulatory moats: licences, patents, or compliance costs that create high barriers to entry.' },
      { icon: '🏰', text: 'Most early-stage startups don\'t have a moat yet — and that\'s fine. But articulate how you will build one.' },
      { icon: '🏰', text: 'Beware of "we\'re first mover" as a moat. First mover is only a moat if you entrench switching costs.' },
      { icon: '🏰', text: 'Moat building starts with customers. Every integration, data point, and relationship is a brick.' },
    ],
    cta: { label: 'View business fundamentals infographic →', href: '/guides/concept-08-business-fundamentals.html' },
  },
  {
    id: 'biz-exit',
    section: 'Business',
    label: 'Exit Strategies',
    navIcon: '🏁',
    color: '#0e7490', bg: '#ecfeff', border: '#67e8f9',
    tagline: 'Investors need an exit — understand the paths before you sign',
    intro: 'An exit is how investors (and founders) realise the value they\'ve built. Understanding exit mechanics upfront helps you build the right company for the outcome you want.',
    visual: {
      type: 'grid',
      items: [
        { icon: '🤝', label: 'Acquisition' },
        { icon: '📈', label: 'IPO' },
        { icon: '💰', label: 'Secondary sale' },
        { icon: '🔄', label: 'MBO' },
        { icon: '🌱', label: 'Merger' },
        { icon: '🏪', label: 'Asset sale' },
      ],
    },
    resources: [
      { icon: '🏁', text: 'Acquisition: the most common exit. A larger company buys you for team, tech, customers, or revenue.' },
      { icon: '🏁', text: 'IPO: public listing on a stock exchange. Requires scale, a clear path to profitability, and 2+ years of preparation.' },
      { icon: '🏁', text: 'Secondary sale: founders or early investors sell shares to a later-stage investor. Provides liquidity without an exit.' },
      { icon: '🏁', text: 'Management buyout (MBO): management team buys out investors. Common in bootstrapped companies.' },
      { icon: '🏁', text: 'Strategic vs financial acquirers: strategic buyers pay more but want integration. Financial (PE) wants cashflow.' },
      { icon: '🏁', text: 'Acqui-hire: company is bought primarily for the team, not the product. Common in early-stage AI/engineering.' },
      { icon: '🏁', text: 'Build relationships with potential acquirers 2–3 years before you\'re ready. M&A is a relationship business.' },
      { icon: '🏁', text: 'Liquidation preference: in a sub-optimal exit, investors get paid before founders. Know your waterfall.' },
      { icon: '🏁', text: 'Acquirer due diligence checklist: clean cap table, assigned IP, employment contracts, audited financials.' },
      { icon: '🏁', text: 'Founder lock-up: most acquisitions require founders to stay for 1–3 years post-acquisition. Negotiate this.' },
    ],
    cta: { label: 'View business fundamentals infographic →', href: '/guides/concept-08-business-fundamentals.html' },
  },
  {
    id: 'biz-conflict',
    section: 'Business',
    label: 'Conflict Resolution',
    navIcon: '🤜',
    color: '#be185d', bg: '#fdf2f8', border: '#f9a8d4',
    tagline: 'Co-founder conflict is the #2 startup killer — resolve it early',
    intro: 'Most founder disputes aren\'t about disagreement on strategy — they\'re about unspoken expectations that were never aligned. The solution isn\'t conflict avoidance; it\'s structured, early, honest communication.',
    visual: {
      type: 'steps',
      items: [
        { icon: '📌', label: 'Name the issue' },
        { icon: '🗣', label: 'Separate people/positions' },
        { icon: '🤝', label: 'Find shared interest' },
        { icon: '✅', label: 'Write it down' },
      ],
    },
    resources: [
      { icon: '🤜', text: 'Name the issue early. Unacknowledged conflict compounds like debt — and it always surfaces at the worst moment.' },
      { icon: '🤜', text: 'Separate people from positions: ask "what do you actually need?" not "why are you being unreasonable?"' },
      { icon: '🤜', text: 'Most disputes are about: roles, equity, effort level, decision rights, or strategic direction. Identify which.' },
      { icon: '🤜', text: 'Document roles and decision rights at incorporation, before any conflict exists. Clarity prevents 80% of disputes.' },
      { icon: '🤜', text: 'Bring a neutral third party for equity disputes: an advisor, lawyer, or mediator who doesn\'t have a stake.' },
      { icon: '🤜', text: 'Structured co-founder check-in: a monthly 30-minute honest conversation prevents annual blowups.' },
      { icon: '🤜', text: 'Investor conflicts: your lead investor can sometimes mediate, but their interests aren\'t perfectly aligned with yours.' },
      { icon: '🤜', text: 'Divorce clause: co-founders should have a pre-agreed exit mechanism. How does someone leave fairly?' },
      { icon: '🤜', text: 'Performance issues: address them like you would with any senior hire. Clear expectations, honest feedback, timeline.' },
      { icon: '🤜', text: 'If it\'s not fixable: a clean, fair separation is better than a destructive partnership. Get legal advice early.' },
    ],
    cta: { label: 'View business fundamentals infographic →', href: '/guides/concept-08-business-fundamentals.html' },
  },
  {
    id: 'biz-mental-health',
    section: 'Business',
    label: 'Founder Mental Health',
    navIcon: '🧠',
    color: '#c2410c', bg: '#fff7ed', border: '#fdba74',
    tagline: 'Sustainability is a strategy — burnout is a threat to the company',
    intro: 'Founders face loneliness, pressure, and uncertainty at a level few other roles match. Mental health isn\'t a soft topic — it\'s a business risk. The companies that last longest have founders who manage themselves as a resource.',
    visual: {
      type: 'grid',
      items: [
        { icon: '👥', label: 'Peer support' },
        { icon: '🔋', label: 'Recovery time' },
        { icon: '🧘', label: 'Separate identity' },
        { icon: '🗓', label: 'Structured routines' },
        { icon: '🗣', label: 'Talk about it' },
        { icon: '🎯', label: 'Reframe failure' },
      ],
    },
    resources: [
      { icon: '🧠', text: 'Separate self-worth from company performance. The company is something you\'re building — it\'s not who you are.' },
      { icon: '🧠', text: 'Build a peer group of other founders. They understand the specific loneliness that investors, family, and friends cannot.' },
      { icon: '🧠', text: 'Protect recovery time. Burnout doesn\'t announce itself — it accumulates silently until you stop functioning.' },
      { icon: '🧠', text: 'Structured routines: sleep, exercise, and time away from screens are founder performance tools, not luxuries.' },
      { icon: '🧠', text: 'Reframe failure: every failed experiment is compressed learning. That\'s the job. It\'s not a personal verdict.' },
      { icon: '🧠', text: 'Be honest with your co-founder and board. Hiding that you\'re struggling compounds the isolation.' },
      { icon: '🧠', text: 'Loneliness at the top is normal. CEO grief — the inability to share doubts with the team — is a real and named experience.' },
      { icon: '🧠', text: 'Therapy or coaching: not a sign of weakness. The best investors now expect founders to invest in their own development.' },
      { icon: '🧠', text: 'Watch for warning signs in your co-founder too: irritability, withdrawal, or erratic decisions often precede a breakdown.' },
      { icon: '🧠', text: 'The companies with the longest runway are built by founders who treat their own sustainability as a strategic priority.' },
    ],
    cta: { label: 'View business fundamentals infographic →', href: '/guides/concept-08-business-fundamentals.html' },
  },

  // ── CONCEPTS ────────────────────────────────────────────────────────────────
  {
    id: 'bmc',
    section: 'Concepts',
    label: 'Business Model Canvas',
    navIcon: '🗂',
    color: '#4338ca', bg: '#eef2ff', border: '#c7d2fe',
    tagline: 'One page that maps your entire business',
    intro: 'The Business Model Canvas (BMC) is a single-page visual tool with 9 blocks that captures how your business creates, delivers, and captures value. It replaces a 30-page business plan.',
    visual: {
      type: 'grid',
      items: [
        { icon: '🤝', label: 'Key Partners' },
        { icon: '⚙️', label: 'Key Activities' },
        { icon: '⭐', label: 'Value Proposition' },
        { icon: '💬', label: 'Relationships' },
        { icon: '🎯', label: 'Customer Segments' },
        { icon: '🏗', label: 'Key Resources' },
        { icon: '📣', label: 'Channels' },
        { icon: '💸', label: 'Cost Structure' },
        { icon: '💰', label: 'Revenue Streams' },
      ],
    },
    resources: [
      { icon: '📌', text: 'Start with Customer Segments — who exactly are you serving? Name them specifically.' },
      { icon: '📌', text: 'Define your Value Proposition — what problem do you solve better than alternatives?' },
      { icon: '📌', text: 'Channels describe how customers find and receive your product (web, sales, referral).' },
      { icon: '📌', text: 'Customer Relationships describe how you get, keep, and grow customers (self-serve, personal, community).' },
      { icon: '📌', text: 'Revenue Streams are how you make money — subscription, one-time fee, usage-based, or freemium.' },
      { icon: '📌', text: 'Key Activities are what you do every day to deliver your value proposition.' },
      { icon: '📌', text: 'Key Resources are the assets you absolutely need — people, technology, IP, cash.' },
      { icon: '📌', text: 'Key Partners are who you work with to operate — suppliers, outsource partners, alliances.' },
      { icon: '📌', text: 'Cost Structure is what it costs to run the business: fixed costs, variable costs, biggest expenses.' },
      { icon: '📌', text: 'The BMC test: can a stranger understand your entire business in 60 seconds by reading it?' },
    ],
    cta: { label: 'View full BMC explainer →', href: '/guides/concept-01-bmc.html' },
  },
  {
    id: 'top10',
    section: 'Concepts',
    label: 'Top 10 Must-Dos',
    navIcon: '📋',
    color: '#d97706', bg: '#fffbeb', border: '#fde68a',
    tagline: '10 actions every early founder must take',
    intro: 'These are the 10 highest-leverage actions for an early-stage founder. Founders who do all 10 dramatically increase their odds of building something real. Most founders skip at least 3.',
    visual: {
      type: 'steps',
      items: [
        { icon: '🧠', label: 'Think' },
        { icon: '🗣', label: 'Talk' },
        { icon: '📐', label: 'Plan' },
        { icon: '🔨', label: 'Build' },
        { icon: '📈', label: 'Grow' },
      ],
    },
    resources: [
      { icon: '1️⃣', text: 'Write your problem statement in one sentence before doing anything else.' },
      { icon: '2️⃣', text: 'Talk to 10 strangers who have the problem — not friends, not family.' },
      { icon: '3️⃣', text: 'Record every interview (with permission) and review the transcripts.' },
      { icon: '4️⃣', text: 'Define your target customer so precisely you could describe them to a stranger.' },
      { icon: '5️⃣', text: 'Complete a Business Model Canvas before writing any code.' },
      { icon: '6️⃣', text: 'Try to pre-sell your solution before building it — even just an intent to pay.' },
      { icon: '7️⃣', text: 'Set a hard deadline for your MVP — 4 weeks maximum for a v1.' },
      { icon: '8️⃣', text: 'Launch to your first 10 users personally — hand-pick and onboard each one.' },
      { icon: '9️⃣', text: 'Ask every user "what would make you stop using this?" and take the answer seriously.' },
      { icon: '🔟', text: 'Join a community of founders — accountability is the most underrated startup tool.' },
    ],
    cta: { label: 'View full top 10 guide →', href: '/guides/concept-02-top10.html' },
  },
  {
    id: 'validation',
    section: 'Concepts',
    label: 'How to Validate',
    navIcon: '✅',
    color: '#059669', bg: '#f0fdf4', border: '#86efac',
    tagline: 'Find out if people will pay — before you build',
    intro: 'Validation is the process of proving your idea solves a real problem that real people will pay to fix. It happens before you write code. Most founders skip it. Most founders fail.',
    visual: {
      type: 'steps',
      items: [
        { icon: '🎯', label: 'Define problem' },
        { icon: '🔍', label: 'Find people' },
        { icon: '📋', label: 'Interview' },
        { icon: '📊', label: 'Spot signal' },
        { icon: '🚦', label: 'Decide' },
      ],
    },
    resources: [
      { icon: '✅', text: 'Write your problem statement before any interviews — vague problems get vague answers.' },
      { icon: '✅', text: 'Find 5–10 strangers who match your ideal customer — not friends, not people who know you.' },
      { icon: '✅', text: 'Reach out via Reddit, LinkedIn, Facebook groups, or Slack communities in your niche.' },
      { icon: '✅', text: 'Never mention your solution until the last 5 minutes of the interview.' },
      { icon: '✅', text: 'Ask: "Tell me about the last time you experienced this problem. What happened?"' },
      { icon: '✅', text: 'Ask: "How do you deal with it today? What tools or workarounds do you use?"' },
      { icon: '✅', text: 'Ask: "How much does this cost you — in time, money, or stress — per month?"' },
      { icon: '✅', text: 'Real signal: "I\'ve already tried to solve this myself" or "I\'d pay for this without hesitation."' },
      { icon: '✅', text: 'Noise: "Yeah that sounds like a good idea" or "My friend would definitely want this."' },
      { icon: '✅', text: 'After 10 interviews: if 3+ people confirmed the pain and 2+ said they\'d pay — you\'re validated.' },
    ],
    cta: { label: 'View full validation guide →', href: '/guides/concept-03-validation.html' },
  },
  {
    id: 'mistakes',
    section: 'Concepts',
    label: 'Founder Mistakes',
    navIcon: '⚠️',
    color: '#dc2626', bg: '#fef2f2', border: '#fca5a5',
    tagline: '8 predictable mistakes that kill startups',
    intro: 'Startups don\'t fail from bad luck. They fail from predictable, avoidable mistakes. 90% of startups fail — and most of the reasons come down to the same 8 traps founders walk into.',
    visual: {
      type: 'grid',
      items: [
        { icon: '💻', label: 'Build before talking' },
        { icon: '🌍', label: 'Target everyone' },
        { icon: '🏗', label: 'Over-engineer MVP' },
        { icon: '🤫', label: 'Keep idea secret' },
        { icon: '💰', label: 'Delay charging' },
        { icon: '👤', label: 'Go it alone' },
        { icon: '📊', label: 'Activity ≠ progress' },
        { icon: '🔄', label: 'Pivot too fast/slow' },
      ],
    },
    resources: [
      { icon: '🚩', text: 'Mistake #1: Building before talking to customers — spend 6+ months building what nobody needs.' },
      { icon: '🚩', text: 'Mistake #2: Targeting everyone — "anyone with a phone could use this" targets no one.' },
      { icon: '🚩', text: 'Mistake #3: Over-engineering the MVP — adding features before validating the core.' },
      { icon: '🚩', text: 'Mistake #4: Keeping the idea secret — secrecy costs you feedback, network, and early adopters.' },
      { icon: '🚩', text: 'Mistake #5: Waiting to charge money — free users don\'t validate a business. Paying users do.' },
      { icon: '🚩', text: 'Mistake #6: No support structure — going solo without advisors, community, or accountability.' },
      { icon: '🚩', text: 'Mistake #7: Confusing activity with progress — attending events ≠ getting closer to revenue.' },
      { icon: '🚩', text: 'Mistake #8: Pivoting too fast or not at all — both extremes destroy startups at different speeds.' },
      { icon: '✅', text: 'Fix: talk first, build second — understanding beats assumption every time.' },
      { icon: '✅', text: 'Fix: ship embarrassingly early — if you\'re not embarrassed by v1, you waited too long.' },
    ],
    cta: { label: 'View full mistakes guide →', href: '/guides/concept-04-mistakes.html' },
  },
  {
    id: 'playbook',
    section: 'Concepts',
    label: "Founder's Playbook",
    navIcon: '📖',
    color: '#4338ca', bg: '#eef2ff', border: '#c7d2fe',
    tagline: '6 stages · 10 principles · 1 formula',
    intro: "A complete operating system for tech startup founders. Six stages from problem validation to intentional scaling, ten principles that successful founders follow consistently, and one formula that ties it all together. Original content — no fluff, no theory.",
    visual: {
      type: 'flow',
      items: [
        { icon: '🚀', label: 'Validate', color: '#fdf4ff' },
        { icon: '🛠', label: 'MVP', color: '#eff6ff' },
        { icon: '👥', label: 'Customers', color: '#f0fdf4' },
        { icon: '💰', label: 'Business', color: '#fffbeb' },
        { icon: '🤝', label: 'Team', color: '#f0f9ff' },
        { icon: '📈', label: 'Scale', color: '#fdf2f8' },
      ],
    },
    resources: [
      { icon: '🚀', text: 'Stage 1 — Validate: interview 20–50 target users before writing a single line of code.' },
      { icon: '🛠', text: 'Stage 2 — MVP: build only essential features. Exclude nice-to-haves, complex integrations, advanced customisation.' },
      { icon: '👥', text: 'Stage 3 — First customers: early acquisition is manual. Outreach → conversation → demo → trial → customer.' },
      { icon: '💰', text: 'Stage 4 — Sustainable business: track MRR, retention, CAC, LTV, and activation rate. No vanity metrics.' },
      { icon: '🤝', text: 'Stage 5 — Team: hire for learning speed, ownership, and mission alignment. Never hire faster than you can onboard.' },
      { icon: '📈', text: 'Stage 6 — Scale: PMF first → repeatable sales → documented processes → team expansion → then scale.' },
      { icon: '🔑', text: 'Principle 3: Launch before it feels comfortable. Perfection ships nothing.' },
      { icon: '🔑', text: 'Principle 5: Retention comes before growth. Fix the leaky bucket before filling it faster.' },
      { icon: '🔑', text: 'Principle 6: Cash is strategic oxygen. Protect it until revenue is predictable.' },
      { icon: '🔑', text: 'The formula: Customer Problem + Rapid Learning + Focused Execution + Financial Discipline = Startup Growth.' },
    ],
    cta: { label: 'View full playbook →', href: '/guides/concept-06-playbook.html' },
  },
  {
    id: 'startup',
    section: 'Concepts',
    label: 'How to Start a Startup',
    navIcon: '🏗',
    color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe',
    tagline: 'Zero to first customer in 90 days',
    intro: 'Starting a startup isn\'t complicated — it\'s just hard. There\'s a clear path from zero to your first paying customer. Most founders overthink it. This breaks it into 5 phases.',
    visual: {
      type: 'flow',
      items: [
        { icon: '🧠', label: 'Think', color: '#fdf4ff' },
        { icon: '🗣', label: 'Talk', color: '#eff6ff' },
        { icon: '📐', label: 'Plan', color: '#fff7ed' },
        { icon: '🔨', label: 'Build', color: '#f0fdf4' },
        { icon: '🏆', label: 'Get paid', color: '#fef9c3' },
      ],
    },
    resources: [
      { icon: '📍', text: 'Phase 1 — Think (week 1–2): write down 3 problems you\'ve faced with no good solution.' },
      { icon: '📍', text: 'Phase 1: define your target customer in a single sentence before doing anything else.' },
      { icon: '📍', text: 'Phase 2 — Talk (week 3–4): run 10 customer discovery interviews with strangers.' },
      { icon: '📍', text: 'Phase 2: after 10 interviews, identify the one pattern that keeps coming up.' },
      { icon: '📍', text: 'Phase 3 — Plan (week 5–6): write 3 MVP features, then cross out all but 1.' },
      { icon: '📍', text: 'Phase 3: decide your pricing model and try to get 3 people to pre-pay before building.' },
      { icon: '📍', text: 'Phase 4 — Build (week 7–10): set a hard 4-week deadline and ship something real.' },
      { icon: '📍', text: 'Phase 4: launch to your 10 discovery interviews first — they already know the problem.' },
      { icon: '📍', text: 'Phase 5 — Get paid (week 11–12): ask every user to pay; even £1 is real validation.' },
      { icon: '📍', text: 'The only thing separating successful founders: they ship when others keep planning.' },
    ],
    cta: { label: 'View full startup guide →', href: '/guides/concept-05-startup.html' },
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function MiniInfographic({ guide }: { guide: GuideContent }) {
  const { visual, color, bg, border } = guide;

  if (visual.type === 'steps') {
    return (
      <div style={{ display: 'flex', gap: 0, alignItems: 'center' }}>
        {visual.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              background: bg, border: `1.5px solid ${border}`, borderRadius: 14,
              padding: '14px 16px', minWidth: 80,
            }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1d1d1f', textAlign: 'center', lineHeight: 1.3 }}>{item.label}</span>
            </div>
            {i < visual.items.length - 1 && (
              <div style={{ padding: '0 6px', color, fontWeight: 900, fontSize: 16 }}>→</div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (visual.type === 'flow') {
    return (
      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
        {visual.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              background: item.color ?? bg, border: `1.5px solid ${border}`,
              borderRadius: 14, padding: '14px 18px', minWidth: 90,
            }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#1d1d1f', textAlign: 'center' }}>{item.label}</span>
            </div>
            {i < visual.items.length - 1 && (
              <div style={{ padding: '0 4px', color: '#d1d5db', fontWeight: 900, fontSize: 14 }}>▶</div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // grid
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%' }}>
      {visual.items.map((item, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: bg, border: `1.5px solid ${border}`, borderRadius: 10, padding: '10px 12px',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.3 }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Full-screen Infographic Modal ───────────────────────────────────────────

function StickMan({ color = '#6366f1', label = '', scale = 1 }: { color?: string; label?: string; scale?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={60 * scale} height={90 * scale} viewBox="0 0 60 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Head */}
        <circle cx="30" cy="14" r="12" fill={color} opacity="0.15" stroke={color} strokeWidth="2.5" />
        <circle cx="25" cy="11" r="1.8" fill={color} />
        <circle cx="35" cy="11" r="1.8" fill={color} />
        <path d="M24 17 Q30 22 36 17" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* Body */}
        <line x1="30" y1="26" x2="30" y2="58" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        {/* Arms */}
        <path d="M30 36 Q18 28 12 34" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M30 36 Q42 28 48 34" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Legs */}
        <path d="M30 58 Q22 72 16 80" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M30 58 Q38 72 44 80" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </svg>
      {label && (
        <span style={{ fontSize: 12, fontWeight: 700, color, textAlign: 'center', maxWidth: 80, lineHeight: 1.3 }}>
          {label}
        </span>
      )}
    </div>
  );
}

// ─── Custom contextual infographics ──────────────────────────────────────────

function ConcentricCircles({ guide }: { guide: GuideContent }) {
  // TAM / SAM / SOM
  const rings = [
    { r: 160, label: 'TAM', sub: 'Total Addressable Market', color: '#bfdbfe', text: '#1d4ed8' },
    { r: 110, label: 'SAM', sub: 'Serviceable Addressable Market', color: '#6366f1', text: '#fff' },
    { r: 64,  label: 'SOM', sub: 'Serviceable Obtainable Market', color: '#1d4ed8', text: '#fff' },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:32 }}>
      <svg viewBox="0 0 360 340" width="100%" style={{ maxWidth:400 }}>
        {rings.map((ring, i) => (
          <g key={i}>
            <circle cx="180" cy="170" r={ring.r} fill={ring.color} opacity={i === 0 ? 0.35 : 1}
              stroke={ring.text === '#fff' ? 'rgba(255,255,255,0.3)' : ring.color} strokeWidth="2" />
            <text x="180" y={170 - ring.r + 28} textAnchor="middle"
              fontSize={i === 0 ? 15 : 16} fontWeight="800" fill={ring.text} fontFamily="system-ui">
              {ring.label}
            </text>
            <text x="180" y={170 - ring.r + 46} textAnchor="middle"
              fontSize={10} fontWeight="500" fill={ring.text} opacity={0.8} fontFamily="system-ui">
              {ring.sub}
            </text>
          </g>
        ))}
        {/* Arrow annotation */}
        <text x="300" y="60" fontSize={11} fill="#6b7280" fontFamily="system-ui">Investors</text>
        <text x="300" y="75" fontSize={11} fill="#6b7280" fontFamily="system-ui">fund SOM →</text>
        <line x1="292" y1="78" x2="248" y2="120" stroke="#1d4ed8" strokeWidth="1.5" strokeDasharray="4 3" />
      </svg>
      <p style={{ fontSize:14, color:'#4b5563', textAlign:'center', maxWidth:480, lineHeight:1.7 }}>
        {guide.intro}
      </p>
    </div>
  );
}

function PieChart({ guide }: { guide: GuideContent }) {
  // Cap Table equity split
  const slices = [
    { label:'Founders', pct:55, color:'#6366f1' },
    { label:'Angels',   pct:12, color:'#0891b2' },
    { label:'VC',       pct:18, color:'#16a34a' },
    { label:'ESOP',     pct:15, color:'#f59e0b' },
  ];
  const cx=160, cy=160, r=130;
  let angle=-Math.PI/2;
  const paths = slices.map(s => {
    const sweep=(s.pct/100)*2*Math.PI;
    const x1=cx+r*Math.cos(angle), y1=cy+r*Math.sin(angle);
    const x2=cx+r*Math.cos(angle+sweep), y2=cy+r*Math.sin(angle+sweep);
    const large=sweep>Math.PI?1:0;
    const mid=angle+sweep/2;
    const lx=cx+(r+36)*Math.cos(mid), ly=cy+(r+36)*Math.sin(mid);
    const d=`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
    angle+=sweep;
    return {...s, d, lx, ly, mid};
  });
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:28 }}>
      <svg viewBox="0 0 360 340" width="100%" style={{ maxWidth:420 }}>
        {paths.map((s,i)=>(
          <g key={i}>
            <path d={s.d} fill={s.color} opacity={0.9} stroke="#fff" strokeWidth="3" />
            <text x={s.lx} y={s.ly-6} textAnchor="middle" fontSize={12} fontWeight="800"
              fill={s.color} fontFamily="system-ui">{s.label}</text>
            <text x={s.lx} y={s.ly+10} textAnchor="middle" fontSize={13} fontWeight="900"
              fill={s.color} fontFamily="system-ui">{s.pct}%</text>
          </g>
        ))}
        <circle cx={cx} cy={cy} r={50} fill="#fff" />
        <text x={cx} y={cy-6} textAnchor="middle" fontSize={11} fontWeight="700"
          fill="#6b7280" fontFamily="system-ui">Fully</text>
        <text x={cx} y={cy+10} textAnchor="middle" fontSize={11} fontWeight="700"
          fill="#6b7280" fontFamily="system-ui">Diluted</text>
      </svg>
      <div style={{ display:'flex', gap:16, flexWrap:'wrap', justifyContent:'center' }}>
        {paths.map((s,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, color:'#374151' }}>
            <div style={{ width:12, height:12, borderRadius:3, background:s.color }} />
            {s.label}
          </div>
        ))}
      </div>
      <p style={{ fontSize:14, color:'#4b5563', textAlign:'center', maxWidth:480, lineHeight:1.7 }}>
        {guide.intro}
      </p>
    </div>
  );
}

function FunnelChart({ items, colors, guide }: { items:{icon:string;label:string}[]; colors:string[]; guide:GuideContent }) {
  const maxW=360, minW=120, h=56;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:28 }}>
      <svg viewBox={`0 0 400 ${items.length*h + 40}`} width="100%" style={{ maxWidth:460 }}>
        {items.map((item,i)=>{
          const w=maxW - i*(maxW-minW)/(items.length-1||1);
          const x=(400-w)/2, y=20+i*h;
          const c=colors[i%colors.length];
          return (
            <g key={i}>
              <rect x={x} y={y} width={w} height={h-6} rx={8} fill={c} opacity={0.9} />
              <text x={200} y={y+h/2-2} textAnchor="middle" fontSize={15} fontWeight="800"
                fill="#fff" fontFamily="system-ui">{item.icon} {item.label}</text>
              {i<items.length-1 && (
                <polygon points={`${200-10},${y+h-6} ${200+10},${y+h-6} ${200},${y+h+4}`}
                  fill={colors[(i+1)%colors.length]} opacity={0.6} />
              )}
            </g>
          );
        })}
      </svg>
      <p style={{ fontSize:14, color:'#4b5563', textAlign:'center', maxWidth:480, lineHeight:1.7 }}>
        {guide.intro}
      </p>
    </div>
  );
}

function BarComparison({ guide }: { guide: GuideContent }) {
  // LTV vs CAC bars
  const bars = [
    { label:'CAC', value:1, color:'#ef4444', desc:'Cost to acquire 1 customer' },
    { label:'LTV', value:3.5, color:'#16a34a', desc:'Revenue over customer lifetime' },
    { label:'Payback', value:0.6, color:'#f59e0b', desc:'CAC recovered in <12 months' },
  ];
  const maxVal=4;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:28 }}>
      <svg viewBox="0 0 400 280" width="100%" style={{ maxWidth:460 }}>
        {/* Y-axis labels */}
        {[0,1,2,3,4].map(v=>(
          <g key={v}>
            <line x1={60} y1={240-v*48} x2={380} y2={240-v*48} stroke="#f3f4f6" strokeWidth={1.5} />
            <text x={52} y={244-v*48} textAnchor="end" fontSize={11} fill="#9ca3af" fontFamily="system-ui">{v}×</text>
          </g>
        ))}
        {bars.map((b,i)=>{
          const bh=(b.value/maxVal)*192;
          const x=90+i*110, w=60;
          return (
            <g key={i}>
              <rect x={x} y={240-bh} width={w} height={bh} rx={8} fill={b.color} opacity={0.85} />
              <text x={x+w/2} y={240-bh-8} textAnchor="middle" fontSize={14} fontWeight="900"
                fill={b.color} fontFamily="system-ui">{b.value}×</text>
              <text x={x+w/2} y={258} textAnchor="middle" fontSize={12} fontWeight="800"
                fill="#374151" fontFamily="system-ui">{b.label}</text>
              <text x={x+w/2} y={272} textAnchor="middle" fontSize={9} fill="#9ca3af" fontFamily="system-ui">
                {b.desc.slice(0,18)}
              </text>
            </g>
          );
        })}
        {/* 3:1 line */}
        <line x1={60} y1={240-3*48} x2={380} y2={240-3*48} stroke="#6366f1" strokeWidth={2} strokeDasharray="6 3" />
        <text x={384} y={240-3*48+4} fontSize={10} fontWeight="700" fill="#6366f1" fontFamily="system-ui">3:1 target</text>
      </svg>
      <p style={{ fontSize:14, color:'#4b5563', textAlign:'center', maxWidth:480, lineHeight:1.7 }}>
        {guide.intro}
      </p>
    </div>
  );
}

function FundingLadder({ guide }: { guide: GuideContent }) {
  const stages = [
    { label:'Angel',    range:'£10k–£150k',  color:'#f59e0b', icon:'👼' },
    { label:'Seed VC',  range:'£150k–£2M',   color:'#16a34a', icon:'🌱' },
    { label:'Series A', range:'£2M–£10M',    color:'#6366f1', icon:'💼' },
    { label:'Series B', range:'£10M–£50M',   color:'#0891b2', icon:'📈' },
    { label:'Growth',   range:'£50M+',       color:'#7c3aed', icon:'🚀' },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:28 }}>
      <div style={{ display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:520 }}>
        {stages.map((s,i)=>(
          <div key={i} style={{
            display:'flex', alignItems:'center', gap:16,
            background:`${s.color}12`, border:`2px solid ${s.color}40`,
            borderRadius:14, padding:'14px 20px',
            marginLeft: `${i*28}px`,
            boxShadow:`0 2px 8px ${s.color}20`,
          }}>
            <span style={{ fontSize:28 }}>{s.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:800, color:s.color }}>{s.label}</div>
              <div style={{ fontSize:12, color:'#6b7280', fontWeight:600 }}>{s.range} typical cheque</div>
            </div>
            <div style={{
              background:s.color, color:'#fff', borderRadius:20,
              padding:'4px 12px', fontSize:11, fontWeight:800,
            }}>
              Stage {i+1}
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize:14, color:'#4b5563', textAlign:'center', maxWidth:480, lineHeight:1.7 }}>
        {guide.intro}
      </p>
    </div>
  );
}

function VestingTimeline({ guide }: { guide: GuideContent }) {
  const milestones = [
    { mo:0,  label:'Grant',  color:'#9ca3af', desc:'Options granted at strike price' },
    { mo:12, label:'Cliff',  color:'#6366f1', desc:'25% vests in one go at 1 year' },
    { mo:24, label:'50%',    color:'#0891b2', desc:'50% vested at 2 years' },
    { mo:36, label:'75%',    color:'#16a34a', desc:'75% vested at 3 years' },
    { mo:48, label:'100%',   color:'#f59e0b', desc:'Fully vested — 4 years' },
  ];
  const W=420, PL=40, PR=20, Y=100, TW=W-PL-PR;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:28 }}>
      <svg viewBox={`0 0 ${W} 200`} width="100%" style={{ maxWidth:520 }}>
        {/* Track */}
        <line x1={PL} y1={Y} x2={W-PR} y2={Y} stroke="#e5e7eb" strokeWidth={6} strokeLinecap="round" />
        {/* Progress */}
        <line x1={PL} y1={Y} x2={W-PR} y2={Y} stroke="url(#vestGrad)" strokeWidth={6} strokeLinecap="round" />
        <defs>
          <linearGradient id="vestGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        {milestones.map((m,i)=>{
          const x=PL+(m.mo/48)*TW;
          const above=i%2===0;
          return (
            <g key={i}>
              <circle cx={x} cy={Y} r={10} fill={m.color} stroke="#fff" strokeWidth={3} />
              <line x1={x} y1={above?Y-10:Y+10} x2={x} y2={above?Y-36:Y+36}
                stroke={m.color} strokeWidth={1.5} strokeDasharray="3 2" />
              <text x={x} y={above?Y-44:Y+50} textAnchor="middle"
                fontSize={12} fontWeight="800" fill={m.color} fontFamily="system-ui">
                {m.label}
              </text>
              <text x={x} y={above?Y-30:Y+64} textAnchor="middle"
                fontSize={9} fill="#9ca3af" fontFamily="system-ui">
                {m.mo===0?'Day 1':`${m.mo}mo`}
              </text>
            </g>
          );
        })}
      </svg>
      <p style={{ fontSize:14, color:'#4b5563', textAlign:'center', maxWidth:480, lineHeight:1.7 }}>
        {guide.intro}
      </p>
    </div>
  );
}

function NowNextLater({ guide }: { guide: GuideContent }) {
  const cols = [
    { label:'🎯 Now',  color:'#ef4444', items:['Define core problem','Validate with 10 users','Ship MVP v1'] },
    { label:'🔭 Next', color:'#f59e0b', items:['Add onboarding flow','Run first paid ads','Hire eng #1'] },
    { label:'🌅 Later',color:'#16a34a', items:['International launch','Self-serve analytics','Series A raise'] },
    { label:'🚫 Never',color:'#6b7280', items:['Admin dashboards','Dark mode','Mobile app v1'] },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:28 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, width:'100%', maxWidth:700 }}>
        {cols.map((col,i)=>(
          <div key={i} style={{
            background:'#fff', border:`2px solid ${col.color}40`, borderRadius:16,
            overflow:'hidden',
          }}>
            <div style={{
              background:`${col.color}15`, padding:'12px 14px',
              fontSize:13, fontWeight:800, color:col.color,
              borderBottom:`2px solid ${col.color}30`,
            }}>
              {col.label}
            </div>
            <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:8 }}>
              {col.items.map((it,j)=>(
                <div key={j} style={{
                  fontSize:11, color:'#374151', fontWeight:600, lineHeight:1.4,
                  padding:'6px 8px', background:'#f9fafb', borderRadius:8,
                  borderLeft:`3px solid ${col.color}`,
                }}>
                  {it}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize:14, color:'#4b5563', textAlign:'center', maxWidth:480, lineHeight:1.7 }}>
        {guide.intro}
      </p>
    </div>
  );
}

function BMCGrid({ guide }: { guide: GuideContent }) {
  const blocks = [
    { label:'Key Partners', icon:'🤝', color:'#6366f1', area:'KP' },
    { label:'Key Activities', icon:'⚙️', color:'#0891b2', area:'KA' },
    { label:'Value Proposition', icon:'⭐', color:'#7c3aed', area:'VP' },
    { label:'Customer Relationships', icon:'💬', color:'#16a34a', area:'CR' },
    { label:'Customer Segments', icon:'🎯', color:'#f59e0b', area:'CS' },
    { label:'Key Resources', icon:'🏗', color:'#0284c7', area:'KR' },
    { label:'Channels', icon:'📣', color:'#ea580c', area:'CH' },
    { label:'Cost Structure', icon:'💸', color:'#dc2626', area:'CO' },
    { label:'Revenue Streams', icon:'💰', color:'#15803d', area:'RE' },
  ];
  // Custom 5-col, 3-row BMC layout
  const layout = [
    ['KP','KP','VP','CR','CS'],
    ['KP','KA','VP','CR','CS'],
    ['KR','KA','VP','CH','CS'],
    ['CO','CO','RE','RE','RE'],
  ];
  const colW=80, rowH=56, gap=3;
  // Build unique cells with spans
  const rendered = new Set<string>();
  const cells: {area:string;c:number;r:number;cspan:number;rspan:number}[]=[];
  layout.forEach((row,ri)=>row.forEach((area,ci)=>{
    if(rendered.has(`${ri}-${ci}`)) return;
    let cspan=1, rspan=1;
    while(ci+cspan<row.length && layout[ri][ci+cspan]===area) cspan++;
    while(ri+rspan<layout.length && layout[ri+rspan][ci]===area) rspan++;
    cells.push({area,c:ci,r:ri,cspan,rspan});
    for(let dr=0;dr<rspan;dr++) for(let dc=0;dc<cspan;dc++) rendered.add(`${ri+dr}-${ci+dc}`);
  }));
  const W=5*(colW+gap)+gap, H=4*(rowH+gap)+gap;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:28 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth:560 }}>
        {cells.map((cell,i)=>{
          const block=blocks.find(b=>b.area===cell.area)!;
          const x=gap+cell.c*(colW+gap), y=gap+cell.r*(rowH+gap);
          const w=cell.cspan*(colW+gap)-gap, h=cell.rspan*(rowH+gap)-gap;
          return (
            <g key={i}>
              <rect x={x} y={y} width={w} height={h} rx={8}
                fill={`${block.color}15`} stroke={`${block.color}50`} strokeWidth={1.5} />
              <text x={x+w/2} y={y+h/2-7} textAnchor="middle" fontSize={16} fontFamily="system-ui">
                {block.icon}
              </text>
              <text x={x+w/2} y={y+h/2+9} textAnchor="middle" fontSize={8.5} fontWeight="700"
                fill={block.color} fontFamily="system-ui">
                {block.label.split(' ').join('\n')}
              </text>
            </g>
          );
        })}
      </svg>
      <p style={{ fontSize:14, color:'#4b5563', textAlign:'center', maxWidth:480, lineHeight:1.7 }}>
        {guide.intro}
      </p>
    </div>
  );
}

function RetentionCurve({ guide }: { guide: GuideContent }) {
  const points = [
    [0,100],[1,68],[2,52],[3,43],[4,38],[5,35],[6,34],[7,33.5],[8,33],[9,32.5],[10,32],[11,31.5],[12,31],
  ];
  const dead = [
    [0,100],[1,55],[2,30],[3,16],[4,9],[5,5],[6,3],[7,2],[8,1],[9,0.5],[10,0],[11,0],[12,0],
  ];
  const XL=50, XR=380, YT=20, YB=200;
  const px = (x:number) => XL + (x/12)*(XR-XL);
  const py = (y:number) => YB - (y/100)*(YB-YT);
  const toPath = (pts:[number,number][]) => pts.map((p,i)=>`${i===0?'M':'L'}${px(p[0])},${py(p[1])}`).join(' ');
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:28 }}>
      <svg viewBox="0 0 420 260" width="100%" style={{ maxWidth:520 }}>
        {/* Grid */}
        {[0,25,50,75,100].map(v=>(
          <g key={v}>
            <line x1={XL} y1={py(v)} x2={XR} y2={py(v)} stroke="#f3f4f6" strokeWidth={1} />
            <text x={XL-8} y={py(v)+4} textAnchor="end" fontSize={9} fill="#9ca3af" fontFamily="system-ui">{v}%</text>
          </g>
        ))}
        {[0,3,6,9,12].map(m=>(
          <g key={m}>
            <text x={px(m)} y={YB+14} textAnchor="middle" fontSize={9} fill="#9ca3af" fontFamily="system-ui">Mo {m}</text>
          </g>
        ))}
        {/* Dead product */}
        <path d={toPath(dead as [number,number][])} fill="none" stroke="#ef4444" strokeWidth={2.5}
          strokeDasharray="6 4" opacity={0.6} />
        {/* PMF curve */}
        <path d={toPath(points as [number,number][])} fill="none" stroke="#16a34a" strokeWidth={3} />
        {/* PMF flatline annotation */}
        <line x1={px(6)} y1={py(33)} x2={px(12)} y2={py(31)} stroke="#16a34a" strokeWidth={1.5} strokeDasharray="4 3" />
        <text x={px(9)} y={py(37)} textAnchor="middle" fontSize={9} fontWeight="700" fill="#16a34a" fontFamily="system-ui">
          Retention flattens = PMF ✓
        </text>
        {/* Legend */}
        <line x1={60} y1={230} x2={80} y2={230} stroke="#16a34a" strokeWidth={2.5} />
        <text x={84} y={234} fontSize={10} fill="#374151" fontFamily="system-ui">With PMF</text>
        <line x1={160} y1={230} x2={180} y2={230} stroke="#ef4444" strokeWidth={2.5} strokeDasharray="4 3" />
        <text x={184} y={234} fontSize={10} fill="#374151" fontFamily="system-ui">No PMF (decay)</text>
      </svg>
      <p style={{ fontSize:14, color:'#4b5563', textAlign:'center', maxWidth:480, lineHeight:1.7 }}>
        {guide.intro}
      </p>
    </div>
  );
}

function BootstrapCurve({ guide }: { guide: GuideContent }) {
  const milestones = [
    { mo:0,  rev:0,    label:'Idea', color:'#9ca3af' },
    { mo:3,  rev:1,    label:'£1k/mo', color:'#6366f1' },
    { mo:8,  rev:10,   label:'£10k/mo', color:'#0891b2' },
    { mo:18, rev:50,   label:'£50k/mo', color:'#16a34a' },
    { mo:30, rev:100,  label:'£100k/mo', color:'#f59e0b' },
  ];
  const XL=60, XR=380, YT=20, YB=200, maxRev=110, maxMo=32;
  const px=(x:number)=>XL+(x/maxMo)*(XR-XL);
  const py=(y:number)=>YB-(y/maxRev)*(YB-YT);
  const d=milestones.map((m,i)=>`${i===0?'M':'L'}${px(m.mo)},${py(m.rev)}`).join(' ');
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:28 }}>
      <svg viewBox="0 0 420 260" width="100%" style={{ maxWidth:520 }}>
        <defs>
          <linearGradient id="bsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>
        {[0,25,50,75,100].map(v=>(
          <g key={v}>
            <line x1={XL} y1={py(v)} x2={XR} y2={py(v)} stroke="#f3f4f6" strokeWidth={1} />
            <text x={XL-8} y={py(v)+4} textAnchor="end" fontSize={9} fill="#9ca3af" fontFamily="system-ui">£{v}k</text>
          </g>
        ))}
        <path d={d} fill="none" stroke="url(#bsGrad)" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        {milestones.map((m,i)=>(
          <g key={i}>
            <circle cx={px(m.mo)} cy={py(m.rev)} r={7} fill={m.color} stroke="#fff" strokeWidth={2} />
            <text x={px(m.mo)} y={py(m.rev)-14} textAnchor="middle" fontSize={10} fontWeight="800"
              fill={m.color} fontFamily="system-ui">{m.label}</text>
          </g>
        ))}
        <text x={XL-4} y={YB+14} textAnchor="middle" fontSize={9} fill="#9ca3af" fontFamily="system-ui">Start</text>
        <text x={XR} y={YB+14} textAnchor="middle" fontSize={9} fill="#9ca3af" fontFamily="system-ui">30 months</text>
        <text x={XL-22} y={(YT+YB)/2} textAnchor="middle" fontSize={9} fill="#9ca3af"
          fontFamily="system-ui" transform={`rotate(-90,${XL-22},${(YT+YB)/2})`}>Monthly Revenue</text>
      </svg>
      <p style={{ fontSize:14, color:'#4b5563', textAlign:'center', maxWidth:480, lineHeight:1.7 }}>
        {guide.intro}
      </p>
    </div>
  );
}

/** Master lookup — returns custom SVG for specific guide IDs, null = use generic */
function CustomInfographic({ guide, onItemClick: _onItemClick }: { guide: GuideContent; onItemClick: (i:number)=>void }) {
  switch(guide.id) {
    case 'biz-tam':        return <ConcentricCircles guide={guide} />;
    case 'biz-cap-table':  return <PieChart guide={guide} />;
    case 'biz-unit-economics': return <BarComparison guide={guide} />;
    case 'biz-investors':  return <FundingLadder guide={guide} />;
    case 'biz-equity':     return <VestingTimeline guide={guide} />;
    case 'biz-roadmap':    return <NowNextLater guide={guide} />;
    case 'bmc':            return <BMCGrid guide={guide} />;
    case 'guide-pmf':      return <RetentionCurve guide={guide} />;
    case 'biz-bootstrapping': return <BootstrapCurve guide={guide} />;
    case 'guide-validate':
    case 'guide-customers':
    case 'biz-growth-hacking': {
      const colors = INFOGRAPHIC_COLORS;
      return <FunnelChart items={guide.visual.items} colors={colors} guide={guide} />;
    }
    default: return null;
  }
}

const INFOGRAPHIC_COLORS = ['#6366f1','#0891b2','#16a34a','#ea580c','#db2777','#7c3aed','#0284c7','#ca8a04','#0f766e','#be185d'];

/** Distribute guide resources proportionally to item index */
function itemResources(guide: GuideContent, itemIdx: number) {
  const total = guide.resources.length;
  const n = guide.visual.items.length;
  const chunkSize = Math.max(1, Math.ceil(total / n));
  const start = itemIdx * chunkSize;
  const end = Math.min(start + chunkSize, total);
  // If this item would get nothing (sparse), give it the last resource
  if (start >= total) return [guide.resources[total - 1]];
  return guide.resources.slice(start, end);
}

function ClickableHint() {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
      color: '#94a3b8', marginTop: 4,
    }}>
      Click to learn more
    </div>
  );
}

function InfographicSteps({ guide, onItemClick }: { guide: GuideContent; onItemClick: (i: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const colors = INFOGRAPHIC_COLORS;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 48, padding: '0 24px' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 900 }}>
        <svg
          viewBox={`0 0 900 120`}
          style={{ position: 'absolute', top: 10, left: 0, width: '100%', height: 120, pointerEvents: 'none' }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              {guide.visual.items.map((_, i) => (
                <stop key={i} offset={`${(i / (guide.visual.items.length - 1)) * 100}%`} stopColor={colors[i % colors.length]} />
              ))}
            </linearGradient>
          </defs>
          <path
            d={`M ${900 / (guide.visual.items.length * 2)} 60 ${guide.visual.items.slice(1).map((_, i) => {
              const step = 900 / guide.visual.items.length;
              const x = step * (i + 1) + step / 2;
              return `Q ${x - step * 0.4} ${i % 2 === 0 ? 20 : 100} ${x} 60`;
            }).join(' ')}`}
            stroke="url(#pathGrad)" strokeWidth="4" fill="none" strokeDasharray="8 4" opacity="0.6"
          />
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', gap: 0, position: 'relative', zIndex: 1 }}>
          {guide.visual.items.map((item, i) => {
            const c = colors[i % colors.length];
            const isHov = hovered === i;
            return (
              <div
                key={i}
                onClick={() => onItemClick(i)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  cursor: 'pointer',
                  transform: isHov ? 'translateY(-6px) scale(1.04)' : 'none',
                  transition: 'transform .2s ease',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: c, color: '#fff', fontSize: 13, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isHov ? `0 6px 18px ${c}70` : `0 4px 12px ${c}60`,
                }}>
                  {i + 1}
                </div>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: isHov ? `${c}30` : `${c}18`,
                  border: `2.5px solid ${isHov ? c : `${c}40`}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 36, boxShadow: isHov ? `0 8px 28px ${c}45` : `0 6px 20px ${c}25`,
                  transition: 'all .2s',
                }}>
                  {item.icon}
                </div>
                <StickMan color={c} scale={0.85} />
                <div style={{ fontSize: 13, fontWeight: 800, color: c, textAlign: 'center', maxWidth: 110, lineHeight: 1.3 }}>
                  {item.label}
                </div>
                {isHov && <ClickableHint />}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{
        background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12,
        padding: '16px 24px', fontSize: 14, color: '#64748b', textAlign: 'center',
        maxWidth: 600, lineHeight: 1.6,
      }}>
        {guide.intro}
      </div>
    </div>
  );
}

function InfographicFlow({ guide, onItemClick }: { guide: GuideContent; onItemClick: (i: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const colors = INFOGRAPHIC_COLORS;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, padding: '0 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', justifyContent: 'center' }}>
        {guide.visual.items.map((item, i) => {
          const c = colors[i % colors.length];
          const isHov = hovered === i;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                onClick={() => onItemClick(i)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                  background: '#fff', border: `2.5px solid ${isHov ? c : `${c}60`}`,
                  borderRadius: 20, padding: '28px 32px',
                  boxShadow: isHov ? `0 12px 32px ${c}40` : `0 8px 24px ${c}25`,
                  minWidth: 140, cursor: 'pointer',
                  transform: isHov ? 'translateY(-6px) scale(1.04)' : 'none',
                  transition: 'all .2s ease',
                }}
              >
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: isHov ? `${c}22` : `${c}15`,
                  border: `2px solid ${isHov ? c : `${c}40`}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 36, transition: 'all .2s',
                }}>
                  {item.icon}
                </div>
                <StickMan color={c} scale={0.8} />
                <div style={{ background: c, color: '#fff', fontSize: 12, fontWeight: 800, letterSpacing: 0.5, padding: '5px 16px', borderRadius: 20 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                  Stage {i + 1} of {guide.visual.items.length}
                </div>
                {isHov && <ClickableHint />}
              </div>
              {i < guide.visual.items.length - 1 && (
                <div style={{ padding: '0 8px' }}>
                  <svg width="40" height="24" viewBox="0 0 40 24">
                    <defs>
                      <linearGradient id={`arrowGrad${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={colors[i % colors.length]} />
                        <stop offset="100%" stopColor={colors[(i + 1) % colors.length]} />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="12" x2="32" y2="12" stroke={`url(#arrowGrad${i})`} strokeWidth="2.5" strokeLinecap="round" />
                    <polyline points="25,6 35,12 25,18" fill="none" stroke={colors[(i + 1) % colors.length]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{
        background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12,
        padding: '16px 24px', fontSize: 14, color: '#64748b', textAlign: 'center',
        maxWidth: 600, lineHeight: 1.6,
      }}>
        {guide.intro}
      </div>
    </div>
  );
}

function InfographicGrid({ guide, onItemClick }: { guide: GuideContent; onItemClick: (i: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const colors = INFOGRAPHIC_COLORS;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, padding: '0 24px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(guide.visual.items.length, 3)}, 1fr)`,
        gap: 20, width: '100%', maxWidth: 800,
      }}>
        {guide.visual.items.map((item, i) => {
          const c = colors[i % colors.length];
          const isHov = hovered === i;
          return (
            <div
              key={i}
              onClick={() => onItemClick(i)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: '#fff', border: `2px solid ${isHov ? c : `${c}30`}`,
                borderRadius: 20, padding: '28px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
                boxShadow: isHov ? `0 12px 32px ${c}35` : `0 6px 20px ${c}18`,
                cursor: 'pointer',
                transform: isHov ? 'translateY(-6px) scale(1.03)' : 'none',
                transition: 'all .2s ease',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: c, color: '#fff', fontSize: 12, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                alignSelf: 'flex-start',
              }}>
                {i + 1}
              </div>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: isHov ? `${c}22` : `${c}15`,
                border: `2px solid ${isHov ? c : `${c}40`}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, boxShadow: `0 4px 14px ${c}25`, transition: 'all .2s',
              }}>
                {item.icon}
              </div>
              <StickMan color={c} scale={0.75} />
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1d1d1f', textAlign: 'center', lineHeight: 1.3 }}>
                {item.label}
              </div>
              <div style={{ width: '100%', height: 4, borderRadius: 99, background: `${c}25`, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: c, borderRadius: 99 }} />
              </div>
              {isHov && <ClickableHint />}
            </div>
          );
        })}
      </div>
      <div style={{
        background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12,
        padding: '16px 24px', fontSize: 14, color: '#64748b', textAlign: 'center',
        maxWidth: 600, lineHeight: 1.6,
      }}>
        {guide.intro}
      </div>
    </div>
  );
}

// ─── Item Detail Page ─────────────────────────────────────────────────────────

function ItemDetail({ guide, itemIdx, onBack }: { guide: GuideContent; itemIdx: number; onBack: () => void }) {
  const item = guide.visual.items[itemIdx];
  const color = INFOGRAPHIC_COLORS[itemIdx % INFOGRAPHIC_COLORS.length];
  const resources = itemResources(guide, itemIdx);
  const totalItems = guide.visual.items.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 720, margin: '0 auto' }}>

      {/* Back + breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRadius: 20,
            padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#475569',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#e2e8f0'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9'; }}
        >
          ← Back to overview
        </button>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>
          Step {itemIdx + 1} of {totalItems}
        </span>
      </div>

      {/* Hero card */}
      <div style={{
        background: `linear-gradient(135deg, ${color}12 0%, #fff 100%)`,
        border: `2px solid ${color}30`,
        borderRadius: 24, padding: '40px 40px 36px',
        marginBottom: 28,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Large decorative number */}
        <div style={{
          position: 'absolute', top: -10, right: 20,
          fontSize: 120, fontWeight: 900, color: `${color}08`,
          lineHeight: 1, userSelect: 'none', pointerEvents: 'none',
        }}>
          {itemIdx + 1}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28, position: 'relative', zIndex: 1 }}>
          {/* Icon + stickman */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: `${color}18`, border: `3px solid ${color}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 50, boxShadow: `0 8px 28px ${color}30`,
            }}>
              {item.icon}
            </div>
            <StickMan color={color} scale={1.1} />
          </div>

          {/* Title + meta */}
          <div style={{ flex: 1, paddingTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{
                background: color, color: '#fff',
                fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase',
                padding: '4px 12px', borderRadius: 20,
              }}>
                {guide.section} · Step {itemIdx + 1}
              </span>
            </div>
            <h2 style={{
              fontSize: 32, fontWeight: 900, color: '#1d1d1f', letterSpacing: -0.8,
              marginBottom: 10, lineHeight: 1.1,
            }}>
              {item.label}
            </h2>
            <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.7, marginBottom: 0 }}>
              {guide.tagline}
            </p>
          </div>
        </div>
      </div>

      {/* Overview */}
      <div style={{
        background: '#fff', border: '1.5px solid #e8e8ed', borderRadius: 16,
        padding: '24px 28px', marginBottom: 24,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase',
          color: color, marginBottom: 12,
        }}>
          Overview
        </div>
        <p style={{ fontSize: 15, color: '#1d1d1f', lineHeight: 1.75, margin: 0, fontWeight: 450 }}>
          {guide.intro}
        </p>
      </div>

      {/* Key insights for this step */}
      <div style={{
        background: '#fff', border: '1.5px solid #e8e8ed', borderRadius: 16,
        overflow: 'hidden', marginBottom: 28,
      }}>
        <div style={{
          padding: '18px 28px 14px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: `${color}15`, border: `1.5px solid ${color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
          }}>
            {item.icon}
          </div>
          <div style={{
            fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: color,
          }}>
            Key insights for "{item.label}"
          </div>
        </div>
        {resources.map((r, ri) => (
          <div key={ri} style={{
            display: 'flex', alignItems: 'flex-start', gap: 16,
            padding: '16px 28px',
            borderBottom: ri < resources.length - 1 ? '1px solid #f9fafb' : 'none',
            background: ri % 2 === 0 ? '#fff' : '#f9fafb',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: `${color}12`, border: `1.5px solid ${color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0, marginTop: 1,
            }}>
              {r.icon}
            </div>
            <span style={{ fontSize: 14, color: '#1d1d1f', lineHeight: 1.7, fontWeight: 500 }}>
              {r.text}
            </span>
          </div>
        ))}
      </div>

      {/* Step navigation */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
        {itemIdx > 0 ? (
          <button
            onClick={() => onBack()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '11px 20px', borderRadius: 10,
              background: '#f1f5f9', border: '1.5px solid #e2e8f0',
              fontSize: 13, fontWeight: 700, color: '#475569', cursor: 'pointer',
            }}
          >
            ← Overview
          </button>
        ) : <div />}
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: totalItems }).map((_, di) => (
            <div key={di} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: di === itemIdx ? color : '#d1d5db',
              alignSelf: 'center',
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function InfographicModal({ guide, onClose }: { guide: GuideContent; onClose: () => void }) {
  const [selectedItem, setSelectedItem] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedItem !== null) { setSelectedItem(null); }
        else { onClose(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, selectedItem]);

  const renderContent = () => {
    if (selectedItem !== null) {
      return <ItemDetail guide={guide} itemIdx={selectedItem} onBack={() => setSelectedItem(null)} />;
    }
    // Check for bespoke contextual infographic first
    const custom = <CustomInfographic guide={guide} onItemClick={setSelectedItem} />;
    if (custom) return custom;
    // Fall back to generic stickman layouts
    if (guide.visual.type === 'steps') return <InfographicSteps guide={guide} onItemClick={setSelectedItem} />;
    if (guide.visual.type === 'flow')  return <InfographicFlow guide={guide} onItemClick={setSelectedItem} />;
    return <InfographicGrid guide={guide} onItemClick={setSelectedItem} />;
  };

  return createPortal(
    <div
      onClick={() => { if (selectedItem !== null) { setSelectedItem(null); } else { onClose(); } }}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 24,
          boxShadow: '0 32px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.06)',
          width: '100%', maxWidth: 980, maxHeight: '90vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 28px', borderBottom: '1.5px solid #e8e8ed',
          background: selectedItem !== null
            ? `linear-gradient(135deg, ${INFOGRAPHIC_COLORS[selectedItem % INFOGRAPHIC_COLORS.length]}15 0%, #fff 100%)`
            : `linear-gradient(135deg, ${guide.bg} 0%, #fff 100%)`,
          flexShrink: 0, transition: 'background .3s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {selectedItem !== null && (
              <button
                onClick={() => setSelectedItem(null)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRadius: 20,
                  padding: '5px 12px', fontSize: 12, fontWeight: 700, color: '#475569',
                  cursor: 'pointer',
                }}
              >
                ←
              </button>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  background: guide.color, color: '#fff',
                  fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
                  padding: '3px 10px', borderRadius: 20,
                }}>
                  {guide.section}
                </span>
                {selectedItem !== null && (
                  <span style={{
                    background: INFOGRAPHIC_COLORS[selectedItem % INFOGRAPHIC_COLORS.length],
                    color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: 1,
                    textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20,
                  }}>
                    {guide.visual.items[selectedItem].icon} {guide.visual.items[selectedItem].label}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#1d1d1f', letterSpacing: -0.4 }}>
                {guide.navIcon} {guide.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: guide.color, marginTop: 2 }}>
                {selectedItem !== null
                  ? `Step ${selectedItem + 1} of ${guide.visual.items.length} — click any card to explore`
                  : guide.tagline}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: '#f3f4f6', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 16, color: '#6b7280', flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px 28px 48px' }}>
          {renderContent()}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── GuideDoc ─────────────────────────────────────────────────────────────────

function GuideDoc({ guide }: { guide: GuideContent }) {
  const [showInfographic, setShowInfographic] = useState(false);
  return (
    <div>
      {/* ── Document header ── */}
      <div style={{
        background: `linear-gradient(135deg, ${guide.bg} 0%, #fff 100%)`,
        border: `1.5px solid ${guide.border}`,
        borderRadius: 16, padding: '28px 32px', marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: guide.color, color: '#fff',
            fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
            padding: '4px 10px', borderRadius: 20,
          }}>
            {guide.section}
          </span>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: '#1d1d1f', letterSpacing: -0.5, marginBottom: 4 }}>
          {guide.navIcon} {guide.label}
        </h2>
        <p style={{ fontSize: 14, fontWeight: 700, color: guide.color, marginBottom: 12 }}>
          {guide.tagline}
        </p>
        <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.7, maxWidth: 600 }}>
          {guide.intro}
        </p>
      </div>

      {/* ── Mini infographic ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
          color: '#86868b', marginBottom: 14,
        }}>
          At a glance
        </div>
        <div style={{
          background: '#fff', border: '1.5px solid #d2d2d7', borderRadius: 14,
          padding: '20px 24px', overflowX: 'auto',
        }}>
          <MiniInfographic guide={guide} />
        </div>
      </div>

      {/* ── 10 Resources ── */}
      <div>
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
          color: '#86868b', marginBottom: 14,
        }}>
          10 key resources &amp; tips
        </div>
        <div style={{
          background: '#fff', border: '1.5px solid #d2d2d7', borderRadius: 14,
          overflow: 'hidden',
        }}>
          {guide.resources.map((r, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              padding: '14px 20px',
              borderBottom: i < guide.resources.length - 1 ? '1px solid #f3f4f6' : 'none',
              background: i % 2 === 0 ? '#fff' : '#f5f5f7',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0, width: 24, textAlign: 'center' }}>{r.icon}</span>
              <span style={{ fontSize: 13, color: '#1d1d1f', lineHeight: 1.6, fontWeight: 500 }}>{r.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setShowInfographic(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '11px 20px', borderRadius: 10,
            background: guide.color, color: '#fff', border: 'none',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: `0 4px 14px ${guide.color}40`,
            transition: 'all .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '.85'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
        >
          📊 View infographic →
        </button>
      </div>

      {showInfographic && (
        <InfographicModal guide={guide} onClose={() => setShowInfographic(false)} />
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialIdx = GUIDES.findIndex(g => g.id === searchParams.get('guide'));
  const [active, setActive] = useState(initialIdx >= 0 ? initialIdx : 0);

  useEffect(() => {
    setSearchParams({ guide: GUIDES[active].id }, { replace: true });
  }, [active]);

  const guide = GUIDES[active];
  const sections: Array<'How-to' | 'Guides' | 'Business' | 'Concepts'> = ['How-to', 'Guides', 'Business', 'Concepts'];

  return (
    <div style={{
      minHeight: 'calc(100vh - 56px)', background: '#f5f5f7',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Page title bar ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #d2d2d7', padding: '20px 32px' }}>
        <div style={{ maxWidth: 1360, margin: '0 auto', display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#1d1d1f', letterSpacing: -0.5 }}>Resources</h1>
          <span style={{ fontSize: 12, color: '#86868b', fontWeight: 600 }}>40 guides</span>
        </div>
      </div>

      {/* ── Layout: sidebar + content ── */}
      <div style={{
        flex: 1, maxWidth: 1360, margin: '0 auto', width: '100%',
        padding: '28px 32px 48px', boxSizing: 'border-box',
        display: 'grid', gridTemplateColumns: '220px 1fr', gap: 28, alignItems: 'start',
      }}>

        {/* ── Sidebar nav ── */}
        <nav style={{
          background: '#fff', border: '1.5px solid #d2d2d7', borderRadius: 16,
          overflow: 'hidden', position: 'sticky', top: 76,
        }}>
          {sections.map((section, si) => (
            <div key={section}>
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
                color: '#86868b', padding: '14px 16px 8px',
                borderTop: si > 0 ? '1px solid #f3f4f6' : 'none',
              }}>
                {section}
              </div>
              {GUIDES.filter(g => g.section === section).map((g) => {
                const idx = GUIDES.indexOf(g);
                const isActive = idx === active;
                return (
                  <button
                    key={g.id}
                    onClick={() => setActive(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '10px 16px',
                      border: 'none', background: isActive ? g.bg : 'transparent',
                      borderLeft: isActive ? `3px solid ${g.color}` : '3px solid transparent',
                      cursor: 'pointer', textAlign: 'left', transition: 'all .12s',
                    }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{g.navIcon}</span>
                    <span style={{
                      fontSize: 12, fontWeight: isActive ? 800 : 600,
                      color: isActive ? g.color : '#1d1d1f', lineHeight: 1.3,
                    }}>
                      {g.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Document content ── */}
        <div>
          <GuideDoc guide={guide} />
        </div>
      </div>
    </div>
  );
}
