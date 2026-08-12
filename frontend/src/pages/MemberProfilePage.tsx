import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { communityApi } from '@/api/client';
import { useApp } from '@/context/AppContext';
import { Stage, STAGE_LABELS, STAGE_COLORS } from '@/types';

// ── Minimal types ──────────────────────────────────────────────────────────────

interface IdeaCard {
  id: string;
  name: string;
  description: string | null;
  stage: Stage;
  idea_status: 'active' | 'done' | 'archived';
  business_domain: string | null;
  author_name: string;
  author_initials: string;
  post_count: number;
  updated_at: string;
}

interface PainPoint {
  id: string;
  content: string;
  stage: Stage;
  created_at: string;
  author_name: string;
  author_initials: string;
  encourage_count: number;
  pursue_count: number;
  comment_count: number;
}

interface PPComment {
  id: string;
  content: string;
  author_name: string;
  author_initials: string;
  created_at: string;
}

// ── Contribution type system (mirrors CommunityPage) ──────────────────────────

const CONTRIB_TYPES = [
  { key: 'question',   icon: '🔍', label: 'Deeper questions',  pts: 42, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)'  },
  { key: 'assumption', icon: '⚠️', label: 'Challenged assumptions', pts: 31, color: '#d97706', bg: 'rgba(217,119,6,0.08)'   },
  { key: 'idea',       icon: '💡', label: 'Solutions proposed', pts: 28, color: '#2563eb', bg: 'rgba(37,99,235,0.07)'   },
  { key: 'experiment', icon: '🧪', label: 'Experiments suggested', pts: 24, color: '#2563eb', bg: 'rgba(37,99,235,0.07)'   },
  { key: 'experience', icon: '🔄', label: 'Experiences shared',  pts: 19, color: '#dc2626', bg: 'rgba(220,38,38,0.07)'   },
  { key: 'evidence',   icon: '📊', label: 'Evidence added',     pts: 18, color: '#059669', bg: 'rgba(5,150,105,0.08)'   },
  { key: 'impact',     icon: '🎯', label: 'Impact estimates',   pts: 15, color: '#059669', bg: 'rgba(5,150,105,0.07)'   },
] as const;
type ContribKey = typeof CONTRIB_TYPES[number]['key'];

const CONTRIB_PREFIX_RE = /^\[TYPE:(\w+)\]\s*([\s\S]+)/;
function parseContrib(content: string): { type: ContribKey | null } {
  const m = content.match(CONTRIB_PREFIX_RE);
  if (m) return { type: m[1] as ContribKey };
  return { type: null };
}

// ── Pain point description extractor ──────────────────────────────────────────

