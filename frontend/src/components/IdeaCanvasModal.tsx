import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Idea } from '@/types';
import { STAGE_LABELS, STAGE_COLORS } from '@/types';
import { ideasApi, communityApi } from '@/api/client';

// ── Canvas block definitions ──────────────────────────────────────────────────
const BLOCKS = [
  {
    id: 'partners', area: 'partners', num: '01', icon: '🤝', title: 'Key Partners',
    hint: 'Who helps you deliver?',
    explainer: 'Who do you rely on to make your business work?\n\nInclude key suppliers, technology vendors, strategic alliances, and anyone you outsource critical work to. Ask yourself: who would make life very difficult if they suddenly disappeared?\n\nExamples: cloud providers, payment processors, logistics partners, co-founders, advisors.',
    bg: '#ffffff', fg: '#1d1d1f', accent: '#6366f1', isDark: false,
  },
  {
    id: 'activities', area: 'activities', num: '02', icon: '⚙️', title: 'Key Activities',
    hint: 'What must you do every day?',
    explainer: 'What are the most important things your company must do to deliver its value proposition?\n\nThese are your core operations — the things that keep your business alive. Think: building and maintaining the product, marketing, customer support, sales outreach, data analysis.\n\nIf you stopped doing these, your business would stop working.',
    bg: '#ffffff', fg: '#1d1d1f', accent: '#3b82f6', isDark: false,
  },
  {
    id: 'resources', area: 'resources', num: '03', icon: '🧱', title: 'Key Resources',
    hint: 'What assets do you need?',
    explainer: 'What critical assets does your business need to function?\n\nResources can be:\n• Physical — equipment, office, hardware\n• Intellectual — patents, brand, proprietary data, code\n• Human — your team\'s skills and expertise\n• Financial — cash, credit lines, investor backing\n\nFocus on what makes you hard to copy.',
    bg: '#ffffff', fg: '#1d1d1f', accent: '#06b6d4', isDark: false,
  },
  {
    id: 'value', area: 'value', num: '04', icon: '💎', title: 'Value Proposition',
    hint: 'What problem do you solve?',
    explainer: 'This is the heart of your business model — the core reason customers choose you.\n\nWhat pain do you eliminate? What gain do you create? What job do you get done for the customer that they can\'t do easily themselves?\n\nA strong value prop answers: "We help [customer] do [outcome] without [pain]." Be specific. Vague value props don\'t win customers.',
    bg: '#ffffff', fg: '#1d1d1f', accent: '#6366f1', isDark: false,
  },
  {
    id: 'cr', area: 'cr', num: '05', icon: '❤️', title: 'Customer Relations',
    hint: 'How do you get & keep customers?',
    explainer: 'How do you attract, retain, and grow your customer base?\n\nDefine the type of relationship you have with each segment:\n• Self-serve (product-led, no human touch)\n• Personal assistance (sales calls, account managers)\n• Automated (email drips, in-app nudges)\n• Community (forums, user groups)\n• Co-creation (beta programs, feedback loops)\n\nYour churn rate depends on getting this right.',
    bg: '#ffffff', fg: '#1d1d1f', accent: '#22c55e', isDark: false,
  },
  {
    id: 'channels', area: 'channels', num: '06', icon: '📡', title: 'Channels',
    hint: 'How do customers find & buy?',
    explainer: 'How do you reach your customers to deliver your value proposition?\n\nChannels cover the full journey:\n1. Awareness — how do they find out you exist?\n2. Evaluation — how do they decide if you\'re right?\n3. Purchase — how do they buy?\n4. Delivery — how do they receive value?\n5. After-sales — how do you support them?\n\nExamples: SEO, paid ads, sales team, App Store, partnerships.',
    bg: '#ffffff', fg: '#1d1d1f', accent: '#10b981', isDark: false,
  },
  {
    id: 'segments', area: 'segments', num: '07', icon: '🎯', title: 'Customer Segments',
    hint: 'Who are you building for?',
    explainer: 'Who exactly are you creating value for? The more specific, the better.\n\nAvoid "anyone who needs X." Instead define:\n• Who they are (role, industry, company size)\n• What they struggle with right now\n• Why existing solutions fail them\n• Where they spend time online\n\nStart with your early adopters — the people who need your solution so badly they\'ll tolerate an imperfect v1.',
    bg: '#ffffff', fg: '#1d1d1f', accent: '#14b8a6', isDark: false,
  },
  {
    id: 'costs', area: 'costs', num: '08', icon: '💸', title: 'Cost Structure',
    hint: 'What does it cost to operate?',
    explainer: 'What are the most significant costs in your business?\n\nBreak them down:\n• Fixed costs — salaries, rent, subscriptions (same regardless of volume)\n• Variable costs — hosting, transaction fees, support (scale with usage)\n• One-time costs — setup, tooling, legal\n\nAlso identify your unit economics: what does it cost to acquire one customer (CAC) vs. how much they\'re worth over time (LTV)?',
    bg: '#ffffff', fg: '#1d1d1f', accent: '#f43f5e', isDark: false,
  },
  {
    id: 'revenue', area: 'revenue', num: '09', icon: '💰', title: 'Revenue Streams',
    hint: 'How does money flow in?',
    explainer: 'How does your business actually make money?\n\nFor each customer segment, ask: what value are they willing to pay for, and how do they prefer to pay?\n\nCommon models:\n• Subscription — recurring monthly/annual fee\n• Usage-based — pay per use or per seat\n• One-time — single purchase\n• Freemium — free tier + paid upgrade\n• Transaction fee — % of GMV\n• Licensing — charge to use your IP\n\nDon\'t just pick one. Many successful businesses combine two or three.',
    bg: '#ffffff', fg: '#1d1d1f', accent: '#16a34a', isDark: false,
  },
] as const;

