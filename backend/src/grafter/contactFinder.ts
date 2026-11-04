import axios from 'axios';

// -- Contact finding (Sprint 3 round 2; switched to Hunter.io 2026-09-28) ----
//
// Turns a candidate COMPANY (grafter_prospect) into an actual person to
// email. Originally built on Apollo People Search + Enrichment; switched
// to Hunter.io's Domain Search after Apollo's Free plan turned out not to
// include API access at all (a 403 on every call -- plan-gated
// separately from the account's UI credits, not a bug in our code).
// Hunter's API works on its free tier (50 credits/month) with no such
// gating, and Domain Search returns named people *with* email addresses
// in a single call -- no separate "search, then enrich" round trip like
// Apollo needed.
//
// This is deliberately NOT run automatically for every candidate a
// prospecting run finds -- it's a per-candidate action the founder
// triggers (see routes/grafter.ts's POST /candidates/:id/contact), same
// "founder decides where the spend goes" principle as prospecting itself
// being opt-in rather than automatic.
//
// Hunter, like Apollo, won't have full coverage everywhere -- coming back
// with no named contact means no match was found, not a bug. This module
// never fabricates one.

const HUNTER_API_KEY = process.env.HUNTER_API_KEY || '';
const HUNTER_DOMAIN_SEARCH_URL = 'https://api.hunter.io/v2/domain-search';
const HUNTER_TIMEOUT_MS = 15000;
const DEFAULT_TITLES = ['Founder', 'CEO', 'Owner'];

export interface RawContact {
  name: string;
  title?: string;
  email?: string;
  emailStatus?: string;
  linkedinUrl?: string;
}

async function domainSearch(domain: string, extraParams: Record<string, string>): Promise<any[]> {
  const res = await axios.get(HUNTER_DOMAIN_SEARCH_URL, {
    params: { domain, api_key: HUNTER_API_KEY, limit: 10, ...extraParams },
    timeout: HUNTER_TIMEOUT_MS,
    validateStatus: () => true,
  });

  if (res.status === 429) throw new Error('Hunter rate limit hit -- try again shortly.');
  if (res.status >= 400) {
    const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data ?? {});
    throw new Error(`Hunter domain search returned ${res.status}: ${body.slice(0, 200)}`);
  }

  return Array.isArray(res.data?.data?.emails) ? res.data.data.emails : [];
}

// Domain Search can return generic/catch-all addresses (info@, hello@)
// alongside named people -- those have no first_name and would produce a
// "Hi ," email, so they're filtered out before picking a contact.
function namedPeopleOnly(people: any[]): any[] {
  return people.filter(p => typeof p?.first_name === 'string' && p.first_name.trim());
}

function pickBestPerson(people: any[], personTitles: string[]): any | null {
  if (!people.length) return null;
  const titles = (personTitles.length ? personTitles : DEFAULT_TITLES).map(t => t.toLowerCase());
  const titleMatch = people.find(p =>
    typeof p?.position === 'string' && titles.some(t => p.position.toLowerCase().includes(t))
  );
  if (titleMatch) return titleMatch;
  const decisionMaker = people.find(p => p?.decision_maker === true);
  if (decisionMaker) return decisionMaker;
  return people[0];
}

export async function findContactForCompany(
  domain: string | null,
  personTitles: string[]
): Promise<RawContact | null> {
  if (!HUNTER_API_KEY) {
    throw new Error('Hunter API key not configured -- set HUNTER_API_KEY to enable contact lookup.');
  }
  if (!domain) {
    // No usable domain on this prospect -- no reliable way to search for people at it.
    return null;
  }

  // Prefer confirmed decision-makers first (closest match to "Founder/CEO/Owner");
  // fall back to a broader executive/senior search if that comes back empty.
  let people = namedPeopleOnly(await domainSearch(domain, { decision_maker: 'true' }));
  if (!people.length) {
    people = namedPeopleOnly(await domainSearch(domain, { seniority: 'executive,senior' }));
  }

  const person = pickBestPerson(people, personTitles);
  if (!person || typeof person?.value !== 'string' || !person.value.trim()) return null;

  const name = [person.first_name, person.last_name].filter(Boolean).join(' ').trim();

  return {
    name: name || person.value,
    title: typeof person.position === 'string' ? person.position : undefined,
    email: person.value.trim(),
    emailStatus: typeof person?.verification?.status === 'string' ? person.verification.status : undefined,
    linkedinUrl: typeof person.linkedin === 'string' && person.linkedin
      ? `https://www.linkedin.com/in/${person.linkedin}`
      : undefined,
  };
}
