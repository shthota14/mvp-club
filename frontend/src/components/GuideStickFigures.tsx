// GuideStickFigures.tsx
// 2 whiteboard-style SVG scenes per guide (80 total)

import React from 'react';

// ── Primitives ────────────────────────────────────────────────────────────────

function Fig({ cx, gy = 140, c = '#1e293b', smile = true, raise = 'none' }:
  { cx: number; gy?: number; c?: string; smile?: boolean; raise?: 'left' | 'right' | 'both' | 'none' }) {
  const la = raise === 'left' || raise === 'both' ? [cx - 18, gy - 62] : [cx - 22, gy - 40];
  const ra = raise === 'right' || raise === 'both' ? [cx + 18, gy - 62] : [cx + 22, gy - 40];
  return (
    <g stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round">
      <circle cx={cx} cy={gy - 78} r="11" />
      {smile && <path d={`M${cx - 5} ${gy - 72} Q${cx} ${gy - 68} ${cx + 5} ${gy - 72}`} />}
      <line x1={cx} y1={gy - 67} x2={cx} y2={gy - 37} />
      <line x1={cx} y1={gy - 55} x2={la[0]} y2={la[1]} />
      <line x1={cx} y1={gy - 55} x2={ra[0]} y2={ra[1]} />
      <line x1={cx} y1={gy - 37} x2={cx - 15} y2={gy} />
      <line x1={cx} y1={gy - 37} x2={cx + 15} y2={gy} />
    </g>
  );
}

function Bubble({ x, y, w = 120, h = 30, lines, c = '#6366f1' }:
  { x: number; y: number; w?: number; h?: number; lines: string[]; c?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="8" fill={c} fillOpacity={0.12} stroke={c} strokeWidth="1.5" />
      {lines.map((t, i) => (
        <text key={i} x={x + 8} y={y + 14 + i * 13} fontSize="9.5" fontWeight="700" fill={c}>{t}</text>
      ))}
    </g>
  );
}

function ThinkBubble({ cx, cy, lines, c = '#6366f1' }:
  { cx: number; cy: number; lines: string[]; c?: string }) {
  const w = Math.max(...lines.map(l => l.length)) * 6 + 16;
  const h = lines.length * 14 + 10;
  return (
    <g>
      <circle cx={cx} cy={cy + 12} r="3" fill={c} fillOpacity={0.4} />
      <circle cx={cx + 4} cy={cy + 4} r="4" fill={c} fillOpacity={0.4} />
      <rect x={cx + 8} y={cy - h} width={w} height={h} rx="8" fill={c} fillOpacity={0.1} stroke={c} strokeWidth="1.5" />
      {lines.map((t, i) => (
        <text key={i} x={cx + 14} y={cy - h + 14 + i * 14} fontSize="9.5" fontWeight="700" fill={c}>{t}</text>
      ))}
    </g>
  );
}

function Label({ x, y, text, c = '#374151' }: { x: number; y: number; text: string; c?: string }) {
  return <text x={x} y={y} fontSize="10" fontWeight="800" fill={c} textAnchor="middle">{text}</text>;
}

function Arrow({ x1, y1, x2, y2, c = '#9ca3af' }: { x1: number; y1: number; x2: number; y2: number; c?: string }) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const ax = x2 - 10 * Math.cos(angle);
  const ay = y2 - 10 * Math.sin(angle);
  return (
    <g stroke={c} strokeWidth="2" fill="none">
      <line x1={x1} y1={y1} x2={ax} y2={ay} />
      <polygon points={`${x2},${y2} ${ax - 6 * Math.sin(angle)},${ay + 6 * Math.cos(angle)} ${ax + 6 * Math.sin(angle)},${ay - 6 * Math.cos(angle)}`} fill={c} stroke="none" />
    </g>
  );
}

function BG({ color = '#f8fafc' }: { color?: string }) {
  return <rect x="0" y="0" width="500" height="160" fill={color} rx="12" />;
}

function Ground({ y = 140, c = '#e5e7eb' }: { y?: number; c?: string }) {
  return <line x1="20" y1={y} x2="480" y2={y} stroke={c} strokeWidth="1.5" strokeDasharray="4 3" />;
}

function Coin({ x, y, size = 18, c = '#f59e0b' }: { x: number; y: number; size?: number; c?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={size} fill={c} fillOpacity={0.2} stroke={c} strokeWidth="2" />
      <text x={x} y={y + 5} fontSize="12" fontWeight="900" fill={c} textAnchor="middle">$</text>
    </g>
  );
}

function Lightbulb({ x, y, c = '#f59e0b' }: { x: number; y: number; c?: string }) {
  return (
    <g stroke={c} strokeWidth="2" fill="none">
      <circle cx={x} cy={y} r="12" fill={c} fillOpacity={0.18} stroke={c} />
      <line x1={x - 5} y1={y + 12} x2={x + 5} y2={y + 12} />
      <line x1={x - 4} y1={y + 16} x2={x + 4} y2={y + 16} />
      <line x1={x} y1={y - 18} x2={x} y2={y - 22} />
      <line x1={x + 12} y1={y} x2={x + 16} y2={y} />
      <line x1={x - 12} y1={y} x2={x - 16} y2={y} />
    </g>
  );
}

function Chart({ x, y, bars = [30, 50, 40, 70, 60], c = '#6366f1' }: { x: number; y: number; bars?: number[]; c?: string }) {
  return (
    <g>
      <line x1={x} y1={y - 70} x2={x} y2={y} stroke="#d1d5db" strokeWidth="1.5" />
      <line x1={x} y1={y} x2={x + bars.length * 16 + 8} y2={y} stroke="#d1d5db" strokeWidth="1.5" />
      {bars.map((h, i) => (
        <rect key={i} x={x + 6 + i * 16} y={y - h} width="10" height={h} fill={c} fillOpacity={0.3 + i * 0.1} rx="2" />
      ))}
    </g>
  );
}

function Rocket({ x, y, c = '#6366f1' }: { x: number; y: number; c?: string }) {
  return (
    <g fill={c} fillOpacity={0.15} stroke={c} strokeWidth="2">
      <ellipse cx={x} cy={y} rx="9" ry="18" />
      <path d={`M${x - 9} ${y + 14} L${x - 16} ${y + 24} L${x} ${y + 18} Z`} />
      <path d={`M${x + 9} ${y + 14} L${x + 16} ${y + 24} L${x} ${y + 18} Z`} />
      <circle cx={x} cy={y - 2} r="5" fill={c} fillOpacity={0.4} />
      <line x1={x - 4} y1={y + 26} x2={x + 4} y2={y + 26} stroke="#f97316" strokeWidth="3" />
    </g>
  );
}

