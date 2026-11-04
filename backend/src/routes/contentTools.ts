import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import {
  CONTENT_TYPES,
  CONTENT_FORMATS,
  CONTENT_TONES,
  generateContent,
} from '../utils/contentTools';

const router = Router();
router.use(requireAuth);

const GenerateSchema = z
  .object({
    type: z.enum(CONTENT_TYPES),
    format: z.string().trim().min(1).max(30),
    topic: z.string().trim().min(5, 'Tell the AI a bit more about what this is for (5+ characters).').max(800),
    audience: z.string().trim().max(200).optional().default(''),
    callToAction: z.string().trim().max(200).optional().default(''),
    tone: z.enum(CONTENT_TONES).default('friendly'),
  })
  .refine((v) => CONTENT_FORMATS[v.type].includes(v.format), {
    message: 'Unknown format for this content type.',
    path: ['format'],
  });

// Simple in-memory per-user limiter: each request is a paid model call, so cap
// bursts. Per-process only (resets on deploy/restart), which is fine for abuse
// protection at this scale.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, number[]>();

function allow(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(userId, recent);
    return false;
  }
  recent.push(now);
  hits.set(userId, recent);
  return true;
}

router.post('/generate', async (req: Request, res: Response) => {
  const parsed = GenerateSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    res.status(400).json({ error: first?.message || 'Invalid request.' });
    return;
  }
  if (!allow(req.userId!)) {
    res.status(429).json({ error: 'Too many requests just now — please wait a few minutes and try again.' });
    return;
  }
  try {
    const variants = await generateContent(parsed.data);
    res.json({ variants });
  } catch (err: any) {
    console.error('[content-tools] generate failed:', err?.message || err);
    res.status(502).json({ error: err?.message || 'Could not generate content right now — please try again.' });
  }
});

export default router;