// ── Suggestion chips per block ────────────────────────────────────────────────
const SUGGESTIONS: Record<string, string[]> = {
  partners: [
    'Cloud infrastructure provider',
    'Payment processor (Stripe / Paddle)',
    'White-label API vendor',
    'Distribution partner',
    'Reseller / affiliate network',
    'Freelance dev agency',
    'Legal / compliance firm',
    'Marketing agency',
    'Co-founder or advisor',
    'Industry association',
  ],
  activities: [
    'Product development & shipping',
    'Customer onboarding & support',
    'Content creation & SEO',
    'Sales outreach & demos',
    'Data analysis & iteration',
    'Community management',
    'Partnership development',
    'Hiring & team building',
    'Investor relations',
    'Platform maintenance & uptime',
  ],
  resources: [
    'Founding team expertise',
    'Proprietary algorithm / IP',
    'Customer data & insights',
    'Brand & domain reputation',
    'Cloud infrastructure',
    'Venture capital / runway',
    'User-generated content',
    'Strategic relationships',
    'Tech stack & codebase',
    'Licenses & certifications',
  ],
  value: [
    'Save significant time',
    'Cut costs by 10× vs. current solution',
    'No-code — anyone can use it',
    'All-in-one — replaces 3 tools',
    'Industry-specific and deeply tailored',
    'Real-time insights, not weekly reports',
    'Integrates with tools you already use',
    'Works offline',
    'Self-improving with AI',
    'Done-for-you, not DIY',
  ],
  cr: [
    'Fully self-serve product-led growth',
    'Dedicated account manager',
    'In-app live chat support',
    'Email onboarding drip sequence',
    'Community forum & peer support',
    'White-glove onboarding call',
    'Knowledge base & docs',
    'Monthly check-in cadence',
    'Co-creation / beta program',
    'Loyalty / referral rewards',
  ],
  channels: [
    'Organic SEO & blog content',
    'LinkedIn outbound',
    'Product Hunt launch',
    'Twitter / X community',
    'Email cold outreach',
    'Partner referrals',
    'App marketplace listing',
    'Paid social ads',
    'Podcast sponsorships',
    'Word-of-mouth & virality',
  ],
  segments: [
    'Bootstrapped B2B SaaS founders',
    'Solopreneur freelancers',
    'Enterprise innovation teams',
    'Early-stage startups (pre-seed)',
    'SMBs in [specific vertical]',
    'Power users of [competing tool]',
    'Gen Z creators & influencers',
    'Non-technical operators',
    'Remote-first teams',
    'Agencies serving [niche]',
  ],
  costs: [
    'Engineering salaries',
    'Cloud hosting & infra',
    'Customer acquisition cost (CAC)',
    'SaaS tools & subscriptions',
    'Customer support headcount',
    'Content production',
    'Legal & compliance',
    'Office / co-working',
    'Marketing & paid ads budget',
    'Third-party API fees',
  ],
  revenue: [
    'Monthly subscription (SaaS)',
    'Annual subscription (discounted)',
    'Usage-based / per-seat pricing',
    'One-time purchase',
    'Freemium → paid upgrade',
    'Transaction / GMV percentage',
    'Professional services / retainer',
    'Data licensing',
    'White-label licensing fee',
    'Advertising & sponsorships',
  ],
};

