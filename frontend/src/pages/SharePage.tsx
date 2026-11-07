import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { insightsApi } from '@/api/client';
import { INK, Particles, Eyebrow, KindBadge, EmptyNote } from '@/components/insights/shared';

// /insights/share — the social feed built from the market insights.
// Each post has a caption (copy), a share card (download as PNG or SVG in
// three sizes) and names its source. The RSS/JSON feed URLs at the top are
// what Buffer, Zapier, IFTTT or Hootsuite consume to auto-post.

type Post = { id: string; slug: string; kind: string; stat: string; headline: string; sub: string; caption: string; hashtags: string[]; source: string; sourceUrl: string; cardUrl: string; cardSquareUrl: string; cardStoryUrl: string; link: string; accent: string; generatedAt: string };
type Size = 'landscape' | 'square' | 'story';
const SIZES: { key: Size; label: string; w: number; h: number; hint: string }[] = [
  { key: 'landscape', label: '1200 × 630', w: 1200, h: 630, hint: 'X · LinkedIn · Facebook link cards' },
  { key: 'square', label: '1080 × 1080', w: 1080, h: 1080, hint: 'Instagram · LinkedIn feed' },
  { key: 'story', label: '1080 × 1920', w: 1080, h: 1920, hint: 'Stories · Reels · TikTok' },
];

async function svgToPng(svgUrl: string, w: number, h: number): Promise<Blob> {
  // Rasterised through an <img>, which cannot load external fonts, so the PNG
  // falls back to the system sans/mono stacks named in the SVG.
  const svgText = await fetch(svgUrl, { cache: 'no-store' }).then(r => r.text());
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('svg load failed')); img.src = url; });
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}

function download(blob: Blob, name: string) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }

function CopyButton({ text, label = 'COPY' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return <button onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* ignore */ } }} style={{ fontFamily: INK.mono, fontSize: 10, letterSpacing: 1.2, padding: '6px 11px', borderRadius: 999, border: `1px solid ${done ? INK.lime : INK.border}`, background: done ? INK.lime : 'transparent', color: done ? INK.bg : INK.text2, cursor: 'pointer' }}>{done ? 'COPIED ✓' : label}</button>;
}

const ACCENT: Record<string, string> = { lime: INK.lime, violet: INK.violetHi, sky: INK.sky, amber: INK.amber, rose: INK.rose };

