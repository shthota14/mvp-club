import crypto from 'crypto';
import type { Request } from 'express';

// Turns a visitor's IP into a one-way, non-reversible identifier so we can
// count distinct visitors without ever storing the IP itself. Uses ONE fixed
// server-side secret (not rotated daily) so that "unique visitors" stays an
// accurate distinct count across any time window within the raw-retention
// period — a rotating salt would make the same person look like a different
// visitor every day and inflate multi-day counts.
//
// Set ANALYTICS_IP_SALT in the environment for production. Falls back to an
// insecure placeholder so local/dev setups still work, with a loud warning —
// this fallback must never be relied on in production, since anyone who knows
// it could pre-compute the hash for a target IP.
const SALT = process.env.ANALYTICS_IP_SALT || 'dev-only-insecure-analytics-salt';
if (!process.env.ANALYTICS_IP_SALT) {
  console.warn('[analyticsHash] ANALYTICS_IP_SALT is not set — using an insecure placeholder. Set a real secret in production.');
}

export function hashVisitorIp(ip: string): string {
  return crypto.createHmac('sha256', SALT).update(ip).digest('hex');
}

// nginx (frontend/nginx.conf) sets X-Real-IP on the /api proxy but not
// X-Forwarded-For, so that's the primary header; X-Forwarded-For is checked
// as a fallback in case the proxy chain changes later.
export function getClientIp(req: Request): string {
  const xRealIp = req.headers['x-real-ip'];
  if (typeof xRealIp === 'string' && xRealIp.length > 0) return xRealIp;
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) return xff.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}
