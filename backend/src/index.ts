import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cron from 'node-cron';
import authRouter from './routes/auth';
import ideasRouter from './routes/ideas';
import validationRouter from './routes/validation';
import communityRouter from './routes/community';
import adminRouter from './routes/admin';
import networkRouter from './routes/network';
import linkedinRouter from './routes/linkedin';
import diagramsRouter from './routes/diagrams';
import pitchDeckRouter from './routes/pitchdeck';
import interviewsRouter from './routes/interviews';
import surveysRouter from './routes/surveys';
import notificationsRouter from './routes/notifications';
import donationsRouter from './routes/donations';
import challengesRouter from './routes/challenges';
import schedulingRouter from './routes/scheduling';
import feedbackRouter from './routes/feedback';
import { runWeeklyDigest } from './jobs/weeklyDigest';
import { runReEngagement } from './jobs/reEngagement';
import { runStartupNewsDigest } from './jobs/startupNewsDigest';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/ideas', ideasRouter);
app.use('/api/validation', validationRouter);
app.use('/api/community', communityRouter);
app.use('/api/admin', adminRouter);
app.use('/api/network', networkRouter);
app.use('/api/linkedin', linkedinRouter);
app.use('/api/diagrams', diagramsRouter);
app.use('/api/pitch-deck', pitchDeckRouter);
app.use('/api/interviews', interviewsRouter);
app.use('/api/surveys', surveysRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/donations', donationsRouter);
app.use('/api/challenges', challengesRouter);
app.use('/api/feedback', feedbackRouter);
// Mounted at bare /api — scheduling.ts defines its own full paths
// (/availability, /book/:token) since it mixes authed founder endpoints with
// public token-based ones, unlike the other routers here.
app.use('/api', schedulingRouter);

// For non-API routes (e.g. /survey/:token shared via WhatsApp/email), redirect
// to the frontend so the React app can handle them. This covers the case where
// someone opens a shared link that lands on the backend port instead of Vite/nginx.
app.get('/survey/:token', (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  res.redirect(302, `${frontendUrl}/survey/${req.params.token}`);
});

// 404
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'Route not found' });
  } else {
    // Unknown non-API route — send to frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(302, frontendUrl);
  }
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ MVP Club API running on port ${PORT}`);
});

// ── Scheduled jobs ────────────────────────────────────────────────────────────

// Weekly momentum digest — every Monday at 8:00 AM UTC
cron.schedule('0 8 * * 1', () => {
  runWeeklyDigest().catch(err => console.error('[cron] weeklyDigest crashed:', err));
});
console.log('[cron] Weekly digest scheduled — Mondays at 08:00 UTC');

// Re-engagement emails — daily at 9:00 AM UTC
// Sends day-3, day-7, and day-14 variants to users who have gone quiet
cron.schedule('0 9 * * *', () => {
  runReEngagement().catch(err => console.error('[cron] reEngagement crashed:', err));
});
console.log('[cron] Re-engagement job scheduled — daily at 09:00 UTC');

// Early-stage funding news digest — daily at 7:00 AM UTC, before the other
// jobs. Real headlines (Google News RSS), AI-curated for relevance — see
// jobs/startupNewsDigest.ts. Can also be triggered on demand via
// POST /api/community/startup-news/refresh (admin only).
cron.schedule('0 7 * * *', () => {
  runStartupNewsDigest().catch(err => console.error('[cron] startupNewsDigest crashed:', err));
});
console.log('[cron] Startup news digest scheduled — daily at 07:00 UTC');

export default app;
