import { useState } from 'react';
import { contentToolsApi } from '@/api/client';
import { useIsMobile } from '@/hooks/useIsMobile';

// -- Content tools -- AI copy for MVP Club ------------------------------------
//
// Four tools (social posts, WhatsApp/email messages, event & stall copy, product
// descriptions). The founder describes what it's about, picks a format and tone,
// and gets three distinct variants to copy. Nothing is saved: this is a
// scratchpad for getting words on the page quickly, in line with the product's
// "one clear next step" philosophy.

type ContentType = 'social' | 'message' | 'event' | 'product';
type Tone = 'friendly' | 'professional' | 'bold' | 'playful';
interface Variant { subject: string | null; body: string }

const TOOLS: {
  type: ContentType; icon: string; label: string; blurb: string;
  formats: { id: string; label: string }[];
  placeholder: string;
  audiencePlaceholder: string;
  ctaPlaceholder: string;
}[] = [
  {
    type: 'social', icon: '📣', label: 'Social posts', blurb: 'Captions and posts for your channels.',
    formats: [
      { id: 'linkedin', label: 'LinkedIn' }, { id: 'x', label: 'X' },
      { id: 'instagram', label: 'Instagram' }, { id: 'facebook', label: 'Facebook' },
    ],
    placeholder: 'e.g. Three founders at MVP Club talked to 5 customers each this week and found their idea needed a different audience.',
    audiencePlaceholder: 'e.g. first-time founders',
    ctaPlaceholder: 'e.g. Join us at mvpclub.io',
  },
  {
    type: 'message', icon: '💬', label: 'WhatsApp & email', blurb: 'Broadcasts, nudges and announcements.',
    formats: [{ id: 'whatsapp', label: 'WhatsApp' }, { id: 'email', label: 'Email' }],
    placeholder: 'e.g. Remind members to log one pain point this week and share what they learned.',
    audiencePlaceholder: 'e.g. members at the Validate stage',
    ctaPlaceholder: 'e.g. Reply with your biggest question',
  },
  {
    type: 'event', icon: '🎟️', label: 'Event & stall copy', blurb: 'Announcements, posters and invites.',
    formats: [{ id: 'announcement', label: 'Announcement' }, { id: 'poster', label: 'Poster / banner' }, { id: 'invite', label: 'Invite' }],
    placeholder: 'e.g. A Saturday founder demo hour where 5 people show what they built this month. Date and venue to be confirmed.',
    audiencePlaceholder: 'e.g. local early-stage founders',
    ctaPlaceholder: 'e.g. RSVP by Friday',
  },
  {
    type: 'product', icon: '🏷️', label: 'Product descriptions', blurb: 'Describe MVP Club or any feature.',
    formats: [{ id: 'short', label: 'Short blurb' }, { id: 'landing', label: 'Landing page' }, { id: 'features', label: 'Feature list' }],
    placeholder: 'e.g. The Journey screen shows your current stage, one clear next step and one action button.',
    audiencePlaceholder: 'e.g. founders stuck at "I have an idea"',
    ctaPlaceholder: 'e.g. Start free',
  },
];

const TONES: { id: Tone; label: string }[] = [
  { id: 'friendly', label: 'Friendly' }, { id: 'professional', label: 'Professional' },
  { id: 'bold', label: 'Bold' }, { id: 'playful', label: 'Playful' },
];