function Podium({ x, y, label, c = '#6366f1' }: { x: number; y: number; label: string; c?: string }) {
  return (
    <g>
      <rect x={x - 18} y={y} width="36" height="20" fill={c} fillOpacity={0.15} stroke={c} strokeWidth="1.5" rx="3" />
      <text x={x} y={y + 14} fontSize="9" fontWeight="800" fill={c} textAnchor="middle">{label}</text>
    </g>
  );
}

// ── Wrapper ───────────────────────────────────────────────────────────────────

function Scene({ bg, children }: { bg?: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 500 160" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', borderRadius: 10, display: 'block' }}>
      <BG color={bg} />
      {children}
    </svg>
  );
}

// ── SCENES ───────────────────────────────────────────────────────────────────

export const STICK_FIGURES: Record<string, React.ReactElement[]> = {

  // 1. Getting Started
  'getting-started': [
    <Scene key="a" bg="#f0f9ff">
      <Ground />
      <Fig cx={100} />
      <Lightbulb x={130} y={50} />
      <Bubble x={140} y={32} lines={['I have an', 'idea!']} c="#6366f1" />
      <Arrow x1={160} y1={100} x2={230} y2={100} />
      <rect x={240} y={62} width={120} height={56} rx="10" fill="#6366f1" fillOpacity={0.1} stroke="#6366f1" strokeWidth="2" />
      <text x={300} y={85} fontSize="11" fontWeight="900" fill="#4338ca" textAnchor="middle">MVP Club</text>
      <text x={300} y={102} fontSize="9" fontWeight="700" fill="#6366f1" textAnchor="middle">Your guided path</text>
      <Fig cx={400} raise="both" />
      <Bubble x={280} y={118} lines={['Next step: validate!']} c="#059669" />
      <Label x={100} y={155} text="You today" c="#6b7280" />
      <Label x={300} y={155} text="Sign up" c="#6b7280" />
      <Label x={400} y={155} text="Clear direction" c="#6b7280" />
    </Scene>,
    <Scene key="b" bg="#f0f9ff">
      <Ground />
      {[80, 160, 240, 320, 400].map((x, i) => {
        const labels = ['💡 Idea', '🔧 Hone', '✅ Validate', '📐 Shape', '🚀 Done'];
        const colors = ['#a21caf', '#1d4ed8', '#059669', '#c2410c', '#6366f1'];
        return (
          <g key={i}>
            <circle cx={x} cy={90} r="22" fill={colors[i]} fillOpacity={0.12} stroke={colors[i]} strokeWidth="2" />
            <text x={x} y={88} fontSize="14" textAnchor="middle">{labels[i].split(' ')[0]}</text>
            <text x={x} y={104} fontSize="8.5" fontWeight="800" fill={colors[i]} textAnchor="middle">{labels[i].split(' ')[1]}</text>
            {i < 4 && <Arrow x1={x + 24} y1={90} x2={x + 56} y2={90} c="#9ca3af" />}
          </g>
        );
      })}
      <Fig cx={80} gy={148} />
      <text x={250} y={148} fontSize="9" fontWeight="700" fill="#9ca3af" textAnchor="middle">One clear next step at every stage</text>
    </Scene>,
  ],

  // 2. 5-Stage Journey
  'journey': [
    <Scene key="a" bg="#fdf4ff">
      <Ground />
      <Fig cx={60} smile={false} />
      <ThinkBubble cx={65} cy={60} lines={['What should', 'I build?']} c="#9333ea" />
      <Arrow x1={95} y1={100} x2={125} y2={100} c="#9ca3af" />
      <Fig cx={160} />
      <Bubble x={178} y={48} lines={['Problem:', 'busy parents']} c="#1d4ed8" />
      <Arrow x1={195} y1={100} x2={225} y2={100} c="#9ca3af" />
      <Fig cx={260} />
      <Bubble x={278} y={48} lines={['20 interviews', 'done ✓']} c="#059669" />
      <Arrow x1={295} y1={100} x2={325} y2={100} c="#9ca3af" />
      <Fig cx={360} />
      <Bubble x={376} y={48} lines={['3 features,', 'no more']} c="#c2410c" />
      <Arrow x1={395} y1={100} x2={425} y2={100} c="#9ca3af" />
      <Fig cx={455} raise="both" />
      <text x={455} y={48} fontSize="14" textAnchor="middle">🚀</text>
      <Label x={60} y={155} text="Idea" c="#9333ea" />
      <Label x={160} y={155} text="Hone" c="#1d4ed8" />
      <Label x={260} y={155} text="Validate" c="#059669" />
      <Label x={360} y={155} text="Shape" c="#c2410c" />
      <Label x={455} y={155} text="Done!" c="#6366f1" />
    </Scene>,
    <Scene key="b" bg="#fdf4ff">
      <Ground />
      <text x={250} y={28} fontSize="13" fontWeight="900" fill="#4c1d95" textAnchor="middle">Each stage answers ONE question</text>
      {[
        { x: 90, q: 'Idea stage:', a: '"What problem?"', c: '#a21caf' },
        { x: 270, q: 'Validate stage:', a: '"Do people care?"', c: '#059669' },
        { x: 410, q: 'Shape stage:', a: '"What do I build?"', c: '#c2410c' },
      ].map(({ x, q, a, c }) => (
        <g key={x}>
          <Fig cx={x} />
          <Bubble x={x - 45} y={44} w={90} h={38} lines={[q, a]} c={c} />
        </g>
      ))}
    </Scene>,
  ],

  // 3. Community
  'community': [
    <Scene key="a" bg="#ecfeff">
      <Ground />
      {[120, 200, 280, 360].map((x, i) => <Fig key={i} cx={x} />)}
      <Fig cx={240} gy={148} raise="right" />
      <Bubble x={156} y={36} w={200} h={26} lines={['🏆 "I shipped my landing page today!"']} c="#0891b2" />
      <text x={240} y={155} fontSize="9" fontWeight="700" fill="#0891b2" textAnchor="middle">Sharing wins, not scrolling</text>
      <text x={120} y={155} fontSize="18" textAnchor="middle">👍</text>
      <text x={200} y={155} fontSize="18" textAnchor="middle">💬</text>
      <text x={360} y={155} fontSize="18" textAnchor="middle">🔍</text>
    </Scene>,
    <Scene key="b" bg="#ecfeff">
      <Ground />
      <text x={250} y={24} fontSize="11" fontWeight="900" fill="#155e75" textAnchor="middle">Filter by stage → see only what's relevant to YOU</text>
      <Fig cx={80} />
      <Bubble x={96} y={50} lines={['Idea stage']} c="#a21caf" />
      <Fig cx={200} />
      <Bubble x={216} y={50} lines={['Validate']} c="#059669" />
      <Fig cx={320} />
      <Bubble x={336} y={50} lines={['Shape']} c="#c2410c" />
      <Fig cx={420} />
      <Bubble x={348} y={50} lines={['Done! 🚀']} c="#6366f1" />
      <rect x={160} y={95} width={140} height={28} rx="6" fill="#0891b2" fillOpacity={0.1} stroke="#0891b2" strokeWidth="1.5" />
      <text x={230} y={114} fontSize="10" fontWeight="700" fill="#0891b2" textAnchor="middle">Showing: Validate stage</text>
      <Arrow x1={230} y1={123} x2={200} y2={132} c="#0891b2" />
    </Scene>,
  ],

  // 4. Private Messaging
  'messaging': [
    <Scene key="a" bg="#f0fdf4">
      <Ground />
      <Fig cx={100} />
      <Fig cx={380} />
      <rect x={130} y={55} width={110} height={28} rx="12" fill="#059669" fillOpacity={0.15} stroke="#059669" strokeWidth="1.5" />
      <text x={185} y={72} fontSize="9.5" fontWeight="700" fill="#065f46" textAnchor="middle">Hey, how did you get</text>
      <text x={185} y={83} fontSize="9.5" fontWeight="700" fill="#065f46" textAnchor="middle">your first 10 users?</text>
      <Arrow x1={240} y1={68} x2={340} y2={68} c="#059669" />
      <rect x={260} y={90} width={100} height={28} rx="12" fill="#6366f1" fillOpacity={0.15} stroke="#6366f1" strokeWidth="1.5" />
      <text x={310} y={108} fontSize="9.5" fontWeight="700" fill="#4338ca" textAnchor="middle">Reddit + DMs. Happy</text>
      <text x={310} y={119} fontSize="9.5" fontWeight="700" fill="#4338ca" textAnchor="middle">to walk you through it!</text>
      <Arrow x1={260} y1={104} x2={160} y2={104} c="#6366f1" />
      <Label x={100} y={155} text="You" c="#6b7280" />
      <Label x={380} y={155} text="Fellow founder" c="#6b7280" />
    </Scene>,
    <Scene key="b" bg="#f0fdf4">
      <Ground />
      <Fig cx={120} raise="right" />
      <text x={165} y={70} fontSize="20" textAnchor="middle">✉️</text>
      <Arrow x1={180} y1={70} x2={310} y2={70} c="#059669" />
      <Fig cx={360} />
      <circle cx={375} cy={50} r="10" fill="#ef4444" />
      <text x={375} y={55} fontSize="9" fontWeight="900" fill="white" textAnchor="middle">1</text>
      <rect x={180} y={100} width={140} height={22} rx="6" fill="#059669" fillOpacity={0.1} stroke="#059669" strokeWidth="1.5" />
      <text x={250} y={115} fontSize="9.5" fontWeight="700" fill="#065f46" textAnchor="middle">Private — only you two can see</text>
      <Label x={120} y={155} text="You write" c="#6b7280" />
      <Label x={360} y={155} text="They get notified" c="#6b7280" />
    </Scene>,
  ],

  // 5. How to Start a Startup
  'startup': [
    <Scene key="a" bg="#eef2ff">
      <Ground />
      <Fig cx={60} />
      <ThinkBubble cx={65} cy={60} lines={['3 problems', 'I face']} c="#6366f1" />
      <Arrow x1={95} y1={100} x2={135} y2={100} c="#9ca3af" />
      <Fig cx={175} />
      <Bubble x={190} y={50} lines={['Talked to', '10 strangers']} c="#059669" />
      <Arrow x1={215} y1={100} x2={255} y2={100} c="#9ca3af" />
      <Fig cx={295} />
      <rect x={310} y={62} width={50} height={36} rx="4" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5" />
      <line x1={318} y1={72} x2={352} y2={72} stroke="#9ca3af" strokeWidth="1.5" />
      <line x1={318} y1={80} x2={352} y2={80} stroke="#9ca3af" strokeWidth="1.5" />
      <text x={335} y={92} fontSize="8" fill="#6b7280" textAnchor="middle">3 features</text>
      <Arrow x1={365} y1={100} x2={405} y2={100} c="#9ca3af" />
      <Fig cx={440} raise="both" />
      <text x={440} y={46} fontSize="13" textAnchor="middle">🚀</text>
      <Label x={60} y={155} text="Think" c="#6366f1" />
      <Label x={175} y={155} text="Talk" c="#059669" />
      <Label x={295} y={155} text="Plan" c="#c2410c" />
      <Label x={440} y={155} text="Build + Ship!" c="#6366f1" />
    </Scene>,
    <Scene key="b" bg="#eef2ff">
      <text x={250} y={22} fontSize="11" fontWeight="900" fill="#4338ca" textAnchor="middle">The 90-day path from zero to first customer</text>
      {[
        { x: 55, week: 'Wk 1–2', label: 'Write the\nproblem', c: '#6366f1' },
        { x: 140, week: 'Wk 3–4', label: 'Interview\n10 people', c: '#059669' },
        { x: 225, week: 'Wk 5–6', label: 'Pre-sell\nbefore build', c: '#d97706' },
        { x: 310, week: 'Wk 7–10', label: 'Build the\nMVP', c: '#c2410c' },
        { x: 400, week: 'Wk 11–12', label: 'First paying\ncustomer', c: '#7c3aed' },
      ].map(({ x, week, label, c }) => (
        <g key={x}>
          <circle cx={x} cy={75} r="22" fill={c} fillOpacity={0.12} stroke={c} strokeWidth="2" />
          <text x={x} y={70} fontSize="8" fontWeight="700" fill={c} textAnchor="middle">{week}</text>
          {label.split('\n').map((l, i) => (
            <text key={i} x={x} y={81 + i * 11} fontSize="8" fontWeight="800" fill={c} textAnchor="middle">{l}</text>
          ))}
          {x < 400 && <Arrow x1={x + 24} y1={75} x2={x + 53} y2={75} c="#d1d5db" />}
        </g>
      ))}
      <text x={250} y={140} fontSize="9" fontWeight="700" fill="#9ca3af" textAnchor="middle">Most founders overthink it. Ship week 12, whatever it takes.</text>
    </Scene>,
  ],

  // 6. Founder Mistakes
  'mistakes': [
    <Scene key="a" bg="#fef2f2">
      <Ground />
      <text x={130} y={20} fontSize="10" fontWeight="900" fill="#dc2626" textAnchor="middle">❌ Wrong</text>
      <text x={370} y={20} fontSize="10" fontWeight="900" fill="#059669" textAnchor="middle">✅ Right</text>
      <line x1={250} y1={10} x2={250} y2={150} stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="4 3" />
      <Fig cx={100} />
      <rect x={118} y={55} width={60} height={40} rx="4" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5" />
      <text x={148} y={70} fontSize="8" fill="#9ca3af" textAnchor="middle">6 months</text>
      <text x={148} y={82} fontSize="8" fill="#9ca3af" textAnchor="middle">of coding</text>
      <text x={148} y={94} fontSize="8" fill="#dc2626" textAnchor="middle">Nobody buys</text>
      <Fig cx={360} />
      <Bubble x={376} y={48} w={110} h={44} lines={['Tell me about', 'your problem...', '"OMG YES I need this"']} c="#059669" />
      <Fig cx={460} />
      <Label x={100} y={155} text="Built first, failed" c="#dc2626" />
      <Label x={400} y={155} text="Talked first, won" c="#059669" />
    </Scene>,
    <Scene key="b" bg="#fef2f2">
      <Ground />
      <text x={250} y={20} fontSize="10" fontWeight="900" fill="#7f1d1d" textAnchor="middle">Mistake: Targeting "everyone"</text>
      <Fig cx={80} raise="right" />
      {[{ x: 180, y: 55 }, { x: 260, y: 40 }, { x: 340, y: 60 }, { x: 220, y: 100 }, { x: 300, y: 110 }].map(({ x, y }, i) => (
        <g key={i}>
          <Arrow x1={100} y1={90} x2={x} y2={y} c="#fca5a5" />
          <text x={x} y={y} fontSize="10" textAnchor="middle">👤</text>
        </g>
      ))}
      <text x={80} y={155} fontSize="9" fontWeight="800" fill="#dc2626" textAnchor="middle">Going nowhere</text>
      <Fig cx={420} raise="right" />
      <Fig cx={460} />
      <Arrow x1={420} y1={90} x2={460} y2={90} c="#059669" />
      <Bubble x={370} y={46} w={88} lines={['Busy mums', 'in London']} c="#059669" />
      <text x={440} y={155} fontSize="9" fontWeight="800" fill="#059669" textAnchor="middle">Laser focus = wins</text>
    </Scene>,
  ],

  // 7. Top 10 Must-Dos
  'top10': [
    <Scene key="a" bg="#fffbeb">
      <Ground />
      <Fig cx={80} raise="right" />
      <g>
        {[
          { y: 38, t: '✓ 1. Write your problem in 1 sentence', c: '#059669' },
          { y: 55, t: '✓ 2. Talk to 10 strangers', c: '#059669' },
          { y: 72, t: '✓ 3. Record every interview', c: '#059669' },
          { y: 89, t: '○ 4. Define target customer precisely', c: '#d97706' },
          { y: 106, t: '○ 5. Complete the BMC', c: '#9ca3af' },
          { y: 123, t: '○ 6. Try to pre-sell', c: '#9ca3af' },
        ].map(({ y, t, c }) => (
          <text key={y} x={135} y={y} fontSize="9.5" fontWeight="700" fill={c}>{t}</text>
        ))}
      </g>
      <Label x={80} y={155} text="Do all 10. Most skip 3." c="#92400e" />
    </Scene>,
    <Scene key="b" bg="#fffbeb">
      <Ground />
      <text x={250} y={22} fontSize="11" fontWeight="900" fill="#92400e" textAnchor="middle">The most skipped step: talking to strangers</text>
      <Fig cx={100} />
      <Bubble x={118} y={46} lines={['Not friends.', 'Not family.', 'Strangers who', 'have the problem.']} c="#d97706" w={125} h={50} />
      <Fig cx={360} />
      <Fig cx={400} />
      <Bubble x={270} y={56} w={80} h={36} lines={['Tell me about', 'your workflow...']} c="#1d4ed8" />
      <Arrow x1={150} y1={90} x2={340} y2={90} c="#d97706" />
      <Label x={250} y={155} text="Go find them. They are out there." c="#92400e" />
    </Scene>,
  ],

  // 8. TAM / SAM / SOM
  'biz-tam': [
    <Scene key="a" bg="#eff6ff">
      <circle cx={250} cy={88} r="72" fill="#1d4ed8" fillOpacity={0.05} stroke="#1d4ed8" strokeWidth="1.5" />
      <circle cx={250} cy={88} r="48" fill="#1d4ed8" fillOpacity={0.08} stroke="#1d4ed8" strokeWidth="1.5" />
      <circle cx={250} cy={88} r="24" fill="#1d4ed8" fillOpacity={0.18} stroke="#1d4ed8" strokeWidth="2" />
      <text x={250} y={92} fontSize="9" fontWeight="900" fill="#1e3a8a" textAnchor="middle">SOM</text>
      <text x={250} y={52} fontSize="8.5" fontWeight="700" fill="#1d4ed8" textAnchor="middle">SAM</text>
      <text x={250} y={20} fontSize="8.5" fontWeight="700" fill="#93c5fd" textAnchor="middle">TAM (whole world)</text>
      <text x={380} y={56} fontSize="9" fontWeight="800" fill="#1d4ed8">TAM = $10B</text>
      <text x={380} y={72} fontSize="9" fontWeight="800" fill="#1d4ed8">SAM = $1B</text>
      <text x={380} y={88} fontSize="9" fontWeight="900" fill="#1e3a8a">SOM = $50M ← YOU</text>
      <text x={250} y={148} fontSize="9" fontWeight="700" fill="#6b7280" textAnchor="middle">Investors fund your SOM — not your TAM. Know it cold.</text>
    </Scene>,
    <Scene key="b" bg="#eff6ff">
      <Ground />
      <Fig cx={100} raise="right" />
      <rect x={160} y={30} width={280} height={80} rx="8" fill="white" stroke="#e5e7eb" strokeWidth="1.5" />
      <text x={180} y={52} fontSize="9.5" fontWeight="800" fill="#1d4ed8">Bottom-up sizing (the right way):</text>
      <text x={180} y={68} fontSize="9" fontWeight="700" fill="#374151">10,000 UK SMEs with this problem</text>
      <text x={180} y={82} fontSize="9" fontWeight="700" fill="#374151">× £500/year avg contract = £5M SOM</text>
      <text x={180} y={96} fontSize="9" fontWeight="800" fill="#059669">Defend every assumption ← investors will</text>
      <Bubble x={100} y={115} w={56} h={20} lines={['This I can', 'justify!']} c="#1d4ed8" />
      <Label x={250} y={155} text="1% of $10B market = bad math. Real numbers = credibility." c="#6b7280" />
    </Scene>,
  ],

  // 9. Revenue Models
  'biz-revenue-model': [
    <Scene key="a" bg="#f0fdf4">
      <Ground />
      <Fig cx={80} />
      <text x={80} y={155} fontSize="9" fontWeight="800" fill="#15803d" textAnchor="middle">SaaS sub</text>
      <Arrow x1={98} y1={100} x2={130} y2={85} c="#15803d" />
      <Arrow x1={98} y1={100} x2={150} y2={100} c="#15803d" />
      <Arrow x1={98} y1={100} x2={130} y2={115} c="#15803d" />
      <Coin x={145} y={78} size={12} />
      <Coin x={165} y={100} size={12} />
      <Coin x={145} y={122} size={12} />
      <text x={155} y={155} fontSize="9" fontWeight="700" fill="#15803d" textAnchor="middle">£/mo forever</text>
      <line x1={230} y1={20} x2={230} y2={140} stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="3 3" />
      <Fig cx={300} />
      <text x={300} y={155} fontSize="9" fontWeight="800" fill="#f59e0b" textAnchor="middle">One-time</text>
      <Coin x={350} y={80} size={20} />
      <text x={350} y={120} fontSize="9" fontWeight="700" fill="#d97706" textAnchor="middle">£££ once</text>
      <line x1={420} y1={20} x2={420} y2={140} stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="3 3" />
      <Fig cx={455} />
      <text x={455} y={155} fontSize="9" fontWeight="800" fill="#6366f1" textAnchor="middle">Usage-based</text>
      <text x={455} y={100} fontSize="18" textAnchor="middle">📊</text>
      <text x={455} y={120} fontSize="8" fontWeight="700" fill="#6366f1" textAnchor="middle">Pay as you use</text>
    </Scene>,
    <Scene key="b" bg="#f0fdf4">
      <Ground />
      <text x={250} y={22} fontSize="11" fontWeight="900" fill="#14532d" textAnchor="middle">Freemium: many free, few pay — and that's fine</text>
      {[60, 110, 160, 210, 260].map((x, i) => (
        <g key={i}>
          <Fig cx={x} />
          <text x={x} y={152} fontSize="16" textAnchor="middle">🆓</text>
        </g>
      ))}
      <Arrow x1={280} y1={90} x2={320} y2={90} c="#9ca3af" />
      <Fig cx={350} raise="both" />
      <Coin x={390} y={80} size={18} />
      <text x={370} y={155} fontSize="9" fontWeight="800" fill="#15803d" textAnchor="middle">10% converts</text>
      <Bubble x={180} y={28} w={100} h={22} lines={['Free users spread word']} c="#15803d" />
    </Scene>,
  ],

  // 10. BMC
  'bmc': [
    <Scene key="a" bg="#eef2ff">
      <Ground />
      <Fig cx={70} raise="right" />
      <rect x={110} y={20} width={360} height={110} rx="8" fill="white" stroke="#c7d2fe" strokeWidth="2" />
      {[
        { x: 115, y: 25, w: 70, label: 'Partners', c: '#6366f1' },
        { x: 190, y: 25, w: 70, label: 'Activities', c: '#6366f1' },
        { x: 265, y: 25, w: 70, label: 'Value', c: '#dc2626' },
        { x: 340, y: 25, w: 70, label: 'Relations', c: '#059669' },
        { x: 190, y: 80, w: 70, label: 'Resources', c: '#6366f1' },
        { x: 340, y: 80, w: 70, label: 'Channels', c: '#059669' },
        { x: 115, y: 80, w: 70, label: 'Segments', c: '#059669' },
      ].map(({ x, y, w, label, c }) => (
        <g key={label}>
          <rect x={x} y={y} width={w} height={50} rx="3" fill={c} fillOpacity={0.07} stroke={c} strokeWidth="1" />
          <text x={x + w / 2} y={y + 28} fontSize="8" fontWeight="800" fill={c} textAnchor="middle">{label}</text>
        </g>
      ))}
      <Label x={70} y={155} text="Fill each box. No guessing." c="#4338ca" />
    </Scene>,
    <Scene key="b" bg="#eef2ff">
      <Ground />
      <Fig cx={100} raise="right" />
      <Bubble x={118} y={44} w={160} h={44} lines={['Value Prop first:', '"We help busy parents', 'cook in 20 min"']} c="#4338ca" />
      <Arrow x1={285} y1={68} x2={320} y2={68} c="#9ca3af" />
      <Fig cx={360} />
      <ThinkBubble cx={360} cy={55} lines={['Now I know', 'everything:', 'who, how, why']} c="#4338ca" />
      <text x={250} y={148} fontSize="9" fontWeight="700" fill="#6b7280" textAnchor="middle">The BMC test: can a stranger understand your whole business in 60 seconds?</text>
    </Scene>,
  ],

  // 11. Legal Basics
  'biz-legal': [
    <Scene key="a" bg="#fef9c3">
      <Ground />
      <Fig cx={100} />
      <text x={130} y={65} fontSize="20">⚖️</text>
      <Fig cx={200} />
      <Bubble x={215} y={42} lines={['Incorporate', 'today. Cost:', '£50 online']} c="#a16207" />
      <Arrow x1={240} y1={100} x2={290} y2={100} c="#9ca3af" />
      <rect x={300} y={55} width={160} height={65} rx="8" fill="white" stroke="#fde047" strokeWidth="2" />
      <text x={380} y={76} fontSize="9" fontWeight="800" fill="#713f12" textAnchor="middle">✓ Ltd company: you're</text>
      <text x={380} y={90} fontSize="9" fontWeight="700" fill="#713f12" textAnchor="middle">  protected personally</text>
      <text x={380} y={104} fontSize="9" fontWeight="800" fill="#059669" textAnchor="middle">✓ IP assigned to company</text>
      <text x={380} y={118} fontSize="9" fontWeight="800" fill="#059669" textAnchor="middle">✓ Founder vesting signed</text>
      <Label x={250} y={155} text="Spend £500 on a lawyer now. Saves £50k in disputes later." c="#a16207" />
    </Scene>,
    <Scene key="b" bg="#fef9c3">
      <Ground />
      <text x={250} y={22} fontSize="11" fontWeight="900" fill="#713f12" textAnchor="middle">IP Assignment: WHO owns the code?</text>
      <Fig cx={100} />
      <Bubble x={115} y={48} lines={['I wrote it on', 'my laptop at', 'home...']} c="#dc2626" />
      <text x={200} y={82} fontSize="28" textAnchor="middle">❓</text>
      <Arrow x1={170} y1={95} x2={260} y2={95} c="#dc2626" />
      <rect x={270} y={60} width={120} height={50} rx="8" fill="#f0fdf4" stroke="#059669" strokeWidth="2" />
      <text x={330} y={82} fontSize="9" fontWeight="800" fill="#065f46" textAnchor="middle">IP Assignment:</text>
      <text x={330} y={96} fontSize="9" fontWeight="700" fill="#065f46" textAnchor="middle">"All work → Company"</text>
      <text x={330} y={110} fontSize="9" fontWeight="800" fill="#059669" textAnchor="middle">Company owns it. ✓</text>
      <Label x={250} y={155} text="Without this, a leaving co-founder could own your codebase." c="#a16207" />
    </Scene>,
  ],

  // 12. Co-Founder
  'guide-cofounder': [
    <Scene key="a" bg="#fff7ed">
      <Ground />
      <Fig cx={140} c="#1d4ed8" />
      <text x={140} y={155} fontSize="9" fontWeight="800" fill="#1d4ed8" textAnchor="middle">Technical 💻</text>
      <text x={140} y={46} fontSize="9" fontWeight="700" fill="#1d4ed8" textAnchor="middle">Builds product</text>
      <Fig cx={320} c="#c2410c" />
      <text x={320} y={155} fontSize="9" fontWeight="800" fill="#c2410c" textAnchor="middle">Business 📊</text>
      <text x={320} y={46} fontSize="9" fontWeight="700" fill="#c2410c" textAnchor="middle">Finds customers</text>
      <ellipse cx={230} cy={88} rx={45} ry={38} fill="#f0fdf4" stroke="#059669" strokeWidth="2" />
      <text x={230} y={84} fontSize="8.5" fontWeight="800" fill="#065f46" textAnchor="middle">Shared</text>
      <text x={230} y={96} fontSize="8.5" fontWeight="800" fill="#065f46" textAnchor="middle">mission 🤝</text>
      <line x1={185} y1={88} x2={140} y2={88} stroke="#9ca3af" strokeWidth="1" strokeDasharray="3 3" />
      <line x1={275} y1={88} x2={320} y2={88} stroke="#9ca3af" strokeWidth="1" strokeDasharray="3 3" />
    </Scene>,
    <Scene key="b" bg="#fff7ed">
      <Ground />
      <text x={250} y={22} fontSize="11" fontWeight="900" fill="#7c2d12" textAnchor="middle">Work together for 3 months BEFORE making it official</text>
      <Fig cx={120} />
      <Fig cx={180} />
      <rect x={100} y={52} width={100} height={30} rx="6" fill="#059669" fillOpacity={0.1} stroke="#059669" strokeWidth="1.5" />
      <text x={150} y={68} fontSize="9" fontWeight="700" fill="#065f46" textAnchor="middle">Build something real</text>
      <text x={150} y={79} fontSize="9" fontWeight="700" fill="#065f46" textAnchor="middle">together first</text>
      <Arrow x1={215} y1={90} x2={280} y2={90} c="#9ca3af" />
      <text x={310} y={62} fontSize="9" fontWeight="700" fill="#7c2d12" textAnchor="middle">Ask yourself:</text>
      <text x={310} y={76} fontSize="9" fontWeight="700" fill="#374151" textAnchor="middle">How do they handle</text>
      <text x={310} y={89} fontSize="9" fontWeight="700" fill="#374151" textAnchor="middle">conflict and pressure?</text>
      <text x={310} y={102} fontSize="9" fontWeight="700" fill="#374151" textAnchor="middle">Do they actually ship?</text>
      <text x={310} y={115} fontSize="9" fontWeight="800" fill="#c2410c" textAnchor="middle">That's your answer.</text>
      <Label x={150} y={155} text="Red flag: never shipped anything before." c="#c2410c" />
    </Scene>,
  ],

  // 13. Cap Tables
  'biz-cap-table': [
    <Scene key="a" bg="#f0f9ff">
      <text x={250} y={22} fontSize="11" fontWeight="900" fill="#0c4a6e" textAnchor="middle">Who owns what — the cap table</text>
      {[
        { startAngle: 0, endAngle: 0.5, color: '#1d4ed8', label: 'Founder A\n45%', lx: 140, ly: 70 },
        { startAngle: 0.5, endAngle: 0.85, color: '#059669', label: 'Founder B\n35%', lx: 380, ly: 70 },
        { startAngle: 0.85, endAngle: 1.0, color: '#f59e0b', label: 'ESOP\n10%', lx: 310, ly: 130 },
      ].map(({ startAngle, endAngle, color, label, lx, ly }) => {
        const sa = startAngle * 2 * Math.PI - Math.PI / 2;
        const ea = endAngle * 2 * Math.PI - Math.PI / 2;
        const r = 55;
        const cx2 = 230, cy2 = 90;
        const x1 = cx2 + r * Math.cos(sa), y1 = cy2 + r * Math.sin(sa);
        const x2 = cx2 + r * Math.cos(ea), y2 = cy2 + r * Math.sin(ea);
        const large = endAngle - startAngle > 0.5 ? 1 : 0;
        return (
          <g key={label}>
            <path d={`M${cx2},${cy2} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`}
              fill={color} fillOpacity={0.2} stroke={color} strokeWidth="2" />
            {label.split('\n').map((l, i) => (
              <text key={i} x={lx} y={ly + i * 13} fontSize="9" fontWeight="800" fill={color} textAnchor="middle">{l}</text>
            ))}
          </g>
        );
      })}
      <text x={250} y={148} fontSize="9" fontWeight="700" fill="#6b7280" textAnchor="middle">Every round dilutes everyone. Model it before you raise.</text>
    </Scene>,
    <Scene key="b" bg="#f0f9ff">
      <Ground />
      <text x={250} y={22} fontSize="11" fontWeight="900" fill="#0c4a6e" textAnchor="middle">What happens to your % after 3 rounds of fundraising?</text>
      {[
        { x: 80, label: 'Day 1', pct: '50%', c: '#1d4ed8' },
        { x: 200, label: 'Post-Seed', pct: '40%', c: '#6366f1' },
        { x: 320, label: 'Post-A', pct: '32%', c: '#9333ea' },
        { x: 420, label: 'Post-B', pct: '25%', c: '#c026d3' },
      ].map(({ x, label, pct, c }) => {
        const height = parseInt(pct) * 1.2;
        return (
          <g key={x}>
            <rect x={x - 18} y={140 - height} width="36" height={height} rx="4" fill={c} fillOpacity={0.2} stroke={c} strokeWidth="2" />
            <text x={x} y={140 - height - 6} fontSize="11" fontWeight="900" fill={c} textAnchor="middle">{pct}</text>
            <text x={x} y={153} fontSize="8.5" fontWeight="700" fill="#6b7280" textAnchor="middle">{label}</text>
          </g>
        );
      })}
      <text x={250} y={10} fontSize="8" fontWeight="700" fill="#9ca3af" textAnchor="middle">Your % shrinks — but total value grows. That's the deal.</text>
    </Scene>,
  ],

  // 14. Stock Options
  'biz-equity': [
    <Scene key="a" bg="#f5f3ff">
      <Ground />
      <Fig cx={80} raise="right" />
      <Bubble x={96} y={44} lines={['You: join us', 'for options!', '4yr vesting']} c="#7c3aed" />
      <Fig cx={230} />
      <text x={230} y={155} fontSize="9" fontWeight="800" fill="#374151" textAnchor="middle">New hire</text>
      <rect x={165} y={52} width={130} height={60} rx="8" fill="white" stroke="#ddd6fe" strokeWidth="2" />
      <text x={230} y={72} fontSize="9" fontWeight="700" fill="#4c1d95" textAnchor="middle">📅 Year 1: 0 vest</text>
      <text x={230} y={85} fontSize="9" fontWeight="700" fill="#4c1d95" textAnchor="middle">📅 Year 1 cliff: 25%</text>
      <text x={230} y={98} fontSize="9" fontWeight="700" fill="#4c1d95" textAnchor="middle">📅 Yr 2–4: 75% monthly</text>
      <text x={230} y={111} fontSize="9" fontWeight="800" fill="#059669" textAnchor="middle">✓ Fully vested year 4</text>
      <Fig cx={400} raise="both" />
      <Coin x={445} y={80} size={16} />
      <text x={415} y={155} fontSize="9" fontWeight="800" fill="#7c3aed" textAnchor="middle">Worth £££ at exit!</text>
    </Scene>,
    <Scene key="b" bg="#f5f3ff">
      <Ground />
      <text x={250} y={22} fontSize="11" fontWeight="900" fill="#4c1d95" textAnchor="middle">Create the ESOP pool at incorporation — not at Series A</text>
      <rect x={30} y={40} width={200} height={80} rx="8" fill="#fef2f2" stroke="#fca5a5" strokeWidth="2" />
      <text x={130} y={60} fontSize="9" fontWeight="800" fill="#dc2626" textAnchor="middle">❌ ESOP at Series A:</text>
      <text x={130} y={76} fontSize="9" fontWeight="700" fill="#dc2626" textAnchor="middle">Investors insist on 15%</text>
      <text x={130} y={90} fontSize="9" fontWeight="700" fill="#dc2626" textAnchor="middle">pool BEFORE valuation</text>
      <text x={130} y={104} fontSize="9" fontWeight="800" fill="#dc2626" textAnchor="middle">→ Founders diluted!</text>
      <rect x={270} y={40} width={200} height={80} rx="8" fill="#f0fdf4" stroke="#86efac" strokeWidth="2" />
      <text x={370} y={60} fontSize="9" fontWeight="800" fill="#059669" textAnchor="middle">✅ ESOP at Incorporation:</text>
      <text x={370} y={76} fontSize="9" fontWeight="700" fill="#065f46" textAnchor="middle">15% pool already exists</text>
      <text x={370} y={90} fontSize="9" fontWeight="700" fill="#065f46" textAnchor="middle">Dilution happens to all</text>
      <text x={370} y={104} fontSize="9" fontWeight="800" fill="#059669" textAnchor="middle">→ Fair for everyone ✓</text>
    </Scene>,
  ],

  // 15. Conflict Resolution
  'biz-conflict': [
    <Scene key="a" bg="#fdf2f8">
      <Ground />
      <Fig cx={120} smile={false} />
      <Fig cx={200} smile={false} />
      <text x={160} y={65} fontSize="20" textAnchor="middle">💢</text>
      <Bubble x={50} y={44} lines={['I want to', 'pivot!']} c="#dc2626" />
      <Bubble x={210} y={44} lines={["I don't!", "Stay course"]} c="#dc2626" />
      <Arrow x1={260} y1={90} x2={300} y2={90} c="#9ca3af" />
      <Fig cx={330} />
      <Bubble x={300} y={44} lines={['Neutral', 'advisor']} c="#6366f1" />
      <Arrow x1={350} y1={90} x2={390} y2={90} c="#9ca3af" />
      <Fig cx={415} />
      <Fig cx={455} />
      <text x={435} y={65} fontSize="20" textAnchor="middle">🤝</text>
      <text x={250} y={155} fontSize="9" fontWeight="700" fill="#9d174d" textAnchor="middle">Name it early. Ignored conflict compounds like bad debt.</text>
    </Scene>,
    <Scene key="b" bg="#fdf2f8">
      <Ground />
      <text x={250} y={22} fontSize="11" fontWeight="900" fill="#831843" textAnchor="middle">Write these down at incorporation. Before any conflict.</text>
      <rect x={40} y={34} width={420} height={88} rx="8" fill="white" stroke="#f9a8d4" strokeWidth="1.5" />
      {[
        '✓ Who makes final product decisions? ____',
        '✓ Who makes final hiring decisions? ____',
        '✓ What happens if someone wants to leave?',
        '✓ Vesting cliff: 12 months, 4 years total',
        '✓ Monthly co-founder check-in: booked ✓',
      ].map((t, i) => (
        <text key={i} x={55} y={52 + i * 15} fontSize="9" fontWeight={i === 4 ? '800' : '700'} fill={i === 4 ? '#059669' : '#374151'}>{t}</text>
      ))}
      <Label x={250} y={155} text="A divorce clause written before you need it costs nothing. After, it costs everything." c="#9d174d" />
    </Scene>,
  ],

  // 16. How to Validate
  'guide-validate': [
    <Scene key="a" bg="#fdf4ff">
      <Ground />
      <Fig cx={80} raise="right" />
      <Bubble x={96} y={36} lines={['Tell me about', 'the last time', 'this was a', 'problem...']} c="#9333ea" h={52} />
      <Arrow x1={180} y1={90} x2={230} y2={90} c="#9ca3af" />
      <Fig cx={280} />
      <Bubble x={298} y={44} lines={['OMG YES.', 'I pay £200/mo', 'for a workaround', '— still broken']} c="#059669" h={52} />
      <text x={280} y={155} fontSize="9" fontWeight="800" fill="#059669" textAnchor="middle">← REAL signal</text>
      <Arrow x1={380} y1={90} x2={420} y2={90} c="#dc2626" />
      <Fig cx={450} />
      <Bubble x={370} y={60} lines={['Sure, sounds', 'like a good', 'idea maybe']} c="#dc2626" h={40} />
      <text x={450} y={155} fontSize="9" fontWeight="800" fill="#dc2626" textAnchor="middle">← Noise</text>
    </Scene>,
    <Scene key="b" bg="#fdf4ff">
      <Ground />
      <text x={250} y={22} fontSize="11" fontWeight="900" fill="#701a75" textAnchor="middle">After 10 interviews: did you find real signal?</text>
      <Fig cx={80} />
      <rect x={105} y={40} width={110} height={70} rx="6" fill="white" stroke="#f0abfc" strokeWidth="1.5" />
      <text x={160} y={58} fontSize="8.5" fontWeight="800" fill="#9333ea" textAnchor="middle">REAL SIGNAL:</text>
      <text x={160} y={72} fontSize="8.5" fontWeight="700" fill="#374151" textAnchor="middle">"I already tried</text>
      <text x={160} y={84} fontSize="8.5" fontWeight="700" fill="#374151" textAnchor="middle">to build this"</text>
      <text x={160} y={96} fontSize="8.5" fontWeight="700" fill="#374151" textAnchor="middle">"I'd pay today"</text>
      <text x={160} y={108} fontSize="8.5" fontWeight="800" fill="#059669" textAnchor="middle">3+ said this → GO</text>
      <rect x={260} y={40} width={110} height={70} rx="6" fill="white" stroke="#fca5a5" strokeWidth="1.5" />
      <text x={315} y={58} fontSize="8.5" fontWeight="800" fill="#dc2626" textAnchor="middle">NOISE:</text>
      <text x={315} y={72} fontSize="8.5" fontWeight="700" fill="#374151" textAnchor="middle">"Sounds cool"</text>
      <text x={315} y={84} fontSize="8.5" fontWeight="700" fill="#374151" textAnchor="middle">"My friend would</text>
      <text x={315} y={96} fontSize="8.5" fontWeight="700" fill="#374151" textAnchor="middle">want this"</text>
      <text x={315} y={108} fontSize="8.5" fontWeight="800" fill="#dc2626" textAnchor="middle">Move on. Pivot.</text>
      <Fig cx={420} />
      <Label x={420} y={155} text="You (deciding)" c="#6b7280" />
    </Scene>,
  ],

  // 17. Validation concept
  'validation': [
    <Scene key="a" bg="#f0fdf4">
      <Ground />
      {[
        { x: 55, icon: '🎯', label: 'Define\nproblem', c: '#9333ea' },
        { x: 155, icon: '🔍', label: 'Find\npeople', c: '#1d4ed8' },
        { x: 255, icon: '🗣', label: 'Interview\nthem', c: '#059669' },
        { x: 355, icon: '📊', label: 'Spot\nsignal', c: '#d97706' },
        { x: 445, icon: '🚦', label: 'Go or\npivot', c: '#dc2626' },
      ].map(({ x, icon, label, c }, i) => (
        <g key={x}>
          <circle cx={x} cy={80} r="26" fill={c} fillOpacity={0.12} stroke={c} strokeWidth="2" />
          <text x={x} y={75} fontSize="16" textAnchor="middle">{icon}</text>
          {label.split('\n').map((l, li) => (
            <text key={li} x={x} y={91 + li * 12} fontSize="8.5" fontWeight="800" fill={c} textAnchor="middle">{l}</text>
          ))}
          {i < 4 && <Arrow x1={x + 28} y1={80} x2={x + 72} y2={80} c="#d1d5db" />}
        </g>
      ))}
      <text x={250} y={148} fontSize="9" fontWeight="700" fill="#6b7280" textAnchor="middle">Never mention your solution until the last 5 minutes of the interview.</text>
    </Scene>,
    <Scene key="b" bg="#f0fdf4">
      <Ground />
      <text x={250} y={20} fontSize="11" fontWeight="900" fill="#14532d" textAnchor="middle">5 questions that unlock real insight</text>
      {[
        '"Tell me about the last time this happened"',
        '"How do you handle it today?"',
        '"How much does this cost you per month?"',
        '"What have you tried to fix it?"',
        '"Would you pay £X to solve this forever?"',
      ].map((q, i) => (
        <text key={i} x={30} y={40 + i * 20} fontSize="9" fontWeight={i === 4 ? '800' : '700'} fill={i === 4 ? '#059669' : '#374151'}>{q}</text>
      ))}
      <Fig cx={455} />
      <Bubble x={340} y={115} w={110} h={24} lines={['Answers reveal', 'the truth 👆']} c="#059669" />
    </Scene>,
  ],
};

export default STICK_FIGURES;
