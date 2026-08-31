import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { getClientIp, hashVisitorIp } from '../utils/analyticsHash';

const router = Router();

// Public, unauthenticated event ingestion for lightweight first-party usage
// analytics (currently: hero-page views + CTA clicks). No cookies are read
// here and no auth is required — the frontend only calls this after the
// visitor has opted into the "Analytics" cookie category (see
// CookieConsent.tsx / hasAnalyticsConsent()), so most visitors who haven't
// decided yet, or who declined, generate zero rows here.
//
// The visitor is identified only by a salted hash of their IP
// (utils/analyticsHash.ts) — the raw IP itself is never stored.

const EventSchema = z.object({
  event_type: z.enum(['page_view', 'link_click']),
  path: z.string().trim().min(1).max(200),
  link_label: z.string().trim().min(1).max(100).optional(),
});

router.post('/events', async (req: Request, res: Response) => {
  const parsed = EventSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { event_type, path, link_label } = parsed.data;
  if (event_type === 'link_click' && !link_label) {
    res.status(400).json({ error: 'link_label is required for link_click events' });
    return;
  }

  try {
    const visitorHash = hashVisitorIp(getClientIp(req));
    await query(
      `INSERT INTO analytics_events (event_type, path, link_label, visitor_hash) VALUES ($1, $2, $3, $4)`,
      [event_type, path, link_label ?? null, visitorHash]
    );
  } catch (err) {
    // Never let a tracking hiccup surface as an error to the visitor —
    // log it server-side and move on.
    console.error('[analyticsEvents]', err);
  }
  res.status(204).end();
});

export default router;