function describeError(err: unknown): string {
  const e = err as { response?: { status?: number; data?: { error?: unknown } } };
  const status = e?.response?.status;
  const msg = e?.response?.data?.error;
  if (!status) return "Couldn't reach the server — check your connection and try again.";
  if (typeof msg === 'string' && msg) return msg;
  if (status === 429) return 'Too many requests just now — please wait a few minutes and try again.';
  return `Something went wrong (error ${status}) — mind trying again?`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

const INDIGO = '#4f46e5';
const BORDER = '#e2e8f0';

export default function ContentToolsPage() {
  const isMobile = useIsMobile();
  const [type, setType] = useState<ContentType>('social');
  const [formats, setFormats] = useState<Record<ContentType, string>>({
    social: 'linkedin', message: 'whatsapp', event: 'announcement', product: 'short',
  });
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [cta, setCta] = useState('');
  const [tone, setTone] = useState<Tone>('friendly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [variants, setVariants] = useState<Variant[]>([]);
  const [copied, setCopied] = useState<number | null>(null);

  const tool = TOOLS.find(t => t.type === type)!;
  const format = formats[type];
  const canGenerate = topic.trim().length >= 5 && !loading;

  const generate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setError('');
    try {
      const res = await contentToolsApi.generate({
        type, format, topic: topic.trim(), audience: audience.trim(), callToAction: cta.trim(), tone,
      });
      setVariants(res.data.variants as Variant[]);
      setCopied(null);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  };

  const copy = async (i: number) => {
    const v = variants[i];
    const ok = await copyText(v.subject ? `Subject: ${v.subject}\n\n${v.body}` : v.body);
    if (ok) {
      setCopied(i);
      setTimeout(() => setCopied(c => (c === i ? null : c)), 1800);
    }
  };

  const switchType = (t: ContentType) => {
    setType(t);
    setVariants([]);
    setError('');
  };

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer',
    border: `1.5px solid ${active ? INDIGO : BORDER}`, background: active ? '#eef2ff' : '#fff',
    color: active ? '#3730a3' : '#334155', minHeight: 40,
  });

  const field: React.CSSProperties = {
    display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 6, padding: '10px 12px',
    border: `1.5px solid ${BORDER}`, borderRadius: 10, fontSize: 14, fontFamily: 'inherit', background: '#fff',
  };
  const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#0f172a' };

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: isMobile ? '20px 16px 96px' : '32px 24px 64px' }}>
      <h1 style={{ margin: 0, fontSize: isMobile ? 24 : 30, fontWeight: 800, letterSpacing: -0.6, color: '#0f172a' }}>Content tools</h1>
      <p style={{ margin: '6px 0 20px', color: '#64748b', fontSize: 14 }}>
        Tell the AI what you need to say. Get three ready-to-edit versions. Always check facts, dates and links before you post.
      </p>

      <div role="tablist" aria-label="Content type" style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 20 }}>
        {TOOLS.map(t => {
          const active = t.type === type;
          return (
            <button
              key={t.type} role="tab" aria-selected={active} onClick={() => switchType(t.type)}
              style={{
                textAlign: 'left', padding: '12px 14px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
                border: `2px solid ${active ? INDIGO : BORDER}`, background: active ? '#eef2ff' : '#fff', minHeight: 64,
              }}
            >
              <div style={{ fontSize: 18 }}>{t.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{t.label}</div>
              {!isMobile && <div style={{ fontSize: 12, color: '#64748b' }}>{t.blurb}</div>}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 5fr) minmax(0, 6fr)', gap: 24, alignItems: 'start' }}>
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={label}>Format</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {tool.formats.map(f => (
                <button key={f.id} onClick={() => setFormats(p => ({ ...p, [type]: f.id }))} style={chip(format === f.id)}>{f.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="ct-topic" style={label}>What is it about?</label>
            <textarea id="ct-topic" rows={4} maxLength={800} value={topic} onChange={e => setTopic(e.target.value)} placeholder={tool.placeholder} style={{ ...field, resize: 'vertical' }} />
          </div>

          <div>
            <label htmlFor="ct-aud" style={label}>Who is it for? <span style={{ fontWeight: 400, color: '#64748b' }}>(optional)</span></label>
            <input id="ct-aud" maxLength={200} value={audience} onChange={e => setAudience(e.target.value)} placeholder={tool.audiencePlaceholder} style={field} />
          </div>

          <div>
            <label htmlFor="ct-cta" style={label}>Call to action <span style={{ fontWeight: 400, color: '#64748b' }}>(optional)</span></label>
            <input id="ct-cta" maxLength={200} value={cta} onChange={e => setCta(e.target.value)} placeholder={tool.ctaPlaceholder} style={field} />
          </div>

          <div>
            <div style={label}>Tone</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {TONES.map(t => <button key={t.id} onClick={() => setTone(t.id)} style={chip(tone === t.id)}>{t.label}</button>)}
            </div>
          </div>

          <button
            onClick={generate} disabled={!canGenerate}
            style={{
              background: canGenerate ? INDIGO : '#c7d2fe', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 18px',
              fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: canGenerate ? 'pointer' : 'not-allowed', minHeight: 48,
            }}
          >
            {loading ? 'Writing…' : variants.length ? 'Regenerate' : 'Generate 3 versions'}
          </button>
          {error && <div role="alert" style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', fontSize: 13 }}>{error}</div>}
        </div>

        <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {loading && variants.length === 0 && (
            <div style={{ color: '#64748b', fontSize: 14, padding: 20, border: `1px dashed ${BORDER}`, borderRadius: 16 }}>Writing three versions…</div>
          )}
          {!loading && variants.length === 0 && !error && (
            <div style={{ color: '#64748b', fontSize: 14, padding: 24, border: `1px dashed ${BORDER}`, borderRadius: 16, textAlign: 'center' }}>
              Your three versions will appear here.
            </div>
          )}
          {variants.map((v, i) => (
            <div key={i} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 18, opacity: loading ? 0.5 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: INDIGO }}>Version {i + 1}</span>
                <button onClick={() => copy(i)} style={{ ...chip(copied === i), padding: '6px 14px', minHeight: 44 }}>{copied === i ? 'Copied ✓' : 'Copy'}</button>
              </div>
              {v.subject && <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#0f172a' }}>Subject: {v.subject}</div>}
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6, color: '#1e293b' }}>{v.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