export default function SharePage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState<Size>('landscape');
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { insightsApi.social().then(r => setPosts(r.data.posts)).catch(() => setError('The feed is still warming up — try again in a minute.')); }, []);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const rssUrl = `${origin}/api/public/insights/social/rss`, jsonUrl = `${origin}/api/public/insights/social`;
  const sz = SIZES.find(s => s.key === size)!;
  const cardUrlFor = (p: Post) => (size === 'square' ? p.cardSquareUrl : size === 'story' ? p.cardStoryUrl : p.cardUrl);

  return (
    <div style={{ minHeight: '100vh', background: INK.bg, color: INK.text, fontFamily: INK.ui }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(14px)', background: 'rgba(15,12,21,.78)', borderBottom: `1px solid ${INK.border}` }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button onClick={() => navigate('/insights')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'baseline', gap: 6, color: INK.text, fontFamily: INK.ui }}>
            <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>MVP</span><span style={{ fontSize: 14, fontWeight: 300, letterSpacing: 3, textTransform: 'uppercase', color: INK.text2 }}>Club</span>
            <span style={{ marginLeft: 10, fontFamily: INK.mono, fontSize: 10, letterSpacing: 2, color: INK.lime }}>SOCIAL FEED</span>
          </button>
          <div style={{ display: 'flex', gap: 6 }}>
            {SIZES.map(s => <button key={s.key} onClick={() => setSize(s.key)} title={s.hint} style={{ fontFamily: INK.mono, fontSize: 11, letterSpacing: 1, padding: '7px 12px', borderRadius: 999, border: `1px solid ${size === s.key ? INK.lime : INK.border}`, background: size === s.key ? INK.lime : 'transparent', color: size === s.key ? INK.bg : INK.text3, cursor: 'pointer' }}>{s.label}</button>)}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 20px 96px' }}>
        <section style={{ position: 'relative', padding: '48px 0 24px', overflow: 'hidden' }}>
          <Particles count={50} />
          <div style={{ position: 'relative' }}>
            <Eyebrow>Ready to post · refreshed every 15 minutes from public data</Eyebrow>
            <h1 style={{ margin: '12px 0 10px', fontSize: 'clamp(34px, 5vw, 60px)', lineHeight: 1, letterSpacing: -2, fontWeight: 800 }}>Insights, <span style={{ color: INK.lime }}>packaged for social.</span></h1>
            <p style={{ margin: 0, maxWidth: 640, color: INK.text2, fontSize: 15, lineHeight: 1.5 }}>Each card below is generated from the same live numbers as the Insights page and names its source. Copy the caption, download the card, post. Or point a scheduler at the feed and let it post for you.</p>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12, marginBottom: 28 }}>
          {[['RSS feed (Buffer · Zapier · IFTTT · Hootsuite)', rssUrl], ['JSON feed (your own scheduler)', jsonUrl]].map(([label, url]) => (
            <div key={url} style={{ padding: 14, borderRadius: 14, background: INK.surface, border: `1px solid ${INK.border}` }}>
              <div style={{ fontFamily: INK.mono, fontSize: 10, letterSpacing: 1.5, color: INK.text3, marginBottom: 6 }}>{label.toUpperCase()}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><code style={{ flex: 1, fontFamily: INK.mono, fontSize: 12, color: INK.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</code><CopyButton text={url} /></div>
            </div>
          ))}
          <div style={{ padding: 14, borderRadius: 14, background: `${INK.violet}18`, border: `1px solid ${INK.violet}55`, fontSize: 13, color: INK.text2, lineHeight: 1.5 }}>
            <b style={{ color: INK.text }}>Auto-posting:</b> in Buffer, Zapier ("RSS by Zapier → X / LinkedIn") or IFTTT, add the RSS URL as a source; each new item carries the caption and the card image. Posting straight from this server to X or LinkedIn needs their API keys — that hook isn't wired yet.
          </div>
        </section>

        {error && <EmptyNote>{error}</EmptyNote>}
        {!posts && !error && <div style={{ padding: '60px 0', textAlign: 'center', color: INK.text3, fontFamily: INK.mono, fontSize: 12, letterSpacing: 2 }}>GENERATING POSTS…</div>}

        {posts && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
            {posts.map(p => (
              <article key={p.id} style={{ background: INK.surface, border: `1px solid ${INK.border}`, borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ background: '#0f0c15', aspectRatio: `${sz.w} / ${sz.h}`, maxHeight: size === 'story' ? 520 : undefined, display: 'flex', justifyContent: 'center' }}>
                  <img src={cardUrlFor(p)} alt={`${p.stat} ${p.headline}`} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                </div>
                <div style={{ padding: 16, display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: INK.mono, fontSize: 10, letterSpacing: 1.5, color: ACCENT[p.accent] ?? INK.lime }}>{p.source.toUpperCase()}</span>
                    <KindBadge kind="live" note={`Generated ${new Date(p.generatedAt).toLocaleString('en-GB')}`} />
                  </div>
                  <textarea readOnly value={`${p.caption}\n\n${p.hashtags.join(' ')}`} rows={7} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: INK.bg2, color: INK.text, border: `1px solid ${INK.border}`, borderRadius: 10, padding: 10, fontFamily: INK.ui, fontSize: 13, lineHeight: 1.45 }} />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <CopyButton text={`${p.caption}\n\n${p.hashtags.join(' ')}`} label="COPY CAPTION" />
                    <button disabled={busy === p.id} onClick={async () => { setBusy(p.id); try { download(await svgToPng(cardUrlFor(p), sz.w, sz.h), `mvpclub-${p.slug}-${sz.w}x${sz.h}.png`); } catch { window.open(cardUrlFor(p), '_blank'); } finally { setBusy(null); } }} style={{ fontFamily: INK.mono, fontSize: 10, letterSpacing: 1.2, padding: '6px 11px', borderRadius: 999, border: 'none', background: INK.lime, color: INK.bg, cursor: 'pointer', opacity: busy === p.id ? 0.6 : 1 }}>{busy === p.id ? 'RENDERING…' : `↓ PNG ${sz.label}`}</button>
                    <a href={cardUrlFor(p)} download={`mvpclub-${p.slug}.svg`} style={{ fontFamily: INK.mono, fontSize: 10, letterSpacing: 1.2, padding: '6px 11px', borderRadius: 999, border: `1px solid ${INK.border}`, color: INK.text2, textDecoration: 'none' }}>↓ SVG</a>
                    <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: INK.mono, fontSize: 10, letterSpacing: 1.2, padding: '6px 11px', borderRadius: 999, border: `1px solid ${INK.border}`, color: INK.sky, textDecoration: 'none', marginLeft: 'auto' }}>SOURCE ↗</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
