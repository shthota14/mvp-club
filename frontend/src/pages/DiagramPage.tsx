import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import api from '@/api/client';

// ── Shape types ───────────────────────────────────────────────────────────────
type DiagShape =
  | 'line-plain' | 'line-arr' | 'line-both' | 'line-dash' | 'line-dot'
  | 'box' | 'rounded' | 'circle' | 'oval' | 'diamond' | 'parallelogram'
  | 'hexagon' | 'triangle' | 'triangle-down' | 'pentagon' | 'star' | 'cross'
  | 'cylinder' | 'cloud' | 'document' | 'note' | 'speech' | 'callout'
  | 'person' | 'frame' | 'arrow-right' | 'badge'
  | 'monitor' | 'laptop' | 'mobile' | 'server' | 'netswitch' | 'router'
  | 'firewall' | 'browser' | 'apibox' | 'dbstack' | 'saascloud' | 'queue'
  | 'txt';

interface DiagItem {
  id: string;
  type: DiagShape;
  x: number; y: number;
  w: number; h: number;
  txt: string;
  color?: string;
}

type ConnStyle = 'curve' | 'straight' | 'ortho';
type ConnHeads = 'end' | 'both' | 'none';
interface DiagArrow { id: string; from: string; to: string; lbl: string; style?: ConnStyle; heads?: ConnHeads; }
interface DiagState { items: Record<string, DiagItem>; arrs: DiagArrow[]; }
type ToolMode = 'sel' | 'shape' | 'txt' | 'arr';

// ── Shape catalog ─────────────────────────────────────────────────────────────
const SHAPES: { key: DiagShape; label: string; icon: string; w: number; h: number }[] = [
  // ── Line connectors ───────────────────────────────────────────────────────
  { key: 'line-plain', label: 'Line',     icon: '—',  w: 150, h: 24 },
  { key: 'line-arr',   label: 'Arrow',    icon: '→',  w: 150, h: 24 },
  { key: 'line-both',  label: 'Dbl Arrow',icon: '↔',  w: 150, h: 24 },
  { key: 'line-dash',  label: 'Dashed',   icon: '╌',  w: 150, h: 24 },
  { key: 'line-dot',   label: 'Dotted',   icon: '⋯',  w: 150, h: 24 },
  // ── General shapes ────────────────────────────────────────────────────────
  { key: 'box',           label: 'Rectangle', icon: '▭', w: 120, h: 60  },
  { key: 'rounded',       label: 'Rounded',   icon: '▢', w: 120, h: 60  },
  { key: 'circle',        label: 'Circle',    icon: '○', w: 80,  h: 80  },
  { key: 'oval',          label: 'Oval',      icon: '◯', w: 130, h: 70  },
  { key: 'diamond',       label: 'Diamond',   icon: '◇', w: 110, h: 80  },
  { key: 'parallelogram', label: 'Slant',     icon: '▱', w: 130, h: 60  },
  { key: 'hexagon',       label: 'Hexagon',   icon: '⬡', w: 110, h: 90  },
  { key: 'triangle',      label: 'Triangle',  icon: '△', w: 100, h: 80  },
  { key: 'triangle-down', label: 'Inv. Tri',  icon: '▽', w: 100, h: 80  },
  { key: 'pentagon',      label: 'Pentagon',  icon: '⬠', w: 100, h: 90  },
  { key: 'star',          label: 'Star',      icon: '✦', w: 90,  h: 90  },
  { key: 'cross',         label: 'Plus',      icon: '✚', w: 80,  h: 80  },
  { key: 'cylinder',      label: 'Database',  icon: '🗄', w: 100, h: 90  },
  { key: 'cloud',         label: 'Cloud',     icon: '☁', w: 140, h: 75  },
  { key: 'document',      label: 'Document',  icon: '📄', w: 110, h: 85  },
  { key: 'note',          label: 'Sticky',    icon: '📝', w: 110, h: 90  },
  { key: 'speech',        label: 'Bubble',    icon: '💬', w: 130, h: 80  },
  { key: 'callout',       label: 'Callout',   icon: '💭', w: 130, h: 80  },
  { key: 'person',        label: 'Person',    icon: '🧍', w: 60,  h: 100 },
  { key: 'frame',         label: 'Frame',     icon: '🖼', w: 200, h: 160 },
  { key: 'arrow-right',   label: 'Blk Arrow', icon: '➤', w: 130, h: 65  },
  { key: 'badge',         label: 'Badge',     icon: '🏷', w: 120, h: 44  },
  // ── Tech / IT shapes ──────────────────────────────────────────────────────
  { key: 'monitor',    label: 'Monitor',   icon: '🖥', w: 140, h: 100 },
  { key: 'laptop',     label: 'Laptop',    icon: '💻', w: 160, h: 100 },
  { key: 'mobile',     label: 'Mobile',    icon: '📱', w: 60,  h: 110 },
  { key: 'server',     label: 'Server',    icon: '🗃', w: 130, h: 90  },
  { key: 'netswitch',  label: 'Switch',    icon: '🔌', w: 160, h: 55  },
  { key: 'router',     label: 'Router',    icon: '📡', w: 110, h: 90  },
  { key: 'firewall',   label: 'Firewall',  icon: '🛡', w: 90,  h: 100 },
  { key: 'browser',    label: 'Browser',   icon: '🌐', w: 160, h: 110 },
  { key: 'apibox',     label: 'API',       icon: '⬡',  w: 130, h: 70  },
  { key: 'dbstack',    label: 'DB Stack',  icon: '📚', w: 90,  h: 110 },
  { key: 'saascloud',  label: 'SaaS',      icon: '☁',  w: 150, h: 85  },
  { key: 'queue',      label: 'Queue',     icon: '⇶',  w: 160, h: 55  },
];

const SHAPE_DEF: Record<string, { w: number; h: number }> = Object.fromEntries(SHAPES.map(s => [s.key, { w: s.w, h: s.h }]));

const FILL_COLORS = [
  '#ffffff', '#dbeafe', '#dcfce7', '#fef9c3', '#ffe4e6',
  '#f3e8ff', '#fed7aa', '#e2e8f0', '#fdf4ff', '#f0fdf4',
];

// ── Normalize saved items (backward compat) ───────────────────────────────────
function normalizeItem(raw: Record<string, unknown>): DiagItem {
  const type = (raw.type as DiagShape) || 'box';
  const def = SHAPE_DEF[type] ?? { w: 120, h: 60 };
  return {
    id: raw.id as string,
    type,
    x: Number(raw.x) || 0,
    y: Number(raw.y) || 0,
    w: Number(raw.w) || (type === 'txt' ? 100 : def.w),
    h: Number(raw.h) || (type === 'txt' ? 30  : def.h),
    txt: String(raw.txt || ''),
    color: raw.color as string | undefined,
  };
}

