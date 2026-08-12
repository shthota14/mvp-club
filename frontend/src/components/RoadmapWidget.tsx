import { useState } from 'react';
import type { EffortResult, FounderProfile, IdeaAnswers } from './FounderWizardModal';
import { calcEffort } from './FounderWizardModal';

const STAGE_META = {
  idea:     { icon: '💡', label: 'Idea',     color: '#2563eb', tasks: ['Define your one-liner', 'Articulate the core problem', 'Identify your target customer'] },
  hone:     { icon: '🎯', label: 'Hone',     color: '#7c3aed', tasks: ['Write your problem statement', 'Define who exactly you\'re targeting', 'Map the customer\'s pain journey', 'Articulate your unfair advantage'] },
  validate: { icon: '🧪', label: 'Validate', color: '#059669', tasks: ['Identify 10 target customers', 'Run discovery interviews', 'Create a landing page', 'Build a waitlist', 'Analyse feedback patterns', 'Smoke test willingness to pay'] },
  shape:    { icon: '🔨', label: 'Shape',    color: '#d97706', tasks: ['Define MVP feature set', 'Create wireframes/prototype', 'Set up technical stack', 'Build core workflow', 'Design billing & auth', 'Internal testing'] },
  ship:     { icon: '🚀', label: 'Ship',     color: '#1d1d1f', tasks: ['Launch to beta users', 'Gather product feedback', 'Iterate on core features', 'Set up analytics', 'Acquire first paying customers', 'Establish growth loop'] },
};

const CONFIDENCE_LABEL = {
  high:   { label: 'High confidence',   color: '#059669', bg: '#f0fdf4' },
  medium: { label: 'Medium confidence', color: '#d97706', bg: '#fffbeb' },
  low:    { label: 'Low confidence',    color: '#dc2626', bg: '#fef2f2' },
};

const STAGE_ORDER = ['idea', 'hone', 'validate', 'shape', 'ship'] as const;

interface Props {
  result:   EffortResult;
  profile:  FounderProfile;
  answers:  IdeaAnswers;
  ideaName: string;
  onRecalculate: () => void;
  onClose:  () => void;
}