function ppDescription(content: string): string {
  const m = content.match(/\|\|PP\|\|(.+?)\|\|END\|\|/s);
  if (!m) return content.slice(0, 120);
  try {
    const data = JSON.parse(m[1]);
    return data.description ?? content.slice(0, 120);
  } catch {
    return content.slice(0, 120);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const secs = (Date.now() - new Date(iso).getTime()) / 1000;
  if (secs < 60)  return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function avatarColor(name: string): string {
  const colors = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2', '#7c3aed'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MemberProfilePage() {
  const { name: encodedName } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { user } = useApp();

  const memberName = decodeURIComponent(encodedName ?? '');
  const isOwnProfile = user?.name === memberName;

  const memberInitials = memberName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [ideas, setIdeas]             = useState<IdeaCard[]>([]);
  const [painPoints, setPainPoints]   = useState<PainPoint[]>([]);
  const [contribMap, setContribMap]   = useState<Partial<Record<ContribKey, number>>>({});
  const [totalPts, setTotalPts]       = useState(0);
  const [totalContribs, setTotalContribs] = useState(0);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ideasRes, ppRes] = await Promise.all([
          communityApi.listIdeas(),
          communityApi.listPainPoints(),
        ]);

        const allIdeas: IdeaCard[]    = ideasRes.data.ideas ?? [];
        const allPPs: PainPoint[]     = ppRes.data.posts ?? [];

        const myIdeas  = allIdeas.filter(i => i.author_name === memberName);
        const myPPs    = allPPs.filter(p => p.author_name === memberName);

        if (cancelled) return;
        setIdeas(myIdeas);
        setPainPoints(myPPs);

        // Fetch all pain points' comments in parallel, filter by this author
        const commentBatches: PPComment[][] = await Promise.all(
          allPPs.map(pp =>
            communityApi.getComments(pp.id)
              .then(r => (r.data.comments ?? []) as PPComment[])
              .catch(() => [] as PPComment[])
          )
        );

        if (cancelled) return;

        const map: Partial<Record<ContribKey, number>> = {};
        let pts = 0;
        let count = 0;

        commentBatches.flat()
          .filter(c => c.author_name === memberName)
          .forEach(c => {
            const { type } = parseContrib(c.content);
            if (!type) return;
            const ct = CONTRIB_TYPES.find(x => x.key === type);
            if (!ct) return;
            map[type] = (map[type] ?? 0) + 1;
            pts  += ct.pts;
            count += 1;
          });

        setContribMap(map);
        setTotalPts(pts);
        setTotalContribs(count);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [memberName]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const topStage = ideas[0]?.stage ?? null;
  const domains = [...new Set(ideas.map(i => i.business_domain).filter(Boolean))] as string[];
  const color = avatarColor(memberName);
  const maxContribCount = Math.max(1, ...Object.values(contribMap).filter((v): v is number => v !== undefined));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 20px 60px' }}>

      {/* Back */}
      <button
        onClick={() => navigate('/community')}
        style={{
          background: 'none', border: '1px solid #e5e5ea', borderRadius: 20,
          padding: '6px 14px', fontSize: 13, fontWeight: 600,
          color: '#6e6e73', cursor: 'pointer', fontFamily: 'inherit',
          marginBottom: 24, display: 'inline-flex', alignItems: 'center', gap: 6,
        }}
      >
        ← Community
      </button>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Loading profile…</div>
        </div>
      ) : (
        <>
          {/* ── Hero ── */}
          <div style={{
            background: '#fff', borderRadius: 20, border: '1.5px solid #f0f0f5',
            padding: '28px 28px 24px', marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' as const }}>
              {/* Avatar */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, fontWeight: 800, flexShrink: 0,
              }}>
                {memberInitials}
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const, marginBottom: 8 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.4, color: '#1d1d1f', margin: 0 }}>
                    {memberName}
                  </h1>
                  {isOwnProfile && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 20, padding: '2px 8px' }}>
                      You
                    </span>
                  )}
                </div>

                {/* Stage + domains */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                  {topStage && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                      background: STAGE_COLORS[topStage] + '15',
                      color: STAGE_COLORS[topStage],
                      border: `1px solid ${STAGE_COLORS[topStage]}30`,
                    }}>
                      {STAGE_LABELS[topStage]}
                    </span>
                  )}
                  {domains.slice(0, 3).map(d => (
                    <span key={d} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#f5f5f7', color: '#6e6e73', border: '1px solid #e5e5ea' }}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              {/* Own profile hint */}
              {isOwnProfile && (
                <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'right' as const, lineHeight: 1.5 }}>
                  Edit your name &amp; settings<br />
                  via your avatar in the nav ↗
                </div>
              )}
            </div>

            {/* Stats strip */}
            <div style={{
              display: 'flex', gap: 0, marginTop: 22,
              background: '#f9f9fb', borderRadius: 14, overflow: 'hidden',
              border: '1px solid #f0f0f5',
            }}>
              {[
                { icon: '💡', value: ideas.length,      label: 'ideas'       },
                { icon: '🎯', value: painPoints.length,  label: 'pain points' },
                { icon: '🧠', value: totalContribs,      label: 'contributions' },
                { icon: '🏆', value: totalPts,           label: 'thinking pts' },
              ].map((s, i, arr) => (
                <div
                  key={s.label}
                  style={{
                    flex: 1, padding: '14px 8px', textAlign: 'center' as const,
                    borderRight: i < arr.length - 1 ? '1px solid #f0f0f5' : 'none',
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 2 }}>{s.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#1d1d1f', lineHeight: 1 }}>{s.value.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, marginTop: 3, textTransform: 'uppercase' as const, letterSpacing: 0.4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Contribution Breakdown ── */}
          {totalContribs > 0 && (
            <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #f0f0f5', padding: '22px 24px', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1d1d1f', marginBottom: 4 }}>🧠 Thinking style</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 18 }}>
                {memberName.split(' ')[0]}'s contribution breakdown across all pain point investigations
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {CONTRIB_TYPES.map(ct => {
                  const count = contribMap[ct.key] ?? 0;
                  if (count === 0) return null;
                  const barW = Math.round((count / maxContribCount) * 100);
                  return (
                    <div key={ct.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 110, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 14 }}>{ct.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: ct.color }}>{ct.label}</span>
                      </div>
                      <div style={{ flex: 1, height: 8, background: '#f5f5f7', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${barW}%`, background: ct.color, borderRadius: 99, transition: 'width .4s ease' }} />
                      </div>
                      <div style={{ width: 28, textAlign: 'right' as const, fontSize: 12, fontWeight: 800, color: '#1d1d1f', flexShrink: 0 }}>
                        {count}
                      </div>
                      <div style={{ width: 44, textAlign: 'right' as const, fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>
                        +{ct.pts * count}pts
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Ideas ── */}
          {ideas.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1d1d1f', marginBottom: 14 }}>
                💡 Ideas ({ideas.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {ideas.map(idea => (
                  <button
                    key={idea.id}
                    onClick={() => navigate(`/community/${idea.id}`)}
                    style={{
                      textAlign: 'left' as const, background: '#fff', border: '1.5px solid #f0f0f5',
                      borderRadius: 16, padding: '18px 18px 14px', cursor: 'pointer',
                      fontFamily: 'inherit', transition: 'all .15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#ddd6fe'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.06)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#f0f0f5'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                        background: STAGE_COLORS[idea.stage] + '15',
                        color: STAGE_COLORS[idea.stage],
                        border: `1px solid ${STAGE_COLORS[idea.stage]}30`,
                      }}>
                        {STAGE_LABELS[idea.stage]}
                      </span>
                      {idea.business_domain && (
                        <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>{idea.business_domain}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.4, marginBottom: 8 }}>
                      {idea.name}
                    </div>
                    {idea.description && (
                      <div style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.5, marginBottom: 10,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {idea.description}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#b0b0b8' }}>
                      {idea.post_count} post{idea.post_count !== 1 ? 's' : ''} · {timeAgo(idea.updated_at)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Pain Points ── */}
          {painPoints.length > 0 && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1d1d1f', marginBottom: 14 }}>
                🎯 Pain Points raised ({painPoints.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {painPoints.map(pp => (
                  <div
                    key={pp.id}
                    style={{
                      background: '#fff', border: '1.5px solid #f0f0f5', borderRadius: 14,
                      padding: '16px 18px',
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.4, marginBottom: 8 }}>
                      {ppDescription(pp.content)}
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#9ca3af', flexWrap: 'wrap' as const }}>
                      <span>🙋 {pp.encourage_count} confirmed</span>
                      <span>🚀 {pp.pursue_count} pursuing</span>
                      <span>💬 {pp.comment_count} contributions</span>
                      <span>{timeAgo(pp.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {ideas.length === 0 && painPoints.length === 0 && totalContribs === 0 && (
            <div style={{ textAlign: 'center' as const, padding: '48px 0', color: '#9ca3af' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>👀</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', marginBottom: 6 }}>Nothing here yet</div>
              <div style={{ fontSize: 13 }}>
                {isOwnProfile
                  ? 'Post an idea or investigate a pain point to get started.'
                  : `${memberName} hasn't posted publicly yet.`}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