type BlockId = typeof BLOCKS[number]['id'];
type Values = Partial<Record<BlockId, string>>;

interface Props {
  idea: Idea;
  isActive?: boolean;
  onClose: () => void;
  onMakeActive?: (idea: Idea) => void;
  /** When true: loads canvas via community API, disables editing, hides save/versions */
  viewOnly?: boolean;
}

type Version = { key: string; name: string; saved_at: string; blocks: Values };
type SaveStatus = 'saved' | 'saving' | 'unsaved';

export default function IdeaCanvasModal({ idea, isActive, onClose, onMakeActive, viewOnly = false }: Props) {
  const [values, setValues]           = useState<Values>({});
  const [saveStatus, setSaveStatus]   = useState<SaveStatus>('saved');
  const [mounted, setMounted]         = useState(false);
  const [loading, setLoading]         = useState(true);
  // Versions
  const [versions, setVersions]       = useState<Version[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [savingVersion, setSavingVersion] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null);

  const saveTimers = useRef<Partial<Record<BlockId, ReturnType<typeof setTimeout>>>>({});
  const versionInputRef = useRef<HTMLInputElement>(null);
  const stageColor = STAGE_COLORS[idea.stage] ?? '#6366f1';

  // Mount animation
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Escape key closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Parse versions from shape entries
  const parseVersions = useCallback((entries: { field_key: string; content: string }[]): Version[] =>
    entries
      .filter(e => e.field_key.startsWith('bmc_snapshot_'))
      .map(e => { try { return { key: e.field_key, ...JSON.parse(e.content) } as Version; } catch { return null; } })
      .filter((v): v is Version => v !== null)
      .sort((a, b) => new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime()),
  []);

  // Load canvas data
  useEffect(() => {
    setLoading(true);
    if (viewOnly) {
      communityApi.getIdeaCanvas(idea.id)
        .then(res => { setValues(res.data.blocks ?? {}); })
        .catch(() => {})
        .finally(() => setLoading(false));
      return;
    }
    Promise.all([
      ideasApi.getEntries(idea.id, 'shape').catch(() => ({ data: { entries: [] } })),
      ideasApi.getEntries(idea.id, 'hone').catch(() => ({ data: { entries: [] } })),
    ]).then(([shapeRes, honeRes]) => {
      const shapeEntries = shapeRes.data.entries as { field_key: string; content: string }[];
      const loaded: Values = {};
      shapeEntries.forEach(e => {
        if (e.field_key.startsWith('bmc_') && !e.field_key.startsWith('bmc_snapshot_')) {
          const id = e.field_key.replace('bmc_', '') as BlockId;
          loaded[id] = e.content;
        }
      });
      const hone: Record<string, string> = {};
      (honeRes.data.entries as { field_key: string; content: string }[]).forEach(e => { hone[e.field_key] = e.content; });
      if (!loaded.value    && hone.what)    loaded.value    = hone.what;
      if (!loaded.segments && hone.who)     loaded.segments = hone.who;
      if (!loaded.cr       && hone.problem) loaded.cr       = `Problem we solve:\n${hone.problem}`;
      setValues(loaded);
      setVersions(parseVersions(shapeEntries));
    }).finally(() => setLoading(false));
  }, [idea.id, viewOnly, parseVersions]);

  const saveBlock = useCallback(async (id: BlockId, content: string) => {
    setSaveStatus('saving');
    try {
      await ideasApi.upsertEntry(idea.id, { stage: 'shape', field_key: `bmc_${id}`, content });
      setSaveStatus('saved');
    } catch { setSaveStatus('unsaved'); }
  }, [idea.id]);

  const handleChange = (id: BlockId, value: string) => {
    setValues(prev => ({ ...prev, [id]: value }));
    setSaveStatus('unsaved');
    clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(() => saveBlock(id, value), 1200);
  };

  const handleSaveVersion = async () => {
    if (!versionName.trim()) return;
    setSavingVersion(true);
    try {
      const snapshot = JSON.stringify({ name: versionName.trim(), saved_at: new Date().toISOString(), blocks: values });
      const key = `bmc_snapshot_${Date.now()}`;
      await ideasApi.upsertEntry(idea.id, { stage: 'shape', field_key: key, content: snapshot });
      const res = await ideasApi.getEntries(idea.id, 'shape');
      setVersions(parseVersions(res.data.entries));
      setVersionName('');
      setShowSaveDialog(false);
    } catch { /* ignore */ }
    finally { setSavingVersion(false); }
  };

  const handleRestoreVersion = async (version: Version) => {
    setRestoringVersion(version.key);
    setValues(version.blocks);
    setSaveStatus('saving');
    try {
      await Promise.all(
        (Object.entries(version.blocks) as [BlockId, string][]).map(([blockId, content]) =>
          ideasApi.upsertEntry(idea.id, { stage: 'shape', field_key: `bmc_${blockId}`, content })
        )
      );
      setSaveStatus('saved');
      setShowVersions(false);
    } catch { setSaveStatus('unsaved'); }
    finally { setRestoringVersion(null); }
  };

  const completedBlocks = BLOCKS.filter(b => values[b.id]?.trim()).length;
  const completionPct   = Math.round((completedBlocks / BLOCKS.length) * 100);

  useEffect(() => {
    if (showSaveDialog) setTimeout(() => versionInputRef.current?.focus(), 50);
  }, [showSaveDialog]);

  return (
    <>
      {/* Global styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        .bmc-ta {
          resize: none; border: none; outline: none; background: transparent;
          font-family: 'Roboto', sans-serif; font-style: normal; width: 100%; height: 100%; line-height: 1.75;
        }
        .bmc-ta::-webkit-scrollbar { width: 3px; }
        .bmc-ta::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 99px; }
        .bmc-chips { display: flex; flex-wrap: wrap; gap: 4px; max-height: 0; overflow: hidden; transition: max-height 0.25s ease, opacity 0.2s ease; opacity: 0; }
        .bmc-chips.visible { max-height: 110px; opacity: 1; overflow-y: auto; }
        .bmc-chips::-webkit-scrollbar { width: 2px; }
        .bmc-chips::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 99px; }
        .bmc-chip {
          padding: 3px 9px; border-radius: 99px; font-size: 11px; font-weight: 500;
          cursor: pointer; white-space: nowrap; transition: all .15s; user-select: none;
          font-family: 'Roboto', sans-serif; border: 1.5px solid; letter-spacing: .01em;
        }
        .bmc-chip.light { background: rgba(0,0,0,0.04); color: rgba(0,0,0,0.4); border-color: rgba(0,0,0,0.1); }
        .bmc-chip.light:hover { background: rgba(0,0,0,0.09); color: rgba(0,0,0,0.72); border-color: rgba(0,0,0,0.18); transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
        .bmc-chip.dark { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); border-color: rgba(255,255,255,0.14); }
        .bmc-chip.dark:hover { background: rgba(255,255,255,0.18); color: rgba(255,255,255,0.9); border-color: rgba(255,255,255,0.28); transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
        .bmc-chip[draggable]:active { cursor: grabbing; opacity: 0.55; }
        .bmc-block { transition: box-shadow .2s ease; }
        .bmc-block:hover .bmc-num-badge { opacity: 1; }
        .version-card { background: #f8f8fa; border-radius: 12px; padding: 14px; margin-bottom: 8px; border: 1.5px solid transparent; transition: border-color .15s; }
        .version-card:hover { border-color: #e0e0e8; }
        .ver-restore-btn { padding: 6px 14px; border-radius: 8px; background: #000; color: #fff; border: none; font-size: 11px; font-weight: 700; cursor: pointer; transition: opacity .15s; }
        .ver-restore-btn:hover { opacity: 0.8; }
        .ver-restore-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        @keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
        .bmc-hero-shimmer {
          background: linear-gradient(105deg, transparent 40%, rgba(165,180,252,0.08) 50%, transparent 60%);
          background-size: 200% 100%;
          animation: shimmer 6s ease-in-out infinite;
        }
        .bmc-completion-segment { transition: opacity .3s ease; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(9,9,20,0.65)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Canvas container */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 401, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, pointerEvents: 'none' }}>
        <div style={{
          width: '100%', maxWidth: showVersions ? 1720 : 1440,
          height: '100%', maxHeight: '94vh',
          background: '#f5f5f7',
          borderRadius: 20,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)',
          pointerEvents: 'all',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
          transition: 'all 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>

          {/* ── Header ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '0 20px', height: 64, flexShrink: 0,
            borderBottom: '1px solid #d2d2d7',
            background: '#ffffff',
            position: 'relative',
          }}>
            {/* Stage-colored accent line at top */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${stageColor}, ${stageColor}aa, transparent)`, borderRadius: '24px 24px 0 0' }} />

            {/* Left */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #1e1b4b, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                  📊
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: 15, fontWeight: 900, color: '#111827', letterSpacing: -.4, lineHeight: 1 }}>Business Model Canvas</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: .3 }}>{idea.name}</span>
                </div>
              </div>
              <span style={{ width: 1, height: 22, background: '#e5e7eb', flexShrink: 0 }} />
              <span style={{ flexShrink: 0, padding: '4px 11px', borderRadius: 20, background: `${stageColor}15`, color: stageColor, fontSize: 11, fontWeight: 700, border: `1px solid ${stageColor}25` }}>
                {STAGE_LABELS[idea.stage]}
              </span>
            </div>

            {/* Center — segmented completion */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 3 }}>
                {BLOCKS.map((b, i) => (
                  <div
                    key={b.id}
                    className="bmc-completion-segment"
                    title={b.title}
                    style={{
                      width: 18, height: 5, borderRadius: 99,
                      background: values[b.id]?.trim() ? b.accent : '#e5e7eb',
                      opacity: values[b.id]?.trim() ? 1 : 0.5,
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: completionPct === 100 ? '#16a34a' : '#9ca3af', minWidth: 60 }}>
                {completionPct === 100 ? '✓ Complete' : `${completedBlocks}/${BLOCKS.length} filled`}
              </span>
              {!viewOnly && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
                  color: saveStatus === 'saved' ? '#22c55e' : saveStatus === 'saving' ? '#f59e0b' : '#9ca3af',
                  padding: '3px 9px', borderRadius: 20,
                  background: saveStatus === 'saved' ? '#f0fdf4' : saveStatus === 'saving' ? '#fffbeb' : '#f9fafb',
                  border: `1px solid ${saveStatus === 'saved' ? '#bbf7d0' : saveStatus === 'saving' ? '#fed7aa' : '#e5e7eb'}`,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', display: 'inline-block',
                    background: saveStatus === 'saved' ? '#22c55e' : saveStatus === 'saving' ? '#f59e0b' : '#d1d5db' }} />
                  {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : 'Unsaved'}
                </div>
              )}
              {viewOnly && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#9ca3af', padding: '3px 10px', borderRadius: 20, background: '#f5f5f7', border: '1px solid #e5e7eb' }}>
                  👁 View only
                </div>
              )}
            </div>

            {/* Right — actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {!viewOnly && (
                <>
                  {showSaveDialog ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        ref={versionInputRef}
                        value={versionName}
                        onChange={e => setVersionName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveVersion(); if (e.key === 'Escape') { setShowSaveDialog(false); setVersionName(''); } }}
                        placeholder="Snapshot name…"
                        style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid #e0e0e8', fontSize: 12, width: 160, outline: 'none', fontFamily: 'inherit' }}
                      />
                      <button onClick={handleSaveVersion} disabled={savingVersion || !versionName.trim()}
                        style={{ padding: '6px 14px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: savingVersion || !versionName.trim() ? 0.4 : 1 }}>
                        {savingVersion ? '…' : 'Save'}
                      </button>
                      <button onClick={() => { setShowSaveDialog(false); setVersionName(''); }}
                        style={{ padding: '6px 10px', borderRadius: 8, background: '#f5f5f7', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#6e6e73' }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setShowSaveDialog(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, background: '#f5f5f7', border: '1px solid #e5e7eb', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#374151', transition: 'all .12s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#ebebef'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f5f5f7'; e.currentTarget.style.borderColor = '#e5e7eb'; }}>
                      📸 Save snapshot
                    </button>
                  )}
                  <button onClick={() => setShowVersions(v => !v)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, background: showVersions ? '#1e1b4b' : '#f5f5f7', color: showVersions ? '#c4b5fd' : '#374151', border: showVersions ? '1px solid #312e81' : '1px solid #e5e7eb', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .15s' }}>
                    🕐 Snapshots{versions.length > 0 ? ` (${versions.length})` : ''}
                  </button>
                  {!isActive && onMakeActive && (
                    <button onClick={() => onMakeActive(idea)}
                      style={{ padding: '6px 14px', borderRadius: 8, background: `${stageColor}12`, color: stageColor, border: `1px solid ${stageColor}28`, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .12s' }}>
                      Set active
                    </button>
                  )}
                  {isActive && (
                    <div style={{ padding: '6px 12px', borderRadius: 8, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontSize: 12, fontWeight: 700 }}>
                      ● Active
                    </div>
                  )}
                </>
              )}
              <button
                onClick={onClose}
                style={{ width: 32, height: 32, borderRadius: 8, background: '#f5f5f7', border: '1px solid #e5e7eb', color: '#6b7280', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fecaca'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f5f5f7'; e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── Body row: grid + optional versions panel ── */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* ── Canvas grid ── */}
            {loading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14, background: '#f8fafc' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 10, opacity: .5 }}>📊</div>
                  <div style={{ fontWeight: 600 }}>Loading canvas…</div>
                </div>
              </div>
            ) : (
              <div style={{
                flex: 1,
                display: 'grid',
                gap: 8,
                padding: 10,
                background: '#d2d2d7',
                gridTemplateColumns: '1fr 1fr 1.5fr 1fr 1.2fr',
                gridTemplateRows: '1fr 1fr minmax(100px, 0.48fr)',
                gridTemplateAreas: `
                  "partners activities value cr       segments"
                  "partners resources  value channels segments"
                  "costs    costs      costs revenue  revenue"
                `,
                overflow: 'hidden',
              }}>
                {BLOCKS.map(block => (
                  <CanvasBlock
                    key={block.id}
                    block={block}
                    value={values[block.id] ?? ''}
                    onChange={v => handleChange(block.id, v)}
                    onAppend={chip => {
                      const cur = values[block.id] ?? '';
                      // Strip bullet prefixes from existing lines and check for exact match
                      const existing = cur.split('\n').map(l => l.replace(/^[•\-\*]\s*/, '').trim());
                      if (existing.includes(chip.trim())) return;
                      handleChange(block.id, cur ? `${cur}\n• ${chip}` : `• ${chip}`);
                    }}
                    suggestions={SUGGESTIONS[block.id] ?? []}
                    isValueProp={block.id === 'value'}
                    viewOnly={viewOnly}
                  />
                ))}
              </div>
            )}

            {/* ── Versions panel ── */}
            {showVersions && (
              <div style={{
                width: 290, flexShrink: 0,
                background: '#f5f5f7',
                borderLeft: '1px solid #d2d2d7',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
              }}>
                <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #eeeff6', flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#111827', marginBottom: 3 }}>📸 Snapshots</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Restore your canvas to a previous version</div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                  {versions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 12px' }}>
                      <div style={{ fontSize: 32, marginBottom: 10, opacity: .5 }}>📸</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>No snapshots yet</div>
                      <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>
                        Hit "Save snapshot" in the header to capture the current state of your canvas.
                      </div>
                    </div>
                  ) : (
                    versions.map((v, i) => {
                      const date = new Date(v.saved_at);
                      const filled = Object.values(v.blocks).filter(x => x?.trim()).length;
                      return (
                        <div key={v.key} className="version-card">
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 13, color: '#111827', marginBottom: 3 }}>{v.name}</div>
                              <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>
                                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                {' · '}
                                {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            {i === 0 && (
                              <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                                LATEST
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>{filled}/{BLOCKS.length} blocks filled</div>
                          <button className="ver-restore-btn" onClick={() => handleRestoreVersion(v)} disabled={restoringVersion === v.key}>
                            {restoringVersion === v.key ? 'Restoring…' : '↩ Restore this version'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
                <div style={{ padding: '10px 12px', borderTop: '1px solid #eeeff6', flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: '#c0c0c8', lineHeight: 1.5 }}>
                    Restoring overwrites your current draft. Save a snapshot first if you want to keep it.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div style={{
            padding: '7px 20px',
            borderTop: '1px solid #d2d2d7',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0, background: '#ffffff',
          }}>
            <div style={{ fontSize: 10, color: '#c0c0c8', fontWeight: 500 }}>
              {viewOnly
                ? `Viewing Business Model Canvas · Read only`
                : 'Hover a block for suggestions · Click or drag a chip to add · Auto-saves as you type'}
            </div>
            <div style={{ fontSize: 10, color: '#c0c0c8', fontWeight: 500 }}>
              Esc to close · {idea.name}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Individual canvas block ───────────────────────────────────────────────────
function CanvasBlock({
  block, value, onChange, onAppend, suggestions, isValueProp, viewOnly,
}: {
  block: typeof BLOCKS[number];
  value: string;
  onChange: (v: string) => void;
  onAppend: (chip: string) => void;
  suggestions: string[];
  isValueProp: boolean;
  viewOnly?: boolean;
}) {
  const [focused, setFocused]       = useState(false);
  const [hovered, setHovered]       = useState(false);
  const [dragOver, setDragOver]     = useState(false);
  const [showTip, setShowTip]       = useState(false);
  const [tipPos, setTipPos]         = useState({ top: 0, left: 0, flip: false });
  const textareaRef                 = useRef<HTMLTextAreaElement>(null);
  const infoRef                     = useRef<HTMLButtonElement>(null);
  const isDark                      = block.isDark;

  const openTip = () => {
    if (!infoRef.current) return;
    const r    = infoRef.current.getBoundingClientRect();
    const TW   = 280; // tooltip width
    const TH   = 240; // estimated tooltip height
    const PAD  = 12;  // min gap from viewport edge

    // Horizontal: start aligned to button left, clamp so it never leaves viewport
    let left = r.left;
    if (left + TW > window.innerWidth - PAD) left = window.innerWidth - TW - PAD;
    if (left < PAD) left = PAD;

    // Vertical: prefer below button, flip above if not enough space
    let top = r.bottom + 8;
    if (top + TH > window.innerHeight - PAD) top = r.top - TH - 8;
    if (top < PAD) top = PAD;

    setTipPos({ top, left, flip: false });
    setShowTip(true);
  };

  const showChips = !viewOnly && (focused || hovered);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const chip = e.dataTransfer.getData('text/plain');
    if (chip) onAppend(chip);
  };

  // Auto-bullet: start with • on first focus of empty block
  const handleFocus = () => {
    if (viewOnly) return;
    setFocused(true);
    if (!value) {
      onChange('• ');
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = 2;
          textareaRef.current.selectionEnd   = 2;
        }
      });
    }
  };

  // Auto-bullet: press Enter → new bullet on next line
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (viewOnly) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const ta = textareaRef.current!;
      const start = ta.selectionStart;
      const end   = ta.selectionEnd;
      const insert = '\n• ';
      const newVal = ta.value.slice(0, start) + insert + ta.value.slice(end);
      onChange(newVal);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          const pos = start + insert.length;
          textareaRef.current.selectionStart = pos;
          textareaRef.current.selectionEnd   = pos;
        }
      });
    }
    // Backspace at start of a bullet line removes the bullet prefix
    if (e.key === 'Backspace') {
      const ta = textareaRef.current!;
      const start = ta.selectionStart;
      const end   = ta.selectionEnd;
      if (start === end) {
        const before = ta.value.slice(0, start);
        if (before.endsWith('\n• ')) {
          e.preventDefault();
          const newVal = ta.value.slice(0, start - 3) + ta.value.slice(end);
          onChange(newVal);
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              const pos = start - 3;
              textareaRef.current.selectionStart = pos;
              textareaRef.current.selectionEnd   = pos;
            }
          });
        } else if (before === '• ') {
          e.preventDefault();
          onChange('');
        }
      }
    }
  };

  return (
    <div
      className="bmc-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={{
        gridArea: block.area,
        background: block.bg,
        borderRadius: 10,
        padding: isValueProp ? '18px 16px 14px' : '14px 14px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: isValueProp ? 10 : 7,
        position: 'relative',
        transition: 'box-shadow .2s ease, transform .15s ease',
        boxShadow: focused
          ? `0 0 0 2px ${block.accent}55, 0 4px 16px rgba(0,0,0,0.10)`
          : dragOver
          ? `0 0 0 2px ${block.accent}, 0 4px 16px rgba(0,0,0,0.10)`
          : hovered
          ? `0 4px 14px rgba(0,0,0,0.08), 0 0 0 1px ${block.accent}28`
          : '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.06)',
        transform: hovered && !focused ? 'translateY(-1px)' : 'translateY(0)',
        overflow: 'hidden',
      }}
    >
      {/* Coloured top accent bar per card */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: block.accent, borderRadius: '10px 10px 0 0', opacity: 0.7 }} />

      {/* Block header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, position: 'relative', zIndex: 1 }}>
        {/* Number badge */}
        <div className="bmc-num-badge" style={{
          width: 20, height: 20, borderRadius: 6,
          background: isDark ? 'rgba(255,255,255,0.14)' : `${block.accent}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 900, color: isDark ? 'rgba(255,255,255,0.55)' : block.accent,
          letterSpacing: .3, flexShrink: 0,
          transition: 'opacity .15s',
        }}>
          {block.num}
        </div>
        <span style={{ fontSize: isValueProp ? 16 : 13 }}>{block.icon}</span>
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          color: block.fg,
          fontFamily: "'Roboto', sans-serif",
          letterSpacing: .2,
          lineHeight: 1,
        }}>
          {block.title}
        </span>

        {/* Info button */}
        <button
          ref={infoRef}
          onMouseEnter={openTip}
          onMouseLeave={() => setShowTip(false)}
          onClick={openTip}
          style={{
            marginLeft: 4, width: 15, height: 15, borderRadius: '50%', flexShrink: 0,
            background: `${block.accent}18`, border: `1px solid ${block.accent}40`,
            color: block.accent, fontSize: 9, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1, padding: 0, fontFamily: 'sans-serif',
          }}
        >
          i
        </button>

        {/* Filled indicator dot */}
        {value.trim() && (
          <div style={{
            marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%',
            background: block.accent, flexShrink: 0,
            boxShadow: `0 0 0 2px ${block.accent}30`,
          }} />
        )}
      </div>

      {/* Tooltip rendered into document.body via portal — escapes all stacking contexts */}
      {showTip && createPortal(
        <div
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}
          style={{
            position: 'fixed',
            top: tipPos.top,
            left: tipPos.left,
            width: 280,
            background: '#1e293b',
            color: '#e2e8f0',
            borderRadius: 10,
            padding: '14px 16px',
            fontSize: 12,
            lineHeight: 1.65,
            fontFamily: "'Roboto', sans-serif",
            fontWeight: 400,
            zIndex: 99999,
            boxShadow: '0 8px 32px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.06)',
            pointerEvents: 'auto',
            whiteSpace: 'pre-line',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 14 }}>{block.icon}</span>
            <span style={{ fontWeight: 700, fontSize: 12, color: '#f1f5f9', letterSpacing: .1 }}>{block.title}</span>
          </div>
          <div style={{ color: '#cbd5e1' }}>{'explainer' in block ? (block as any).explainer : block.hint}</div>
        </div>,
        document.body
      )}

      {/* Suggestion chips */}
      {suggestions.length > 0 && (() => {
        const existing = new Set(
          value.split('\n').map(l => l.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean)
        );
        return (
          <div className={`bmc-chips${showChips ? ' visible' : ''}`} style={{ position: 'relative', zIndex: 1 }}>
            {suggestions.map(chip => {
              const added = existing.has(chip.trim());
              return (
                <button
                  key={chip}
                  className={`bmc-chip ${isDark ? 'dark' : 'light'}${added ? ' added' : ''}`}
                  draggable={!added}
                  onDragStart={e => {
                    if (added) { e.preventDefault(); return; }
                    e.dataTransfer.setData('text/plain', chip);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => { if (!added) { onAppend(chip); textareaRef.current?.focus(); } }}
                  title={added ? 'Already added' : 'Click to add · Drag to another block'}
                  style={{ cursor: added ? 'default' : 'pointer', opacity: added ? 0.45 : 1 }}
                >
                  {added ? `✓ ${chip}` : `+ ${chip}`}
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        className={`bmc-ta${isDark ? ' dark' : ''}`}
        value={value}
        onChange={e => !viewOnly && onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder={viewOnly ? (value ? '' : '—') : `• ${block.hint}`}
        readOnly={viewOnly}
        style={{
          flex: 1,
          color: value ? block.fg : `${block.fg}50`,
          fontFamily: "'Roboto', sans-serif",
          fontSize: 13,
          fontWeight: 400,
          lineHeight: 1.7,
          letterSpacing: .1,
          cursor: viewOnly ? 'default' : 'text',
          position: 'relative', zIndex: 1,
        }}
      />

      {/* Drop overlay */}
      {dragOver && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${block.accent}12`,
          backdropFilter: 'blur(2px)',
          pointerEvents: 'none',
          fontSize: 12, fontWeight: 800,
          color: block.fg,
          letterSpacing: .2,
          zIndex: 10,
        }}>
          ↓ Drop to add
        </div>
      )}
    </div>
  );
}