// ── Text padding per shape ────────────────────────────────────────────────────
function textPad(type: DiagShape, w: number, h: number) {
  switch (type) {
    case 'speech': case 'callout':    return { pt: 4, pb: Math.round(h * 0.3),  pl: 8, pr: 8 };
    case 'cylinder':                  return { pt: Math.round(h * 0.2), pb: Math.round(h * 0.2), pl: 8, pr: 8 };
    case 'triangle':                  return { pt: Math.round(h * 0.3), pb: 0,   pl: 10, pr: 10 };
    case 'triangle-down':             return { pt: 0, pb: Math.round(h * 0.3),   pl: 10, pr: 10 };
    case 'diamond':                   return { pt: 0, pb: 0, pl: Math.round(w * 0.18), pr: Math.round(w * 0.18) };
    case 'frame':                     return { pt: 4, pb: Math.max(0, h - 26),   pl: 6,  pr: 6 };
    case 'person':                    return { pt: Math.round(h * 0.55), pb: 2,  pl: 2,  pr: 2 };
    case 'document':                  return { pt: 6, pb: 6, pl: 8, pr: Math.round(Math.min(h * 0.2, 22)) + 4 };
    case 'line-plain': case 'line-arr': case 'line-both': case 'line-dash': case 'line-dot':
      return { pt: 0, pb: 0, pl: 0, pr: 0 };
    case 'star': case 'cross':        return { pt: 0, pb: 0, pl: 0, pr: 0 };
    case 'monitor':                   return { pt: Math.round(h * 0.82), pb: 0, pl: 10, pr: 10 };
    case 'laptop':                    return { pt: Math.round(h * 0.62), pb: 0, pl: 10, pr: 10 };
    case 'mobile':                    return { pt: Math.round(h * 0.12), pb: Math.round(h * 0.18), pl: 6, pr: 6 };
    case 'server':                    return { pt: 6, pb: 6, pl: Math.round(w * 0.08), pr: Math.round(w * 0.2) };
    case 'browser':                   return { pt: Math.round(h * 0.24), pb: 4, pl: 8, pr: 8 };
    case 'firewall':                  return { pt: Math.round(h * 0.18), pb: Math.round(h * 0.2), pl: Math.round(w * 0.12), pr: Math.round(w * 0.12) };
    case 'apibox':                    return { pt: 6, pb: 6, pl: Math.round(w * 0.12), pr: Math.round(w * 0.12) };
    case 'saascloud':                 return { pt: 4, pb: Math.round(h * 0.32), pl: 12, pr: 12 };
    case 'queue':                     return { pt: 0, pb: 0, pl: Math.round(w * 0.1), pr: Math.round(w * 0.12) };
    case 'dbstack':                   return { pt: 0, pb: 0, pl: 0, pr: 0 };
    case 'netswitch':                 return { pt: 4, pb: Math.round(h * 0.45), pl: 8, pr: 8 };
    case 'router':                    return { pt: Math.round(h * 0.48), pb: Math.round(h * 0.14), pl: 8, pr: 8 };
    default:                          return { pt: 6, pb: 6, pl: 10, pr: 10 };
  }
}

