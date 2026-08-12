import { useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface FounderProfile {
  experience:  'first' | 'side' | 'previous' | 'serial';
  technical:   'none' | 'ai' | 'dev' | 'team';
  hoursPerWeek: 5 | 10 | 20 | 40;
}

export interface IdeaAnswers {
  productType: 'saas' | 'mobile' | 'marketplace' | 'ai_tool' | 'chrome' | 'api' | 'physical' | 'other';
  maturity:    'thought' | 'concept' | 'know_problem' | 'has_users' | 'built';
  complexity:  '1-3' | '4-6' | '7-10' | '10+';
  validation:  Array<'interviewed' | 'waitlist' | 'audience' | 'revenue'>;
}

export interface StageEstimate {
  hours:      number;
  confidence: 'high' | 'medium' | 'low';
  weeksAt:    (hpw: number) => number;
}

export interface EffortResult {
  stages:      Record<'idea' | 'hone' | 'validate' | 'shape' | 'ship', StageEstimate>;
  totalHours:  number;
  weeksTotal:  number;
  rationale:   string;
}

// ── Effort engine ────────────────────────────────────────────────────────────

const BASE: Record<string, number> = {
  idea: 2, hone: 8, validate: 30, shape: 18, ship: 80,
};

const PRODUCT_MX: Record<string, { shape: number; ship: number }> = {
  saas:        { shape: 1.0, ship: 1.0  },
  mobile:      { shape: 1.2, ship: 1.3  },
  marketplace: { shape: 1.5, ship: 1.6  },
  ai_tool:     { shape: 1.1, ship: 1.1  },
  chrome:      { shape: 0.7, ship: 0.7  },
  api:         { shape: 0.8, ship: 0.8  },
  physical:    { shape: 2.0, ship: 2.5  },
  other:       { shape: 1.0, ship: 1.0  },
};

const MATURITY_MX: Record<string, number> = {
  thought: 1.0, concept: 0.7, know_problem: 0.4, has_users: 0.2, built: 0.1,
};

const EXP_MX: Record<string, number> = {
  first: 1.3, side: 1.0, previous: 0.8, serial: 0.65,
};

const TECH_MX: Record<string, number> = {
  none: 1.5, ai: 1.1, dev: 0.8, team: 0.6,
};

const COMPLEXITY_MX: Record<string, number> = {
  '1-3': 0.7, '4-6': 1.0, '7-10': 1.5, '10+': 2.2,
};

const VAL_REDUCTION: Record<string, number> = {
  interviewed: 8, waitlist: 5, audience: 6, revenue: 15,
};

export function calcEffort(profile: FounderProfile, idea: IdeaAnswers): EffortResult {
  const mat  = MATURITY_MX[idea.maturity]    ?? 1.0;
  const exp  = EXP_MX[profile.experience]    ?? 1.0;
  const tech = TECH_MX[profile.technical]    ?? 1.0;
  const prod = PRODUCT_MX[idea.productType]  ?? { shape: 1.0, ship: 1.0 };
  const cpx  = COMPLEXITY_MX[idea.complexity] ?? 1.0;
  const valRed = idea.validation.reduce((s, v) => s + (VAL_REDUCTION[v] ?? 0), 0);

  const r = (n: number) => Math.round(n);

  const ideaH     = Math.max(1,  r(BASE.idea     * mat));
  const honeH     = Math.max(2,  r(BASE.hone     * mat * exp));
  const validateH = Math.max(5,  r(BASE.validate * exp - valRed));
  const shapeH    = Math.max(5,  r(BASE.shape    * prod.shape * cpx * tech * exp));
  const shipH     = Math.max(10, r(BASE.ship     * prod.ship  * cpx * tech * exp));

  const total = ideaH + honeH + validateH + shapeH + shipH;
  const weeks = Math.ceil(total / profile.hoursPerWeek);

  const wk = (h: number) => (hpw: number) => Math.ceil(h / hpw);

  const stages = {
    idea:     { hours: ideaH,     confidence: 'high'   as const, weeksAt: wk(ideaH)     },
    hone:     { hours: honeH,     confidence: 'high'   as const, weeksAt: wk(honeH)     },
    validate: { hours: validateH, confidence: 'medium' as const, weeksAt: wk(validateH) },
    shape:    { hours: shapeH,    confidence: 'high'   as const, weeksAt: wk(shapeH)    },
    ship:     { hours: shipH,     confidence: 'low'    as const, weeksAt: wk(shipH)     },
  };

  // Rationale
  const expLabel   = { first: 'a first-time founder', side: 'someone who has built a side project', previous: 'an experienced founder', serial: 'a serial founder' }[profile.experience] ?? 'a founder';
  const techLabel  = { none: 'no technical background', ai: 'AI-assisted development', dev: 'a software developer', team: 'a team of developers' }[profile.technical] ?? '';
  const prodLabel  = { saas: 'SaaS', mobile: 'mobile app', marketplace: 'marketplace', ai_tool: 'AI tool', chrome: 'Chrome extension', api: 'API product', physical: 'physical product', other: 'product' }[idea.productType] ?? 'product';
  const hpwLabel   = profile.hoursPerWeek === 40 ? 'full-time' : `${profile.hoursPerWeek} hrs/week`;
  const valSaved   = valRed > 0 ? ` Your existing validation work saves ~${valRed} hours.` : '';

  const rationale = `Based on your answers, you are ${expLabel} building a ${prodLabel} with ${techLabel}. Most effort goes into Ship (${shipH}h) and Validate (${validateH}h).${valSaved} Working ${hpwLabel}, we estimate ${weeks} weeks to launch your MVP — though Ship is the most variable phase.`;

  return { stages, totalHours: total, weeksTotal: weeks, rationale };
}

// Storage helpers (localStorage, keyed by conceptual user ID)
export function saveFounderProfile(userId: string, profile: FounderProfile) {
  localStorage.setItem(`fp_${userId}`, JSON.stringify(profile));
}
export function loadFounderProfile(userId: string): FounderProfile | null {
  try { return JSON.parse(localStorage.getItem(`fp_${userId}`) ?? 'null'); } catch { return null; }
}
export function saveIdeaAnswers(ideaId: string, answers: IdeaAnswers) {
  localStorage.setItem(`ia_${ideaId}`, JSON.stringify(answers));
}
export function loadIdeaAnswers(ideaId: string): IdeaAnswers | null {
  try { return JSON.parse(localStorage.getItem(`ia_${ideaId}`) ?? 'null'); } catch { return null; }
}

// ── Wizard UI ────────────────────────────────────────────────────────────────

const AC = '#7c3aed';

function OptionBtn({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '12px 16px', borderRadius: 12, fontFamily: 'inherit',
        border: `2px solid ${selected ? AC : '#e5e5ea'}`,
        background: selected ? `${AC}0d` : '#fafafa',
        color: selected ? AC : '#3a3a3c',
        fontSize: 14, fontWeight: selected ? 700 : 500,
        cursor: 'pointer', textAlign: 'left' as const,
        transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 10,
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        border: `2px solid ${selected ? AC : '#d2d2d7'}`,
        background: selected ? AC : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {selected && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', display: 'block' }} />}
      </span>
      {children}
    </button>
  );
}

function MultiBtn({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '12px 16px', borderRadius: 12, fontFamily: 'inherit',
        border: `2px solid ${selected ? AC : '#e5e5ea'}`,
        background: selected ? `${AC}0d` : '#fafafa',
        color: selected ? AC : '#3a3a3c',
        fontSize: 14, fontWeight: selected ? 700 : 500,
        cursor: 'pointer', textAlign: 'left' as const,
        transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 10,
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
        border: `2px solid ${selected ? AC : '#d2d2d7'}`,
        background: selected ? AC : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {selected && <span style={{ color: '#fff', fontSize: 12, fontWeight: 800, lineHeight: 1 }}>✓</span>}
      </span>
      {children}
    </button>
  );
}

interface WizardProps {
  userId:    string;
  ideaId:    string;
  ideaName:  string;
  initialProfile?: FounderProfile | null;
  initialAnswers?: IdeaAnswers | null;
  onDone:    (result: EffortResult, profile: FounderProfile, answers: IdeaAnswers) => void;
  onClose:   () => void;
}

export default function FounderWizardModal({ userId, ideaId, ideaName, initialProfile, initialAnswers, onDone, onClose }: WizardProps) {
  const [step, setStep] = useState(0);

  // Idea-specific answers
  const [productType, setProductType] = useState<IdeaAnswers['productType']>(initialAnswers?.productType ?? 'saas');
  const [maturity,    setMaturity]    = useState<IdeaAnswers['maturity']>(initialAnswers?.maturity ?? 'concept');
  const [complexity,  setComplexity]  = useState<IdeaAnswers['complexity']>(initialAnswers?.complexity ?? '4-6');
  const [validation,  setValidation]  = useState<IdeaAnswers['validation']>(initialAnswers?.validation ?? []);

  // Founder profile
  const [experience,   setExperience]   = useState<FounderProfile['experience']>(initialProfile?.experience ?? 'first');
  const [technical,    setTechnical]    = useState<FounderProfile['technical']>(initialProfile?.technical ?? 'dev');
  const [hoursPerWeek, setHoursPerWeek] = useState<FounderProfile['hoursPerWeek']>(initialProfile?.hoursPerWeek ?? 10);

  const toggleVal = (v: IdeaAnswers['validation'][number]) => {
    setValidation(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  };

  const steps = [
    {
      title: 'What are you building?',
      sub: 'This affects complexity of Shape and Ship phases.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {([
            ['saas',        '🖥',  'SaaS',           'Web-based subscription product'],
            ['mobile',      '📱',  'Mobile app',     'iOS or Android application'],
            ['marketplace', '🏪',  'Marketplace',    'Connects buyers and sellers'],
            ['ai_tool',     '🤖',  'AI Tool',        'AI-powered product or feature'],
            ['chrome',      '🔌',  'Chrome Extension','Browser add-on'],
            ['api',         '⚡',  'API / Platform', 'Developer-facing product'],
            ['physical',    '📦',  'Physical product','Hardware or physical goods'],
            ['other',       '💡',  'Other',          'Something else'],
          ] as const).map(([val, icon, label, sub]) => (
            <OptionBtn key={val} selected={productType === val} onClick={() => setProductType(val)}>
              <span style={{ fontSize: 18, width: 24, textAlign: 'center' as const }}>{icon}</span>
              <span>
                <span style={{ fontWeight: 700 }}>{label}</span>
                <span style={{ fontSize: 12, color: '#8e8e93', display: 'block', marginTop: 1 }}>{sub}</span>
              </span>
            </OptionBtn>
          ))}
        </div>
      ),
    },
    {
      title: 'How developed is your idea?',
      sub: 'This reduces effort in early stages.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {([
            ['thought',      '💭', 'Just a thought',         'A vague notion, not fully formed'],
            ['concept',      '📝', 'Rough concept',          'I have a sense of the problem and solution'],
            ['know_problem', '🎯', 'I know the problem well','Clear problem space, solution TBD'],
            ['has_users',    '👥', 'I already have users',   'Real people are waiting or using something'],
            ['built',        '🔨', 'I\'ve built something',  'Code, prototype, or product exists'],
          ] as const).map(([val, icon, label, sub]) => (
            <OptionBtn key={val} selected={maturity === val} onClick={() => setMaturity(val)}>
              <span style={{ fontSize: 18, width: 24, textAlign: 'center' as const }}>{icon}</span>
              <span>
                <span style={{ fontWeight: 700 }}>{label}</span>
                <span style={{ fontSize: 12, color: '#8e8e93', display: 'block', marginTop: 1 }}>{sub}</span>
              </span>
            </OptionBtn>
          ))}
        </div>
      ),
    },
    {
      title: 'Have you built products before?',
      sub: 'Experience reduces estimated effort across all stages.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {([
            ['first',    '🌱', 'First time',       'Never shipped a real product'],
            ['side',     '🛠', 'Side project',     'Shipped something, not a business'],
            ['previous', '🚀', 'Previous startup', 'Ran a startup before'],
            ['serial',   '⚡', 'Serial founder',   'Multiple startups under your belt'],
          ] as const).map(([val, icon, label, sub]) => (
            <OptionBtn key={val} selected={experience === val} onClick={() => setExperience(val)}>
              <span style={{ fontSize: 18, width: 24, textAlign: 'center' as const }}>{icon}</span>
              <span>
                <span style={{ fontWeight: 700 }}>{label}</span>
                <span style={{ fontSize: 12, color: '#8e8e93', display: 'block', marginTop: 1 }}>{sub}</span>
              </span>
            </OptionBtn>
          ))}
        </div>
      ),
    },
    {
      title: 'Who will build this?',
      sub: 'Technical ability affects Shape and Ship effort.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {([
            ['none', '🤷', 'No technical skills',  'Will hire or use no-code tools'],
            ['ai',   '🤖', 'Can build with AI',    'Vibe coding, Cursor, Bolt, etc.'],
            ['dev',  '💻', 'Software developer',   'Can build it myself'],
            ['team', '👥', 'Team of developers',   'Dedicated engineering team'],
          ] as const).map(([val, icon, label, sub]) => (
            <OptionBtn key={val} selected={technical === val} onClick={() => setTechnical(val)}>
              <span style={{ fontSize: 18, width: 24, textAlign: 'center' as const }}>{icon}</span>
              <span>
                <span style={{ fontWeight: 700 }}>{label}</span>
                <span style={{ fontSize: 12, color: '#8e8e93', display: 'block', marginTop: 1 }}>{sub}</span>
              </span>
            </OptionBtn>
          ))}
        </div>
      ),
    },
    {
      title: 'How many core features for your MVP?',
      sub: 'Fewer features = faster ship. Be ruthless.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {([
            ['1-3',  '🎯', '1–3 features',  'Ruthlessly minimal — the essence only'],
            ['4-6',  '📦', '4–6 features',  'Focused but functional'],
            ['7-10', '🏗', '7–10 features', 'Full-featured MVP'],
            ['10+',  '⚠️', 'More than 10',  'High risk — consider cutting scope'],
          ] as const).map(([val, icon, label, sub]) => (
            <OptionBtn key={val} selected={complexity === val} onClick={() => setComplexity(val)}>
              <span style={{ fontSize: 18, width: 24, textAlign: 'center' as const }}>{icon}</span>
              <span>
                <span style={{ fontWeight: 700 }}>{label}</span>
                <span style={{ fontSize: 12, color: '#8e8e93', display: 'block', marginTop: 1 }}>{sub}</span>
              </span>
            </OptionBtn>
          ))}
        </div>
      ),
    },
    {
      title: 'What do you already have?',
      sub: 'Select all that apply. These reduce validation effort.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {([
            ['interviewed', '🎤', 'Customers interviewed',  'Real conversations with target users'],
            ['waitlist',    '📋', 'Waiting list',           'People signed up to hear more'],
            ['audience',    '📣', 'Existing audience',      'Newsletter, social following, community'],
            ['revenue',     '💰', 'Revenue',                'Someone has already paid you'],
          ] as const).map(([val, icon, label, sub]) => (
            <MultiBtn key={val} selected={validation.includes(val as any)} onClick={() => toggleVal(val as any)}>
              <span style={{ fontSize: 18, width: 24, textAlign: 'center' as const }}>{icon}</span>
              <span>
                <span style={{ fontWeight: 700 }}>{label}</span>
                <span style={{ fontSize: 12, color: '#8e8e93', display: 'block', marginTop: 1 }}>{sub}</span>
              </span>
            </MultiBtn>
          ))}
          <div style={{ padding: '10px 16px', borderRadius: 12, background: '#f5f5f7', border: '1.5px solid #e5e5ea', fontSize: 13, color: '#8e8e93' }}>
            ☐ None of the above
          </div>
        </div>
      ),
    },
    {
      title: 'How much time can you dedicate?',
      sub: 'This converts effort hours into calendar weeks.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {([
            [5,  '🌙', '5 hrs/week',   'Evenings and weekends'],
            [10, '⏰', '10 hrs/week',  'Part-time commitment'],
            [20, '💪', '20 hrs/week',  'Serious side project'],
            [40, '🔥', 'Full-time',    '35–40 hrs/week'],
          ] as const).map(([val, icon, label, sub]) => (
            <OptionBtn key={val} selected={hoursPerWeek === val} onClick={() => setHoursPerWeek(val)}>
              <span style={{ fontSize: 18, width: 24, textAlign: 'center' as const }}>{icon}</span>
              <span style={{ flex: 1 }}>
                <span style={{ fontWeight: 700 }}>{label}</span>
                <span style={{ fontSize: 12, color: '#8e8e93', display: 'block', marginTop: 1 }}>{sub}</span>
              </span>
              {/* Show rough estimate hint */}
              {(() => {
                const profile: FounderProfile = { experience, technical, hoursPerWeek: val };
                const answers: IdeaAnswers = { productType, maturity, complexity, validation };
                const est = calcEffort(profile, answers);
                return (
                  <span style={{ fontSize: 12, fontWeight: 700, color: AC, flexShrink: 0 }}>
                    ~{est.weeksTotal}w
                  </span>
                );
              })()}
            </OptionBtn>
          ))}
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  const handleFinish = () => {
    const profile: FounderProfile = { experience, technical, hoursPerWeek };
    const answers: IdeaAnswers = { productType, maturity, complexity, validation };
    saveFounderProfile(userId, profile);
    saveIdeaAnswers(ideaId, answers);
    const result = calcEffort(profile, answers);
    onDone(result, profile, answers);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 500, backdropFilter: 'blur(8px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '90%', maxWidth: 520, background: '#fff', borderRadius: 24,
        boxShadow: '0 32px 80px rgba(0,0,0,.22)', zIndex: 501, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', maxHeight: '92vh',
      }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: '#f0f0f5' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: AC, transition: 'width .3s' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: AC, marginBottom: 6 }}>
              Step {step + 1} of {steps.length} · {ideaName}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -.5, color: '#1d1d1f', lineHeight: 1.25, marginBottom: 4 }}>
              {currentStep.title}
            </div>
            <div style={{ fontSize: 13, color: '#8e8e93', marginBottom: 16 }}>{currentStep.sub}</div>
          </div>
          <button onClick={onClose} style={{ background: '#f5f5f7', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#6e6e73', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}>✕</button>
        </div>

        {/* Content (scrollable) */}
        <div style={{ padding: '0 24px', overflowY: 'auto' as const, flex: 1 }}>
          {currentStep.content}
          <div style={{ height: 16 }} />
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f0f5', display: 'flex', gap: 10, flexShrink: 0 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid #e5e5ea', background: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#6e6e73', cursor: 'pointer' }}>
              ← Back
            </button>
          )}
          <button
            onClick={isLast ? handleFinish : () => setStep(s => s + 1)}
            style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: AC, color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'opacity .15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {isLast ? '🚀 Calculate my roadmap →' : 'Next →'}
          </button>
        </div>
      </div>
    </>
  );
}
