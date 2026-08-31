import { hasAnalyticsConsent } from '@/components/CookieConsent';
import { analyticsApi } from '@/api/client';

// Fire-and-forget first-party usage tracking. Every call checks consent
// itself (see CookieConsent.tsx) — nothing is sent until the visitor has
// explicitly opted into the "Analytics" cookie category, so most visitors
// who haven't decided yet, or who declined, generate zero calls. Failures
// are swallowed silently; tracking must never be able to break the page or
// surface an error to a visitor.

export function trackPageView(path: string) {
  if (!hasAnalyticsConsent()) return;
  analyticsApi.track({ event_type: 'page_view', path }).catch(() => {});
}

export function trackClick(path: string, linkLabel: string) {
  if (!hasAnalyticsConsent()) return;
  analyticsApi.track({ event_type: 'link_click', path, link_label: linkLabel }).catch(() => {});
}