// ── Shape SVG content ─────────────────────────────────────────────────────────
function ShapeContent({ type, w, h, fill, stroke, sw }: {
  type: DiagShape; w: number; h: number; fill: string; stroke: string; sw: number;
}) {
  switch (type) {
    case 'box':
      return <rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={sw} />;

    case 'rounded':
      return <rect x={0} y={0} width={w} height={h} rx={14} ry={14} fill={fill} stroke={stroke} strokeWidth={sw} />;

    case 'badge':
      return <rect x={0} y={0} width={w} height={h} rx={h / 2} ry={h / 2} fill={fill} stroke={stroke} strokeWidth={sw} />;

    case 'circle': case 'oval':
      return <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 1} ry={h / 2 - 1} fill={fill} stroke={stroke} strokeWidth={sw} />;

    case 'diamond':
      return <polygon points={`${w/2},1 ${w-1},${h/2} ${w/2},${h-1} 1,${h/2}`} fill={fill} stroke={stroke} strokeWidth={sw} />;

    case 'parallelogram': {
      const off = w * 0.18;
      return <polygon points={`${off},0 ${w},0 ${w - off},${h} 0,${h}`} fill={fill} stroke={stroke} strokeWidth={sw} />;
    }

    case 'hexagon': {
      const cx = w / 2, cy = h / 2, rx = w / 2 - 1, ry = h / 2 - 1;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (i * 60 - 30) * Math.PI / 180;
        return `${cx + rx * Math.cos(a)},${cy + ry * Math.sin(a)}`;
      }).join(' ');
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} />;
    }

    case 'triangle':
      return <polygon points={`${w/2},1 ${w-1},${h-1} 1,${h-1}`} fill={fill} stroke={stroke} strokeWidth={sw} />;

    case 'triangle-down':
      return <polygon points={`1,1 ${w-1},1 ${w/2},${h-1}`} fill={fill} stroke={stroke} strokeWidth={sw} />;

    case 'pentagon': {
      const cx = w / 2, cy = h / 2, rx = w / 2 - 1, ry = h / 2 - 1;
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = (i * 72 - 90) * Math.PI / 180;
        return `${cx + rx * Math.cos(a)},${cy + ry * Math.sin(a)}`;
      }).join(' ');
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} />;
    }

    case 'star': {
      const cx = w / 2, cy = h / 2;
      const outerR = Math.min(w, h) / 2 - 1, innerR = outerR * 0.4;
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = (i * 36 - 90) * Math.PI / 180;
        const r = i % 2 === 0 ? outerR : innerR;
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
      }).join(' ');
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} />;
    }

    case 'cross': {
      const t = Math.min(w, h) * 0.3, cx = w / 2, cy = h / 2;
      const pts = [
        `${cx-t/2},0`,     `${cx+t/2},0`,
        `${cx+t/2},${cy-t/2}`, `${w},${cy-t/2}`,
        `${w},${cy+t/2}`,  `${cx+t/2},${cy+t/2}`,
        `${cx+t/2},${h}`,  `${cx-t/2},${h}`,
        `${cx-t/2},${cy+t/2}`, `0,${cy+t/2}`,
        `0,${cy-t/2}`,     `${cx-t/2},${cy-t/2}`,
      ].join(' ');
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} />;
    }

    case 'cylinder': {
      const ey = h * 0.18;
      return (
        <>
          <rect x={0} y={ey} width={w} height={h - ey * 2} fill={fill} stroke="none" />
          <line x1={0} y1={ey} x2={0} y2={h - ey} stroke={stroke} strokeWidth={sw} />
          <line x1={w} y1={ey} x2={w} y2={h - ey} stroke={stroke} strokeWidth={sw} />
          <ellipse cx={w/2} cy={h-ey} rx={w/2} ry={ey} fill={fill} stroke={stroke} strokeWidth={sw} />
          <ellipse cx={w/2} cy={ey}   rx={w/2} ry={ey} fill={fill} stroke={stroke} strokeWidth={sw} />
        </>
      );
    }

    case 'cloud': {
      const sx = w / 200, sy = h / 100;
      const adjSw = sw / Math.min(sx, sy);
      return (
        <g transform={`scale(${sx},${sy})`}>
          <path
            d="M25,98 Q4,98 4,75 Q4,52 26,52 Q20,22 48,20 Q62,1 88,18 Q102,1 124,18 Q144,0 165,22 Q188,16 192,42 Q200,52 196,72 Q196,98 172,98 L25,98 Z"
            fill={fill} stroke={stroke} strokeWidth={adjSw} strokeLinejoin="round"
          />
        </g>
      );
    }

    case 'document': {
      const fold = Math.min(w, h) * 0.2;
      return (
        <>
          <path d={`M0,0 L${w-fold},0 L${w},${fold} L${w},${h} L0,${h} Z`} fill={fill} stroke={stroke} strokeWidth={sw} />
          <path d={`M${w-fold},0 L${w-fold},${fold} L${w},${fold}`} fill="none" stroke={stroke} strokeWidth={sw} />
        </>
      );
    }

    case 'note': {
      const fold = Math.min(w, h) * 0.22;
      const nf = fill === '#ffffff' ? '#fef9c3' : fill;
      return (
        <>
          <path d={`M0,0 L${w},0 L${w},${h-fold} L${w-fold},${h} L0,${h} Z`} fill={nf} stroke={stroke} strokeWidth={sw} />
          <path d={`M${w-fold},${h-fold} L${w},${h-fold} M${w-fold},${h-fold} L${w-fold},${h}`} fill="none" stroke={stroke} strokeWidth={sw * 0.6} opacity={0.4} />
          <line x1={w*0.15} y1={h*0.3}  x2={w*0.85} y2={h*0.3}  stroke={stroke} strokeWidth={sw * 0.55} opacity={0.3} />
          <line x1={w*0.15} y1={h*0.48} x2={w*0.85} y2={h*0.48} stroke={stroke} strokeWidth={sw * 0.55} opacity={0.3} />
          <line x1={w*0.15} y1={h*0.66} x2={w*0.72} y2={h*0.66} stroke={stroke} strokeWidth={sw * 0.55} opacity={0.3} />
        </>
      );
    }

    case 'speech': {
      const tailH = h * 0.28, bodyH = h - tailH;
      return (
        <>
          <rect x={0} y={0} width={w} height={bodyH} rx={10} ry={10} fill={fill} stroke={stroke} strokeWidth={sw} />
          <polygon points={`${w*0.18},${bodyH} ${w*0.35},${h} ${w*0.52},${bodyH}`} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <line x1={w*0.185} y1={bodyH-1} x2={w*0.515} y2={bodyH-1} stroke={fill} strokeWidth={sw+1} />
        </>
      );
    }

    case 'callout': {
      const tailH = h * 0.25, bodyH = h - tailH;
      return (
        <>
          <rect x={0} y={0} width={w} height={bodyH} rx={8} ry={8} fill={fill} stroke={stroke} strokeWidth={sw} />
          <polygon points={`${w*0.65},${bodyH} ${w*0.9},${h} ${w*0.8},${bodyH}`} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <line x1={w*0.655} y1={bodyH-1} x2={w*0.795} y2={bodyH-1} stroke={fill} strokeWidth={sw+1} />
        </>
      );
    }

    case 'person': {
      const sx = w / 60, sy = h / 100;
      const adjSw = sw / Math.min(sx, sy);
      return (
        <g transform={`scale(${sx},${sy})`}>
          <circle cx={30} cy={17} r={13} fill={fill} stroke={stroke} strokeWidth={adjSw} />
          <path d="M10,32 Q30,27 50,32 L54,66 Q30,70 6,66 Z" fill={fill} stroke={stroke} strokeWidth={adjSw} strokeLinejoin="round" />
          <line x1={10} y1={34} x2={3}  y2={56} stroke={stroke} strokeWidth={adjSw} strokeLinecap="round" />
          <line x1={50} y1={34} x2={57} y2={56} stroke={stroke} strokeWidth={adjSw} strokeLinecap="round" />
          <line x1={18} y1={66} x2={12} y2={92} stroke={stroke} strokeWidth={adjSw} strokeLinecap="round" />
          <line x1={42} y1={66} x2={48} y2={92} stroke={stroke} strokeWidth={adjSw} strokeLinecap="round" />
        </g>
      );
    }

    case 'frame':
      return (
        <>
          <rect x={0} y={0} width={w} height={h} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray="8 4" />
          <rect x={0} y={0} width={w} height={26} fill={fill === '#ffffff' ? '#f5f5f7' : fill} stroke={stroke} strokeWidth={sw} />
        </>
      );

    case 'arrow-right': {
      const ah = Math.min(h * 0.5, 32), bh = h * 0.46, bt = (h - bh) / 2;
      return (
        <polygon
          points={`0,${bt} ${w-ah},${bt} ${w-ah},0 ${w},${h/2} ${w-ah},${h} ${w-ah},${bt+bh} 0,${bt+bh}`}
          fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"
        />
      );
    }

    // ── Line connector shapes ─────────────────────────────────────────────────

    case 'line-plain': {
      const y = h / 2;
      return (
        <>
          <rect x={0} y={0} width={w} height={h} fill="transparent" stroke="none" />
          <line x1={0} y1={y} x2={w} y2={y} stroke={stroke} strokeWidth={2} strokeLinecap="round" />
        </>
      );
    }

    case 'line-arr': {
      const y = h / 2, aw = 10, ah = 5;
      return (
        <>
          <rect x={0} y={0} width={w} height={h} fill="transparent" stroke="none" />
          <line x1={0} y1={y} x2={w - aw + 1} y2={y} stroke={stroke} strokeWidth={2} strokeLinecap="round" />
          <polygon points={`${w - aw},${y - ah} ${w},${y} ${w - aw},${y + ah}`} fill={stroke} />
        </>
      );
    }

    case 'line-both': {
      const y = h / 2, aw = 10, ah = 5;
      return (
        <>
          <rect x={0} y={0} width={w} height={h} fill="transparent" stroke="none" />
          <line x1={aw - 1} y1={y} x2={w - aw + 1} y2={y} stroke={stroke} strokeWidth={2} strokeLinecap="round" />
          <polygon points={`${aw},${y - ah} 0,${y} ${aw},${y + ah}`} fill={stroke} />
          <polygon points={`${w - aw},${y - ah} ${w},${y} ${w - aw},${y + ah}`} fill={stroke} />
        </>
      );
    }

    case 'line-dash': {
      const y = h / 2;
      return (
        <>
          <rect x={0} y={0} width={w} height={h} fill="transparent" stroke="none" />
          <line x1={0} y1={y} x2={w} y2={y} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeDasharray="10 6" />
        </>
      );
    }

    case 'line-dot': {
      const y = h / 2;
      return (
        <>
          <rect x={0} y={0} width={w} height={h} fill="transparent" stroke="none" />
          <line x1={0} y1={y} x2={w} y2={y} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeDasharray="2 5" />
        </>
      );
    }

    // ── Tech / IT shapes ──────────────────────────────────────────────────────

    case 'monitor': {
      const screenH = h * 0.73;
      const neckH   = h * 0.12;
      const baseW   = w * 0.5;
      const baseH   = h * 0.08;
      return (
        <>
          <rect x={0} y={0} width={w} height={screenH} rx={5} fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x={5} y={5} width={w-10} height={screenH-10} rx={3}
            fill={fill === '#ffffff' ? '#dbeafe' : fill} stroke="none" opacity={0.45} />
          <rect x={sw} y={screenH-sw*2} width={w-sw*2} height={sw*2}
            fill={stroke} opacity={0.1} />
          <line x1={w/2} y1={screenH} x2={w/2} y2={screenH+neckH}
            stroke={stroke} strokeWidth={sw*2} strokeLinecap="round" />
          <rect x={(w-baseW)/2} y={screenH+neckH} width={baseW} height={baseH}
            rx={baseH/2} fill={fill} stroke={stroke} strokeWidth={sw} />
        </>
      );
    }

    case 'laptop': {
      const lidH = h * 0.56;
      return (
        <>
          {/* Screen lid */}
          <rect x={w*0.04} y={0} width={w*0.92} height={lidH} rx={5} fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x={w*0.07} y={4} width={w*0.86} height={lidH-8} rx={3}
            fill={fill === '#ffffff' ? '#dbeafe' : fill} stroke="none" opacity={0.45} />
          {/* Hinge bar */}
          <rect x={0} y={lidH} width={w} height={sw*2} fill={stroke} opacity={0.25} rx={1} />
          {/* Base */}
          <rect x={0} y={lidH+sw*2} width={w} height={h-lidH-sw*2} rx={3}
            fill={fill} stroke={stroke} strokeWidth={sw} />
          {/* Keyboard rows */}
          {[0.42, 0.62, 0.80].map((t, i) => (
            <line key={i} x1={w*0.1} y1={lidH + (h-lidH)*t} x2={w*0.9} y2={lidH + (h-lidH)*t}
              stroke={stroke} strokeWidth={sw*0.5} opacity={0.2} />
          ))}
          {/* Trackpad */}
          <rect x={w*0.34} y={h - (h-lidH)*0.3} width={w*0.32} height={(h-lidH)*0.22}
            rx={3} fill="none" stroke={stroke} strokeWidth={sw*0.6} opacity={0.35} />
        </>
      );
    }

    case 'mobile': {
      return (
        <>
          <rect x={0} y={0} width={w} height={h} rx={10} fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x={3} y={h*0.1} width={w-6} height={h*0.73}
            rx={4} fill={fill === '#ffffff' ? '#dbeafe' : fill} stroke="none" opacity={0.45} />
          {/* Speaker slit */}
          <line x1={w*0.35} y1={h*0.055} x2={w*0.65} y2={h*0.055}
            stroke={stroke} strokeWidth={sw*1.3} strokeLinecap="round" />
          {/* Home button */}
          <circle cx={w/2} cy={h*0.9} r={w*0.12}
            fill="none" stroke={stroke} strokeWidth={sw*0.8} />
        </>
      );
    }

    case 'server': {
      const rows = 3;
      const rowH = h / rows;
      const dividers: React.ReactNode[] = [];
      const leds: React.ReactNode[] = [];
      const bays: React.ReactNode[] = [];
      for (let i = 0; i < rows; i++) {
        if (i > 0) dividers.push(
          <line key={`d${i}`} x1={0} y1={rowH*i} x2={w} y2={rowH*i} stroke={stroke} strokeWidth={sw*0.5} opacity={0.3} />
        );
        bays.push(
          <rect key={`b${i}`} x={8} y={rowH*i + rowH/2 - 5} width={w*0.48} height={10}
            rx={2} fill="none" stroke={stroke} strokeWidth={sw*0.5} opacity={0.3} />
        );
        leds.push(
          <circle key={`l${i}`} cx={w-14} cy={rowH*i + rowH/2} r={3.5}
            fill={fill === '#ffffff' ? '#22c55e' : stroke} opacity={0.85} />
        );
      }
      return (
        <>
          <rect x={0} y={0} width={w} height={h} rx={3} fill={fill} stroke={stroke} strokeWidth={sw} />
          {dividers}{bays}{leds}
        </>
      );
    }

    case 'netswitch': {
      const portCount = 8;
      const portW = (w - 28) / portCount - 3;
      const portH = h * 0.32;
      const portY = h * 0.52;
      const ports: React.ReactNode[] = [];
      const leds: React.ReactNode[] = [];
      for (let i = 0; i < portCount; i++) {
        const px = 14 + i * ((w-28) / portCount);
        ports.push(
          <rect key={`p${i}`} x={px} y={portY} width={portW} height={portH}
            rx={1.5} fill="none" stroke={stroke} strokeWidth={sw*0.6} opacity={0.5} />
        );
        leds.push(
          <circle key={`l${i}`} cx={px + portW/2} cy={h*0.28} r={2.5}
            fill={i % 3 === 0 ? (fill === '#ffffff' ? '#f59e0b' : stroke) : (fill === '#ffffff' ? '#22c55e' : stroke)}
            opacity={0.75} />
        );
      }
      return (
        <>
          <rect x={0} y={0} width={w} height={h} rx={4} fill={fill} stroke={stroke} strokeWidth={sw} />
          {leds}{ports}
        </>
      );
    }

    case 'router': {
      const bodyY = h * 0.32;
      const bodyH = h * 0.54;
      return (
        <>
          {/* Antennas */}
          <line x1={w*0.25} y1={bodyY} x2={w*0.18} y2={0} stroke={stroke} strokeWidth={sw*1.3} strokeLinecap="round" />
          <line x1={w*0.5}  y1={bodyY} x2={w*0.5}  y2={0} stroke={stroke} strokeWidth={sw*1.3} strokeLinecap="round" />
          <line x1={w*0.75} y1={bodyY} x2={w*0.82} y2={0} stroke={stroke} strokeWidth={sw*1.3} strokeLinecap="round" />
          {/* Antenna tips */}
          {[0.18, 0.5, 0.82].map((x, i) => (
            <circle key={i} cx={w*x} cy={0} r={3} fill={stroke} opacity={0.6} />
          ))}
          {/* Body */}
          <rect x={0} y={bodyY} width={w} height={bodyH} rx={6} fill={fill} stroke={stroke} strokeWidth={sw} />
          {/* Ports */}
          {[0.18, 0.38, 0.58, 0.78].map((x, i) => (
            <rect key={i} x={w*x-5} y={bodyY+bodyH-h*0.17} width={10} height={h*0.12}
              rx={1.5} fill="none" stroke={stroke} strokeWidth={sw*0.6} opacity={0.5} />
          ))}
          {/* Status LED */}
          <circle cx={w*0.84} cy={bodyY + bodyH*0.35} r={3}
            fill={fill === '#ffffff' ? '#22c55e' : stroke} opacity={0.85} />
        </>
      );
    }

    case 'firewall': {
      const d = `M${w*0.5},${h*0.02} L${w*0.97},${h*0.17} L${w*0.97},${h*0.47} `
              + `Q${w*0.97},${h*0.85} ${w*0.5},${h*0.98} `
              + `Q${w*0.03},${h*0.85} ${w*0.03},${h*0.47} L${w*0.03},${h*0.17} Z`;
      return (
        <>
          <path d={d} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          {/* Lock body */}
          <rect x={w*0.34} y={h*0.52} width={w*0.32} height={h*0.24}
            rx={3} fill="none" stroke={stroke} strokeWidth={sw*1.1} opacity={0.45} />
          {/* Lock shackle */}
          <path d={`M${w*0.4},${h*0.52} L${w*0.4},${h*0.42} Q${w*0.4},${h*0.32} ${w*0.5},${h*0.32} Q${w*0.6},${h*0.32} ${w*0.6},${h*0.42} L${w*0.6},${h*0.52}`}
            fill="none" stroke={stroke} strokeWidth={sw*1.1} opacity={0.45} />
          <circle cx={w*0.5} cy={h*0.645} r={h*0.032}
            fill={stroke} opacity={0.4} />
        </>
      );
    }

    case 'browser': {
      const barH = h * 0.22;
      const dotR = barH * 0.21;
      const addrY = (barH - barH*0.38) / 2;
      return (
        <>
          <rect x={0} y={0} width={w} height={h} rx={7} fill={fill} stroke={stroke} strokeWidth={sw} />
          {/* Title bar bg */}
          <path d={`M0,${barH/2} L0,7 Q0,0 7,0 L${w-7},0 Q${w},0 ${w},7 L${w},${barH/2} Z`}
            fill={fill === '#ffffff' ? '#f3f4f6' : fill} stroke="none" />
          <rect x={0} y={barH/2} width={w} height={barH/2}
            fill={fill === '#ffffff' ? '#f3f4f6' : fill} stroke="none" />
          <line x1={0} y1={barH} x2={w} y2={barH} stroke={stroke} strokeWidth={sw*0.6} opacity={0.4} />
          {/* Traffic lights */}
          {(['#ef4444','#f59e0b','#22c55e'] as const).map((c, i) => (
            <circle key={i} cx={10 + i*16} cy={barH/2} r={dotR} fill={c} opacity={0.8} />
          ))}
          {/* Address bar */}
          <rect x={w*0.26} y={addrY} width={w*0.54} height={barH*0.38}
            rx={barH*0.19} fill={fill} stroke={stroke} strokeWidth={sw*0.5} opacity={0.55} />
          {/* Content placeholder lines */}
          {[0.18, 0.36, 0.54, 0.72].map((t, i) => (
            <line key={i} x1={w*0.07} y1={barH + (h-barH)*t} x2={w*(i%2===0 ? 0.93 : 0.75)} y2={barH + (h-barH)*t}
              stroke={stroke} strokeWidth={sw*0.5} opacity={0.15} />
          ))}
        </>
      );
    }

    case 'apibox': {
      const connR = 5;
      const [cy1, cy2] = [h*0.3, h*0.7];
      return (
        <>
          <rect x={connR} y={0} width={w-connR*2} height={h} rx={6} fill={fill} stroke={stroke} strokeWidth={sw} />
          {/* Left connectors */}
          {[cy1, cy2].map((cy, i) => (
            <g key={`l${i}`}>
              <line x1={0} y1={cy} x2={connR+1} y2={cy} stroke={stroke} strokeWidth={sw} />
              <circle cx={0} cy={cy} r={connR} fill={fill} stroke={stroke} strokeWidth={sw} />
            </g>
          ))}
          {/* Right connectors */}
          {[cy1, cy2].map((cy, i) => (
            <g key={`r${i}`}>
              <line x1={w-connR-1} y1={cy} x2={w} y2={cy} stroke={stroke} strokeWidth={sw} />
              <circle cx={w} cy={cy} r={connR} fill={fill} stroke={stroke} strokeWidth={sw} />
            </g>
          ))}
          {/* Bidirectional chevrons */}
          <polyline points={`${w*0.36},${h/2-5} ${w*0.28},${h/2} ${w*0.36},${h/2+5}`}
            fill="none" stroke={stroke} strokeWidth={sw*0.8} opacity={0.35} strokeLinejoin="round" />
          <polyline points={`${w*0.64},${h/2-5} ${w*0.72},${h/2} ${w*0.64},${h/2+5}`}
            fill="none" stroke={stroke} strokeWidth={sw*0.8} opacity={0.35} strokeLinejoin="round" />
        </>
      );
    }

    case 'dbstack': {
      const numCyl = 3;
      const ey = Math.min(h * 0.09, 11);
      const cylH = (h - ey) / numCyl;
      const elements: React.ReactNode[] = [];
      // Draw from bottom to top so top cylinder covers bottom ones
      for (let i = numCyl-1; i >= 0; i--) {
        const ty = i * cylH;
        const bodyH = cylH - ey;
        elements.push(
          <rect key={`rb${i}`} x={1} y={ty+ey} width={w-2} height={bodyH} fill={fill} stroke="none" />,
          <line key={`ll${i}`} x1={0} y1={ty+ey} x2={0} y2={ty+ey+bodyH} stroke={stroke} strokeWidth={sw} />,
          <line key={`lr${i}`} x1={w} y1={ty+ey} x2={w} y2={ty+ey+bodyH} stroke={stroke} strokeWidth={sw} />,
          <ellipse key={`bot${i}`} cx={w/2} cy={ty+ey+bodyH} rx={w/2-1} ry={ey}
            fill={fill} stroke={stroke} strokeWidth={sw} />,
          <ellipse key={`top${i}`} cx={w/2} cy={ty+ey} rx={w/2-1} ry={ey}
            fill={fill} stroke={stroke} strokeWidth={sw} />,
        );
      }
      return <>{elements}</>;
    }

    case 'saascloud': {
      const cloudH = h * 0.7;
      const sx = w / 200, sy = cloudH / 100;
      const adjSw = sw / Math.min(sx, sy);
      return (
        <>
          <g transform={`scale(${sx},${sy})`}>
            <path
              d="M25,98 Q4,98 4,75 Q4,52 26,52 Q20,22 48,20 Q62,1 88,18 Q102,1 124,18 Q144,0 165,22 Q188,16 192,42 Q200,52 196,72 Q196,98 172,98 L25,98 Z"
              fill={fill} stroke={stroke} strokeWidth={adjSw} strokeLinejoin="round"
            />
          </g>
          {/* Service delivery lines */}
          {[0.22, 0.5, 0.78].map((x, i) => (
            <g key={i}>
              <line x1={w*x} y1={cloudH} x2={w*x} y2={h - 4}
                stroke={stroke} strokeWidth={sw} strokeDasharray="3 2" opacity={0.45} />
              <polygon
                points={`${w*x - 4},${h-8} ${w*x + 4},${h-8} ${w*x},${h-1}`}
                fill={stroke} opacity={0.4}
              />
            </g>
          ))}
        </>
      );
    }

    case 'queue': {
      const ex = Math.min(w * 0.07, 14);
      const elements: React.ReactNode[] = [];
      // Vertical slot dividers (4 queue slots)
      for (let i = 1; i <= 3; i++) {
        const x = ex + (w - ex*2) * (i/4);
        elements.push(
          <line key={i} x1={x} y1={sw} x2={x} y2={h-sw}
            stroke={stroke} strokeWidth={sw*0.5} opacity={0.3} />
        );
      }
      // Right-pointing arrow inside
      const ax = w - ex - (w - ex*2)*0.15;
      elements.push(
        <polygon key="arr"
          points={`${ax},${h*0.28} ${ax+ex*0.7},${h/2} ${ax},${h*0.72}`}
          fill={stroke} opacity={0.22}
        />
      );
      return (
        <>
          {/* Pipe body */}
          <rect x={ex} y={0} width={w-ex*2} height={h} fill={fill} stroke="none" />
          <line x1={ex} y1={0}   x2={w-ex} y2={0}   stroke={stroke} strokeWidth={sw} />
          <line x1={ex} y1={h}   x2={w-ex} y2={h}   stroke={stroke} strokeWidth={sw} />
          <ellipse cx={ex}   cy={h/2} rx={ex} ry={h/2-1} fill={fill} stroke={stroke} strokeWidth={sw} />
          <ellipse cx={w-ex} cy={h/2} rx={ex} ry={h/2-1} fill={fill} stroke={stroke} strokeWidth={sw} />
          {elements}
        </>
      );
    }

    default:
      return <rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={sw} />;
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DiagramPage() {
  const { id: ideaId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useApp();

  const [state, setState]       = useState<DiagState>({ items: {}, arrs: [] });
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState('');
  const [tool, setTool]         = useState<ToolMode>('sel');
  const [selShape, setSelShape] = useState<DiagShape>('box');
  const [sel, setSel]           = useState<string | null>(null);
  const [arrSrc, setArrSrc]     = useState<string | null>(null);
  const [connStyle, setConnStyle] = useState<ConnStyle>('curve');
  const [connHeads, setConnHeads] = useState<ConnHeads>('end');
  const [sidebarWide, setSidebarWide] = useState(false);

  const connStyleRef = useRef(connStyle);
  const connHeadsRef = useRef(connHeads);
  connStyleRef.current = connStyle;
  connHeadsRef.current = connHeads;

  const canvasRef    = useRef<HTMLDivElement>(null);
  const dragRef      = useRef<{ id: string; offX: number; offY: number } | null>(null);
  const stateRef     = useRef(state);
  const toolRef      = useRef(tool);
  const selRef       = useRef(sel);
  const arrSrcRef    = useRef(arrSrc);
  const selShapeRef  = useRef(selShape);
  const idc          = useRef(0);
  const arc          = useRef(0);
  const saveTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  stateRef.current   = state;
  toolRef.current    = tool;
  selRef.current     = sel;
  arrSrcRef.current  = arrSrc;
  selShapeRef.current = selShape;

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ideaId) return;
    api.get(`/diagrams/${ideaId}`)
      .then(res => {
        const raw = res.data.state || { items: {}, arrs: [] };
        const items: Record<string, DiagItem> = {};
        for (const [k, v] of Object.entries(raw.items || {})) {
          items[k] = normalizeItem(v as Record<string, unknown>);
        }
        setState({ items, arrs: raw.arrs || [] });
        setUpdatedBy(res.data.updated_by_name);
        const ids  = Object.keys(items).map(k => parseInt(k.replace('i', '')) || 0);
        const aids = (raw.arrs || []).map((a: DiagArrow) => parseInt(a.id.replace('a', '')) || 0);
        idc.current = Math.max(0, ...ids);
        arc.current = Math.max(0, ...aids);
      })
      .catch(() => setState({ items: {}, arrs: [] }))
      .finally(() => setLoading(false));
  }, [ideaId]);

  // ── Auto-save (1.5s debounce) ──────────────────────────────────────────────
  const scheduleSave = useCallback((s: DiagState) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await api.put(`/diagrams/${ideaId}`, { state: s });
        setSaveMsg('Saved');
        setUpdatedBy(user?.name || null);
      } catch {
        setSaveMsg('Save failed');
      } finally {
        setSaving(false);
        setTimeout(() => setSaveMsg(''), 2000);
      }
    }, 1500);
  }, [ideaId, user]);

  const updateState = useCallback((fn: (prev: DiagState) => DiagState) => {
    setState(prev => {
      const next = fn(prev);
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Canvas coords ───────────────────────────────────────────────────────────
  function cxy(e: React.MouseEvent) {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  // ── Activate shape tool ─────────────────────────────────────────────────────
  function activateShape(shape: DiagShape) {
    setTool('shape');
    setSelShape(shape);
    setSel(null);
    setArrSrc(null);
  }

  // ── Place an item on the canvas ─────────────────────────────────────────────
  function placeItem(p: { x: number; y: number }, type: DiagShape) {
    const def = SHAPE_DEF[type] ?? { w: 120, h: 60 };
    const w = type === 'txt' ? 100 : def.w;
    const h = type === 'txt' ? 30  : def.h;
    const id = 'i' + (++idc.current);
    const shapeLabel = SHAPES.find(s => s.key === type)?.label ?? 'Item';
    const item: DiagItem = {
      id, type,
      x: Math.round(p.x - w / 2),
      y: Math.round(p.y - h / 2),
      w, h,
      txt: type === 'txt' ? 'Label' : shapeLabel,
    };
    updateState(prev => ({ ...prev, items: { ...prev.items, [id]: item } }));
    const isLine = type.startsWith('line-');
    setTimeout(() => { setSel(id); if (!isLine) triggerEdit(id); }, 40);
  }

  // ── Canvas events ───────────────────────────────────────────────────────────
  function onCanvasDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('.diag-item')) return;
    setSel(null);
    setArrSrc(null);
    const t = toolRef.current;
    if (t === 'shape') { placeItem(cxy(e), selShapeRef.current); return; }
    if (t === 'txt')   { placeItem(cxy(e), 'txt'); return; }
  }

  function onItemDown(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const el = e.target as HTMLElement;
    if (el.getAttribute('contenteditable') === 'true') return;
    if (el.classList.contains('del-btn')) return;

    if (toolRef.current === 'arr') {
      const src = arrSrcRef.current;
      if (!src)       { setArrSrc(id); return; }
      if (src !== id) {
        const aid = 'a' + (++arc.current);
        updateState(prev => ({ ...prev, arrs: [...prev.arrs, {
          id: aid, from: src, to: id, lbl: '',
          style: connStyleRef.current,
          heads: connHeadsRef.current,
        }] }));
        setArrSrc(null);
      }
      return;
    }

    setSel(id);
    const p = cxy(e);
    const it = stateRef.current.items[id];
    dragRef.current = { id, offX: p.x - it.x, offY: p.y - it.y };
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragRef.current) return;
    const { id, offX, offY } = dragRef.current;
    const p = cxy(e);
    updateState(prev => ({
      ...prev,
      items: { ...prev.items, [id]: { ...prev.items[id], x: p.x - offX, y: p.y - offY } },
    }));
  }

  function onMouseUp() { dragRef.current = null; }

  function onDblClick(e: React.MouseEvent) {
    const el = (e.target as HTMLElement).closest('.diag-item') as HTMLElement | null;
    if (el) { e.stopPropagation(); triggerEdit(el.id); }
  }

  // ── Inline text edit ────────────────────────────────────────────────────────
  function triggerEdit(id: string) {
    const tgt = document.getElementById('lbl-' + id);
    if (!tgt) return;
    tgt.setAttribute('contenteditable', 'true');
    tgt.focus();
    const r = document.createRange();
    r.selectNodeContents(tgt);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(r);
    tgt.onblur = () => {
      tgt.removeAttribute('contenteditable');
      const txt = tgt.textContent?.trim() || stateRef.current.items[id]?.txt || '';
      updateState(prev => ({
        ...prev,
        items: { ...prev.items, [id]: { ...prev.items[id], txt } },
      }));
    };
    tgt.onkeydown = (ev: KeyboardEvent) => {
      if (ev.key === 'Enter' || ev.key === 'Escape') { ev.preventDefault(); tgt.blur(); }
    };
  }

  // ── Delete / update ─────────────────────────────────────────────────────────
  function deleteItem(id: string) {
    updateState(prev => {
      const items = { ...prev.items };
      delete items[id];
      return { items, arrs: prev.arrs.filter(a => a.from !== id && a.to !== id) };
    });
    if (sel === id) setSel(null);
  }

  function deleteArrow(aid: string) {
    updateState(prev => ({ ...prev, arrs: prev.arrs.filter(a => a.id !== aid) }));
  }

  function editArrowLabel(aid: string) {
    const a = state.arrs.find(x => x.id === aid);
    const v = prompt('Arrow label:', a?.lbl || '');
    if (v !== null) {
      updateState(prev => ({ ...prev, arrs: prev.arrs.map(a => a.id === aid ? { ...a, lbl: v } : a) }));
    }
  }

  function setItemColor(id: string, color: string) {
    updateState(prev => ({
      ...prev,
      items: { ...prev.items, [id]: { ...prev.items[id], color } },
    }));
  }

  function clearAll() {
    if (!confirm('Clear the entire scratchpad?')) return;
    updateState(() => ({ items: {}, arrs: [] }));
    setSel(null); setArrSrc(null);
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement;
      if (tgt.getAttribute('contenteditable') === 'true') return;
      if (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA') return;

      if (e.key === 'Escape')                    { setTool('sel'); setSel(null); setArrSrc(null); }
      if (e.key === 'v')                          setTool('sel');
      if (e.key === 'b')                          activateShape('box');
      if (e.key === 't')                          { setTool('txt'); setSel(null); setArrSrc(null); }
      if (e.key === 'a')                          { setTool('arr'); setSel(null); setArrSrc(null); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selRef.current) {
        e.preventDefault();
        deleteItem(selRef.current);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Arrow routing ───────────────────────────────────────────────────────────
  function boxCenter(id: string) {
    const it = state.items[id];
    if (!it) return { x: 0, y: 0 };
    return { x: it.x + it.w / 2, y: it.y + it.h / 2 };
  }

  function boxEdge(id: string, tx: number, ty: number) {
    const it = state.items[id];
    if (!it) return { x: 0, y: 0 };
    const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
    const dx = tx - cx, dy = ty - cy;
    if (!dx && !dy) return { x: cx, y: cy };
    const sx = (it.w / 2) / Math.abs(dx), sy = (it.h / 2) / Math.abs(dy);
    const s = Math.min(sx, sy);
    return { x: cx + dx * s, y: cy + dy * s };
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#b0b0b8', fontSize: 14 }}>
      Loading scratchpad…
    </div>
  );

  const selItem = sel ? state.items[sel] : null;
  const cursorMap: Record<ToolMode, string> = { sel: 'default', shape: 'crosshair', txt: 'text', arr: 'cell' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#fff', overflow: 'hidden' }}>

      {/* ── Top toolbar ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderBottom: '1.5px solid #e5e7eb', flexShrink: 0, flexWrap: 'wrap', minHeight: 48 }}>

        <button
          onClick={() => navigate(`/community/${ideaId}`)}
          style={btnStyle(false)}
        >
          ← Back
        </button>

        <div style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 3px' }} />

        {/* Mode tools */}
        <button onClick={() => { setTool('sel'); setSel(null); setArrSrc(null); }} style={btnStyle(tool === 'sel')}>↖ Select</button>
        <button onClick={() => { setTool('txt'); setSel(null); setArrSrc(null); }} style={btnStyle(tool === 'txt')}>T Text</button>
        <button onClick={() => { setTool('arr'); setSel(null); setArrSrc(null); }} style={btnStyle(tool === 'arr')}>→ Connect</button>

        {/* Connector style options — visible when arrow tool is active */}
        {tool === 'arr' && (
          <>
            <div style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 3px' }} />
            <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, whiteSpace: 'nowrap' }}>Line:</span>
            {([
              { v: 'curve',    label: '~ Curve'   },
              { v: 'straight', label: '— Line'    },
              { v: 'ortho',    label: '⌐ Elbow'   },
            ] as { v: ConnStyle; label: string }[]).map(({ v, label }) => (
              <button key={v} onClick={() => setConnStyle(v)}
                style={{ ...smallBtnStyle(connStyle === v) }}>
                {label}
              </button>
            ))}
            <div style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 3px' }} />
            <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, whiteSpace: 'nowrap' }}>Ends:</span>
            {([
              { v: 'end',  label: '→'  },
              { v: 'both', label: '↔' },
              { v: 'none', label: '—'  },
            ] as { v: ConnHeads; label: string }[]).map(({ v, label }) => (
              <button key={v} onClick={() => setConnHeads(v)}
                style={{ ...smallBtnStyle(connHeads === v) }}>
                {label}
              </button>
            ))}
          </>
        )}

        <div style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 3px' }} />

        <button
          onClick={() => sel && deleteItem(sel)}
          disabled={!sel}
          style={{ ...btnStyle(false), color: '#ef4444', opacity: sel ? 1 : 0.3 }}
        >
          ✕ Delete
        </button>
        <button onClick={clearAll} style={{ ...btnStyle(false), color: '#6b7280' }}>
          Clear
        </button>

        {/* Fill color swatch — shows when a non-text item is selected */}
        {selItem && selItem.type !== 'txt' && (
          <>
            <div style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 3px' }} />
            <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700 }}>Fill:</span>
            {FILL_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setItemColor(sel!, c)}
                title={c}
                style={{
                  width: 18, height: 18, borderRadius: '50%', background: c,
                  border: (selItem.color === c || (!selItem.color && c === '#ffffff')) ? '2.5px solid #6366f1' : '1.5px solid #d1d5db',
                  cursor: 'pointer', padding: 0, flexShrink: 0,
                }}
              />
            ))}
          </>
        )}

        {/* Save status */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {saving  && <span style={{ fontSize: 10, color: '#9ca3af' }}>Saving…</span>}
          {!saving && saveMsg === 'Saved'       && <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700 }}>✓ Saved</span>}
          {!saving && saveMsg === 'Save failed' && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>⚠ Failed</span>}
          {!saving && !saveMsg && updatedBy && <span style={{ fontSize: 10, color: '#c4c4c8' }}>Last edit by {updatedBy}</span>}
        </div>
      </div>

      {/* ── Body: sidebar + canvas ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Shape sidebar ─────────────────────────────────────────────────── */}
        <div style={{
          width: sidebarWide ? 180 : 96,
          flexShrink: 0,
          borderRight: '1.5px solid #e5e7eb',
          overflowY: 'auto',
          background: '#fafafa',
          padding: '6px 4px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          transition: 'width .18s ease',
        }}>
          {/* Header row: label + toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 6px', flexShrink: 0 }}>
            <span style={{ fontSize: 9, color: '#c4c4c8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Shapes
            </span>
            <button
              onClick={() => setSidebarWide(w => !w)}
              title={sidebarWide ? 'Collapse panel' : 'Expand panel'}
              style={{
                width: 22, height: 22, borderRadius: 6, border: '1.5px solid #e5e7eb',
                background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 11, color: '#6b7280', flexShrink: 0,
              }}
            >
              {sidebarWide ? '‹' : '›'}
            </button>
          </div>

          {/* Shape grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: sidebarWide ? '1fr 1fr' : '1fr 1fr',
            gap: sidebarWide ? 4 : 3,
            alignContent: 'start',
          }}>
            {SHAPES.map(sh => {
              const isActive = tool === 'shape' && selShape === sh.key;
              return (
                <button
                  key={sh.key}
                  onClick={() => activateShape(sh.key)}
                  title={sh.label}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: sidebarWide ? 4 : 2,
                    padding: sidebarWide ? '10px 4px' : '7px 3px',
                    borderRadius: 8,
                    border: `1.5px solid ${isActive ? '#6366f1' : 'transparent'}`,
                    background: isActive ? '#e0e7ff' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all .12s',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = '#f0f0f7'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: sidebarWide ? 24 : 18, lineHeight: 1 }}>{sh.icon}</span>
                  <span style={{
                    fontSize: sidebarWide ? 10 : 8,
                    color: isActive ? '#4f46e5' : '#6b7280',
                    lineHeight: 1.2,
                    textAlign: 'center',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: sidebarWide ? 72 : 40,
                  }}>
                    {sh.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Canvas ────────────────────────────────────────────────────────── */}
        <div
          ref={canvasRef}
          onMouseDown={onCanvasDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onDoubleClick={onDblClick}
          style={{
            flex: 1, position: 'relative', overflow: 'hidden',
            background: '#fff',
            backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            cursor: cursorMap[tool],
          }}
        >
          {/* Hint banner when shape tool is active */}
          {tool === 'shape' && (
            <div style={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
              background: '#6366f1', color: '#fff', borderRadius: 20, padding: '5px 16px',
              fontSize: 11, fontWeight: 700, pointerEvents: 'none', zIndex: 100,
              boxShadow: '0 4px 12px rgba(99,102,241,.35)',
            }}>
              Click anywhere to place · {SHAPES.find(s => s.key === selShape)?.label}
            </div>
          )}
          {tool === 'arr' && (
            <div style={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
              background: '#374151', color: '#fff', borderRadius: 20, padding: '5px 16px',
              fontSize: 11, fontWeight: 700, pointerEvents: 'none', zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,.2)',
            }}>
              {arrSrc ? 'Click the target shape' : 'Click the source shape'}
            </div>
          )}

          {/* Connector SVG layer */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
            <defs>
              <marker id="ah-end" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <path d="M0,0 L0,6 L9,3 z" fill="#1f2937" />
              </marker>
              <marker id="ah-start" markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto-start-reverse">
                <path d="M0,0 L0,6 L9,3 z" fill="#1f2937" />
              </marker>
            </defs>
            {state.arrs.map(a => {
              const f = state.items[a.from], t2 = state.items[a.to];
              if (!f || !t2) return null;

              const style = a.style ?? 'curve';
              const heads = a.heads ?? 'end';

              const fc = boxCenter(a.from), tc = boxCenter(a.to);
              const fp = boxEdge(a.from, tc.x, tc.y);
              const tp = boxEdge(a.to, fc.x, fc.y);

              // Build path based on connector style
              let d: string;
              let lx: number, ly: number; // label anchor point

              if (style === 'straight') {
                d = `M${fp.x} ${fp.y} L${tp.x} ${tp.y}`;
                lx = (fp.x + tp.x) / 2;
                ly = (fp.y + tp.y) / 2;
              } else if (style === 'ortho') {
                const mx = (fp.x + tp.x) / 2;
                d = `M${fp.x} ${fp.y} L${mx} ${fp.y} L${mx} ${tp.y} L${tp.x} ${tp.y}`;
                lx = mx;
                ly = (fp.y + tp.y) / 2;
              } else {
                // curve (default)
                const mx = (fp.x + tp.x) / 2 - (tp.y - fp.y) * 0.12;
                const my = (fp.y + tp.y) / 2 + (tp.x - fp.x) * 0.12;
                d = `M${fp.x} ${fp.y} Q${mx} ${my} ${tp.x} ${tp.y}`;
                lx = mx; ly = my;
              }

              const markerEnd   = heads !== 'none'          ? 'url(#ah-end)'   : undefined;
              const markerStart = heads === 'both'           ? 'url(#ah-start)' : undefined;

              return (
                <g key={a.id}>
                  <path d={d} fill="none" stroke="#1f2937" strokeWidth="1.8"
                    markerEnd={markerEnd} markerStart={markerStart} />
                  {/* Invisible wide hit zone for clicking */}
                  <path d={d} fill="none" stroke="transparent" strokeWidth="14"
                    style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                    onClick={() => { if (confirm('Delete this connector?')) deleteArrow(a.id); }}
                  />
                  <foreignObject x={lx - 44} y={ly - 11} width="88" height="22" style={{ pointerEvents: 'all' }}>
                    <div
                      // @ts-expect-error xmlns
                      xmlns="http://www.w3.org/1999/xhtml"
                      onDoubleClick={() => editArrowLabel(a.id)}
                      style={{
                        fontSize: 10, fontWeight: 700, color: '#374151',
                        background: 'rgba(255,255,255,.92)', border: '1.5px solid #e5e7eb',
                        borderRadius: 20, padding: '2px 8px', textAlign: 'center',
                        cursor: 'pointer', whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                      }}
                    >
                      {a.lbl || '+ label'}
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>

          {/* Items */}
          {Object.values(state.items).map(it => {
            const isSelected = sel === it.id;
            const isArrSrc   = arrSrc === it.id;
            const fill   = it.color || '#ffffff';
            const stroke = isArrSrc ? '#f59e0b' : isSelected ? '#6366f1' : '#1f2937';
            const sw     = isSelected || isArrSrc ? 2.5 : 1.8;
            const pad    = textPad(it.type, it.w, it.h);

            /* Plain text label */
            if (it.type === 'txt') {
              return (
                <div
                  key={it.id} id={it.id} className="diag-item"
                  onMouseDown={e => onItemDown(e, it.id)}
                  style={{
                    position: 'absolute', left: it.x, top: it.y,
                    padding: '2px 4px', borderRadius: 4,
                    outline: isSelected ? '2px solid #6366f1' : 'none',
                    background: isSelected ? '#f0f0ff' : 'transparent',
                    cursor: 'grab', userSelect: 'none', zIndex: 6, minWidth: 20,
                  }}
                >
                  {isSelected && <XBtn onClick={() => deleteItem(it.id)} />}
                  <span
                    id={`lbl-${it.id}`}
                    style={{ fontSize: 13, fontWeight: 700, color: '#111', outline: 'none', display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-word', minWidth: 20, minHeight: 16 }}
                  >
                    {it.txt}
                  </span>
                </div>
              );
            }

            /* Shape item */
            return (
              <div
                key={it.id} id={it.id} className="diag-item"
                onMouseDown={e => onItemDown(e, it.id)}
                style={{
                  position: 'absolute', left: it.x, top: it.y, width: it.w, height: it.h,
                  cursor: tool === 'arr' ? 'cell' : 'grab',
                  userSelect: 'none', zIndex: isSelected ? 20 : 5,
                }}
              >
                {/* SVG shape */}
                <svg
                  width={it.w} height={it.h}
                  style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
                >
                  <ShapeContent type={it.type} w={it.w} h={it.h} fill={fill} stroke={stroke} sw={sw} />
                  {isSelected && (
                    <rect x={-3} y={-3} width={it.w + 6} height={it.h + 6}
                      fill="none" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="5 3" rx={4} opacity={0.5} />
                  )}
                </svg>

                {/* Delete button */}
                {isSelected && <XBtn onClick={() => deleteItem(it.id)} />}

                {/* Arrow source ring */}
                {isArrSrc && (
                  <div style={{ position: 'absolute', inset: -4, borderRadius: 6, border: '2.5px solid #f59e0b', pointerEvents: 'none', opacity: 0.8 }} />
                )}

                {/* Text overlay (skip for line connectors) */}
                {!it.type.startsWith('line-') && (
                  <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    paddingTop: pad.pt, paddingBottom: pad.pb,
                    paddingLeft: pad.pl, paddingRight: pad.pr,
                  }}>
                    <span
                      id={`lbl-${it.id}`}
                      style={{
                        fontSize: 12, fontWeight: 600, color: '#111',
                        textAlign: 'center', lineHeight: 1.35, outline: 'none',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        display: 'block', minWidth: 10, pointerEvents: 'all',
                      }}
                    >
                      {it.txt}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty state */}
          {Object.keys(state.items).length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', gap: 10 }}>
              <div style={{ fontSize: 40 }}>✏️</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#9ca3af' }}>Start sketching your idea</div>
              <div style={{ fontSize: 12, color: '#c4c4c8' }}>Pick a shape from the left panel, then click anywhere on the canvas</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function btnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '5px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb',
    background: active ? '#111' : '#fff',
    color: active ? '#fff' : '#374151',
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
    transition: 'all .12s', flexShrink: 0,
  };
}

function smallBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '4px 9px', borderRadius: 7,
    border: `1.5px solid ${active ? '#6366f1' : '#e5e7eb'}`,
    background: active ? '#e0e7ff' : '#fff',
    color: active ? '#4f46e5' : '#374151',
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
    transition: 'all .12s', flexShrink: 0,
  };
}

function XBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onMouseDown={e => e.stopPropagation()}
      onClick={onClick}
      className="del-btn"
      style={{
        position: 'absolute', top: -9, right: -9, width: 18, height: 18,
        borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none',
        fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontWeight: 900, zIndex: 30,
      }}
    >
      ✕
    </button>
  );
}