export default function RoadmapWidget({ result, profile, answers, ideaName, onRecalculate, onClose }: Props) {
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [hpw, setHpw] = useState(profile.hoursPerWeek);

  // Live recalculate when hours/week changes
  const liveResult = hpw === profile.hoursPerWeek ? result : (() => {
    const r = calcEffort({ ...profile, hoursPerWeek: hpw }, answers);
    return r;
  })();

  const maxHours = Math.max(...STAGE_ORDER.map(s => liveResult.stages[s].hours));

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 500, backdropFilter: 'blur(8px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '90%', maxWidth: 600, background: '#fff', borderRadius: 24,
        boxShadow: '0 32px 80px rgba(0,0,0,.22)', zIndex: 501, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', maxHeight: '92vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {/* Gradient bar */}
        <div style={{ height: 4, background: 'linear-gradient(90deg,#2563eb,#7c3aed,#059669,#d97706,#1d1d1f)' }} />

        {/* Header */}
        <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid #f0f0f5', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#8e8e93', marginBottom: 4 }}>Your Roadmap</div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -.4, color: '#1d1d1f' }}>{ideaName}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onRecalculate} style={{ padding: '7px 14px', borderRadius: 100, border: '1.5px solid #e5e5ea', background: '#fff', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: '#6e6e73', cursor: 'pointer' }}>
                ✏️ Recalculate
              </button>
              <button onClick={onClose} style={{ background: '#f5f5f7', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#6e6e73', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          </div>

          {/* Summary stats */}
          <div style={{ display: 'flex', gap: 0, background: '#f9f9fb', borderRadius: 14, overflow: 'hidden', border: '1.5px solid #ebebf0' }}>
            {[
              { val: `${liveResult.totalHours}h`, lbl: 'Total effort' },
              { val: `${liveResult.weeksTotal}w`, lbl: 'Estimated weeks', highlight: true },
              { val: `${hpw}h/wk`, lbl: 'Your availability' },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, padding: '12px 16px', borderRight: i < 2 ? '1px solid #ebebf0' : 'none', textAlign: 'center' as const }}>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -.5, color: s.highlight ? '#7c3aed' : '#1d1d1f' }}>{s.val}</div>
                <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 2 }}>{s.lbl}</div>
              </div>
            ))}
          </div>

          {/* Hours/week slider */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93' }}>Adjust availability</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed' }}>{hpw} hrs/week → {liveResult.weeksTotal} weeks</span>
            </div>
            <input
              type="range" min={5} max={40} step={5} value={hpw}
              onChange={e => setHpw(Number(e.target.value) as FounderProfile['hoursPerWeek'])}
              style={{ width: '100%', accentColor: '#7c3aed' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#c0c0c8', marginTop: 2 }}>
              <span>5h/wk</span><span>10h</span><span>20h</span><span>40h</span>
            </div>
          </div>
        </div>

        {/* Stage bars — scrollable */}
        <div style={{ overflowY: 'auto' as const, flex: 1, padding: '18px 26px 8px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' as const, color: '#b0b0b8', marginBottom: 14 }}>Effort breakdown by stage</div>

          {STAGE_ORDER.map(stageKey => {
            const meta  = STAGE_META[stageKey];
            const est   = liveResult.stages[stageKey];
            const conf  = CONFIDENCE_LABEL[est.confidence];
            const weeks = est.weeksAt(hpw);
            const barPct = Math.round((est.hours / maxHours) * 100);
            const isOpen = expandedStage === stageKey;

            return (
              <div key={stageKey} style={{ marginBottom: 12 }}>
                <button
                  onClick={() => setExpandedStage(isOpen ? null : stageKey)}
                  style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' as const }}
                >
                  {/* Stage header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                      {meta.icon}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', flex: 1 }}>{meta.label}</span>
                    <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 100, background: conf.bg, color: conf.color, fontWeight: 600 }}>{conf.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: meta.color, minWidth: 60, textAlign: 'right' as const }}>{est.hours}h · {weeks}w</span>
                    <span style={{ fontSize: 12, color: '#c0c0c8', transition: 'transform .2s', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                  </div>

                  {/* Bar */}
                  <div style={{ height: 10, borderRadius: 5, background: '#f0f0f5', overflow: 'hidden', marginLeft: 34 }}>
                    <div style={{ height: '100%', width: `${barPct}%`, background: meta.color, borderRadius: 5, opacity: 0.75, transition: 'width .4s' }} />
                  </div>
                </button>

                {/* Expanded task list */}
                {isOpen && (
                  <div style={{ marginLeft: 34, marginTop: 10, padding: '12px 14px', background: `${meta.color}08`, borderRadius: 10, border: `1.5px solid ${meta.color}20` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: meta.color, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 }}>Recommended activities</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {meta.tasks.map(task => (
                        <div key={task} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#3a3a3c' }}>
                          <span style={{ color: meta.color, flexShrink: 0, marginTop: 1 }}>•</span>
                          {task}
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#fff', border: `1px solid ${meta.color}20`, fontSize: 12, color: '#6e6e73' }}>
                      ⏱ Estimated: <strong style={{ color: meta.color }}>{est.hours} hours</strong> · ~{weeks} week{weeks !== 1 ? 's' : ''} at {hpw}h/wk
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* AI rationale */}
          <div style={{ margin: '16px 0', padding: '14px 16px', borderRadius: 12, background: '#f9f9fb', border: '1.5px solid #ebebf0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#b0b0b8', letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 6 }}>AI Assessment</div>
            <div style={{ fontSize: 13, color: '#3a3a3c', lineHeight: 1.65 }}>{liveResult.rationale}</div>
          </div>

          <div style={{ height: 8 }} />
        </div>
      </div>
    </>
  );
}
