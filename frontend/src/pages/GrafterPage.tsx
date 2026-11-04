import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { grafterApi, mailboxApi, outreachApi } from '@/api/client';

// -- Grafter -- standalone entry point + Brian + ICP (GRF-4 through GRF-15) --
//
// Reachable directly from the nav, with no requirement to have completed
// Hone or Validate first (PRD "V1 scope decisions"). Covers Sprint 1's
// foundation stories plus building Brian: create a minimal idea if the
// founder has none (GRF-5), fetch their site through research-gateway
// (GRF-6), then either synthesize Brian from that site + Hone/Validate
// answers (GRF-7) or, when there's no validation data to ground it,
// collect the 3 fields directly instead of letting a model guess (GRF-8) --
// either way landing on the same review/edit/approve step (GRF-9/10).
// Once Brian is approved, Sprint 2 picks up: propose an ICP from the
// approved Brian (GRF-13), same review/edit/approve shape (GRF-14/15).
// Once the ICP is approved, "done" offers prospecting (GRF-18/19/20):
// Apollo.io search filtered by keyword tags the AI drew from the ICP,
// queued through grafter-worker and polled here -- never an AI guess at
// a company, per the architecture review's Finding 2.

type BrianFieldKey = 'what_you_sell' | 'who_its_for' | 'pricing';
interface BrianField { value: string; sources: string[] }
interface Brian {
  id: string;
  version: number;
  status: 'draft' | 'approved';
  fields: Partial<Record<BrianFieldKey, BrianField>>;
  needs_manual_input: boolean;
}

type IcpFieldKey = 'target_profile' | 'jobs_to_be_done' | 'frustrations' | 'current_alternatives';
interface IcpField { value: string; sources: string[] }
interface Icp {
  id: string;
  version: number;
  status: 'draft' | 'approved';
  fields: Partial<Record<IcpFieldKey, IcpField>>;
}

interface Candidate {
  id: string;
  name: string;
  website: string;
  domain: string;
  industry: string | null;
  employee_count: number | null;
  linkedin_url: string | null;
  reason: string | null;
  contact_id: string | null;
  contact_name: string | null;
  contact_title: string | null;
  contact_email: string | null;
  outreach_status: 'drafted' | 'approved' | 'sent' | 'failed' | 'replied' | null;
  outreach_subject: string | null;
  outreach_body: string | null;
}
interface ProspectRun {
  status: 'queued' | 'running' | 'done' | 'failed';
  error: string | null;
  output: { found: number; inserted: number; duplicates: number; droppedUnsourced: number } | null;
}

const FIELD_LABELS: Record<BrianFieldKey, string> = {
  what_you_sell: 'What you sell',
  who_its_for: "Who it's for",
  pricing: 'How it’s priced',
};
const ICP_FIELD_LABELS: Record<IcpFieldKey, string> = {
  target_profile: 'Who your ideal customer is',
  jobs_to_be_done: "What they're trying to get done",
  frustrations: 'Their frustration with how they solve it today',
  current_alternatives: 'What they use instead today',
};
const SOURCE_LABELS: Record<string, string> = {
  website: 'from your website',
  validation_data: 'from your validation answers',
  brian: "from your business profile",
  founder_edit: 'you edited this',
};

type Step = 'loading' | 'start' | 'building' | 'review' | 'icp_building' | 'icp_review' | 'done';

export default function GrafterPage() {
  const { ideas, refreshIdeas } = useApp();
  const navigate = useNavigate();

  const existingIdea = ideas.find(i => i.is_active) ?? ideas[0] ?? null;
  const hasIdea = !!existingIdea;

  const [step, setStep] = useState<Step>('loading');
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [brian, setBrian] = useState<Brian | null>(null);
  const [fetchWarning, setFetchWarning] = useState<string | null>(null);
  const [edits, setEdits] = useState<Partial<Record<BrianFieldKey, string>>>({});
  const [icp, setIcp] = useState<Icp | null>(null);
  const [icpEdits, setIcpEdits] = useState<Partial<Record<IcpFieldKey, string>>>({});
  const [icpBuildError, setIcpBuildError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [prospectRun, setProspectRun] = useState<ProspectRun | null>(null);
  const [prospectSubmitting, setProspectSubmitting] = useState(false);
  const [mailboxConnected, setMailboxConnected] = useState<boolean | null>(null);
  const [mailboxEmail, setMailboxEmail] = useState<string | null>(null);
  const [mailboxCanDetectReplies, setMailboxCanDetectReplies] = useState(true);
  const [mailboxNotice, setMailboxNotice] = useState<string | null>(null);
  const [mailboxSubmitting, setMailboxSubmitting] = useState(false);
  const [outreachPaused, setOutreachPaused] = useState(false);
  const [pauseSubmitting, setPauseSubmitting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedProspectId, setExpandedProspectId] = useState<string | null>(null);
  const [outreachActionId, setOutreachActionId] = useState<string | null>(null);
  const [outreachEdits, setOutreachEdits] = useState<{ subject: string; body: string }>({ subject: '', body: '' });
  const [outreachErrors, setOutreachErrors] = useState<Record<string, string>>({});
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // On mount: if this founder already has a Brian (from an earlier visit),
  // skip straight to reviewing/approving it instead of re-asking for a site.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await grafterApi.getBrain();
        if (cancelled) return;
        if (res.data.brain) {
          setBrian(res.data.brain);
          if (res.data.brain.status === 'approved') {
            await loadOrBuildIcp(cancelled);
          } else {
            setStep('review');
          }
        } else {
          setStep('start');
        }
      } catch {
        if (!cancelled) setStep('start');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once Brian is approved: if the founder already has an ICP (from an
  // earlier visit), skip straight to reviewing/approving it -- otherwise
  // build one now, same "no extra click needed" pattern as Brian's first
  // build after /start.
  const loadOrBuildIcp = async (cancelled = false) => {
    try {
      const res = await grafterApi.getIcp();
      if (cancelled) return;
      if (res.data.icp) {
        setIcp(res.data.icp);
        setStep(res.data.icp.status === 'approved' ? 'done' : 'icp_review');
      } else {
        await runIcpBuild();
      }
    } catch {
      if (!cancelled) setStep('done'); // Brian is still approved either way
    }
  };

  const runIcpBuild = async () => {
    setIcpBuildError(null);
    setStep('icp_building');
    try {
      const res = await grafterApi.buildIcp();
      setIcp(res.data.icp);
      setStep('icp_review');
    } catch {
      setIcpBuildError('Could not build your ideal customer profile right now.');
    }
  };

  const runBuild = async () => {
    setStep('building');
    try {
      const res = await grafterApi.buildBrain();
      setBrian(res.data.brain);
      setStep('review');
    } catch {
      setError('Could not build Brian right now -- try again in a moment.');
      setStep('review');
    }
  };

  const handleStart = async (e: FormEvent) => {
    e.preventDefault();
    if (!hasIdea && !name.trim()) { setError("Tell us what you're building first."); return; }
    if (!website.trim()) { setError('Add your website so we can look it up.'); return; }
    setError('');
    setFetchWarning(null);
    setSubmitting(true);
    try {
      const res = await grafterApi.start({ name: hasIdea ? undefined : name.trim(), website: website.trim() });
      await refreshIdeas();
      if (!res.data.fetched.ok) setFetchWarning(res.data.fetched.error ?? "couldn't reach that site");
      await runBuild();
    } catch {
      setError('Something went wrong on our end -- try again in a moment.');
      setStep('start');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!Object.keys(edits).length) return;
    setSubmitting(true);
    try {
      const res = await grafterApi.editBrain(edits);
      setBrian(res.data.brain);
      setEdits({});
    } catch {
      setError('Could not save your edit -- try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      if (Object.keys(edits).length) await grafterApi.editBrain(edits);
      const res = await grafterApi.approveBrain();
      setBrian(res.data.brain);
      setEdits({});
      await runIcpBuild();
    } catch {
      setError('Could not approve Brian -- try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const icpFieldValue = (key: IcpFieldKey): string =>
    icpEdits[key] !== undefined ? icpEdits[key]! : (icp?.fields[key]?.value ?? '');

  const handleSaveIcpEdits = async () => {
    if (!Object.keys(icpEdits).length) return;
    setSubmitting(true);
    try {
      const res = await grafterApi.editIcp(icpEdits);
      setIcp(res.data.icp);
      setIcpEdits({});
    } catch {
      setError('Could not save your edit -- try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveIcp = async () => {
    setSubmitting(true);
    try {
      if (Object.keys(icpEdits).length) await grafterApi.editIcp(icpEdits);
      const res = await grafterApi.approveIcp();
      setIcp(res.data.icp);
      setIcpEdits({});
      setStep('done');
    } catch {
      setError('Could not approve your ideal customer profile -- try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // GRF-18/19/20: once Brian and the ICP are both approved, this polls for
  // prospecting results rather than pushing them -- there's no websocket
  // here, and a few seconds' latency on "done" is fine for this flow.
  const refreshCandidates = async (): Promise<ProspectRun | null> => {
    try {
      const res = await grafterApi.getCandidates();
      if (!mountedRef.current) return null;
      setCandidates(res.data.candidates ?? []);
      setProspectRun(res.data.run ?? null);
      return res.data.run ?? null;
    } catch {
      return null;
    }
  };

  const pollCandidates = async () => {
    const run = await refreshCandidates();
    if (run && (run.status === 'queued' || run.status === 'running') && mountedRef.current) {
      setTimeout(pollCandidates, 3000);
    }
  };

  useEffect(() => {
    if (step === 'done') pollCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleStartProspecting = async () => {
    setProspectSubmitting(true);
    setError('');
    try {
      await grafterApi.startProspecting();
      pollCandidates();
    } catch {
      setError('Could not start finding companies -- try again.');
    } finally {
      setProspectSubmitting(false);
    }
  };

  // GRF-21/26: mailbox connection + kill switch, fetched once outreach
  // becomes relevant (Brian + ICP both approved).
  const refreshMailboxAndOutreach = async () => {
    try {
      const [mailboxRes, outreachRes] = await Promise.all([mailboxApi.status(), grafterApi.getOutreachStatus()]);
      setMailboxConnected(mailboxRes.data.connected);
      setMailboxEmail(mailboxRes.data.email);
      setMailboxCanDetectReplies(mailboxRes.data.canDetectReplies !== false);
      setOutreachPaused(outreachRes.data.paused);
    } catch {
      // non-fatal -- the rest of the "done" step still works without this
    }
  };

  useEffect(() => {
    if (step === 'done') refreshMailboxAndOutreach();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Google redirects back here with ?mailbox=connected|denied|error -- read
  // it once, show a brief note, then strip it so a refresh doesn't repeat it.
  useEffect(() => {
    const status = searchParams.get('mailbox');
    if (!status) return;
    if (status === 'connected') {
      setMailboxNotice('Your mailbox is connected.');
      refreshMailboxAndOutreach();
    } else if (status === 'denied') {
      setMailboxNotice('Mailbox connection was cancelled.');
    } else {
      const reason = searchParams.get('reason');
      if (reason === 'send_scope_not_granted') {
        setMailboxNotice(
          "Connected, but Google didn't grant permission to send email -- the gmail.send scope isn't attached to the app yet on Google's side. Check Google Cloud Console → OAuth consent screen → Data Access, confirm gmail.send is listed under your sensitive scopes (not just searchable in the add-scope table), then try connecting again."
        );
      } else if (reason === 'read_scope_not_granted') {
        setMailboxNotice(
          "Connected, but Google didn't grant permission to see replies -- the gmail.metadata scope isn't attached to the app yet on Google's side. Add it under Google Cloud Console → OAuth consent screen → Data Access (alongside gmail.send), then try connecting again."
        );
      } else {
        setMailboxNotice(`Could not connect your mailbox${reason ? ` (${reason})` : ''} -- try again.`);
      }
    }
    const next = new URLSearchParams(searchParams);
    next.delete('mailbox');
    next.delete('reason');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnectMailbox = async () => {
    setMailboxSubmitting(true);
    try {
      const res = await mailboxApi.init();
      window.location.href = res.data.url;
    } catch {
      setMailboxNotice('Could not start connecting your mailbox -- try again.');
      setMailboxSubmitting(false);
    }
  };

  // There was previously no way to force a fresh Google consent grant from
  // this page at all -- e.g. after adding a scope on the Google Cloud
  // Console side, reconnecting is the only way to pick it up, since a
  // refresh token keeps whatever scope it was originally issued with.
  const handleDisconnectMailbox = async () => {
    setMailboxSubmitting(true);
    try {
      await mailboxApi.disconnect();
      setMailboxConnected(false);
      setMailboxEmail(null);
      setMailboxCanDetectReplies(true);
      setMailboxNotice('Mailbox disconnected.');
    } catch {
      setMailboxNotice('Could not disconnect your mailbox -- try again.');
    } finally {
      setMailboxSubmitting(false);
    }
  };

  const handleToggleOutreachPause = async () => {
    setPauseSubmitting(true);
    try {
      if (outreachPaused) await grafterApi.resumeOutreach();
      else await grafterApi.pauseOutreach();
      setOutreachPaused(!outreachPaused);
    } catch {
      setMailboxNotice('Could not update outreach pause state -- try again.');
    } finally {
      setPauseSubmitting(false);
    }
  };

  // GRF-22-25: per-candidate contact lookup -> draft -> edit -> approve ->
  // send. Every step is one explicit click; refreshCandidates() re-pulls the
  // whole row (contact + draft) after each action rather than patching
  // local state, so it always reflects exactly what the backend has.
  const setOutreachError = (prospectId: string, message: string | null) => {
    setOutreachErrors(prev => {
      const next = { ...prev };
      if (message) next[prospectId] = message;
      else delete next[prospectId];
      return next;
    });
  };

  const handleFindContact = async (prospectId: string) => {
    setOutreachActionId(prospectId);
    setOutreachError(prospectId, null);
    try {
      await outreachApi.findContact(prospectId);
      await refreshCandidates();
      setExpandedProspectId(prospectId);
    } catch (err: any) {
      setOutreachError(prospectId, err?.response?.data?.error ?? 'No contact found at this company.');
    } finally {
      setOutreachActionId(null);
    }
  };

  const handleDraftOutreach = async (prospectId: string) => {
    setOutreachActionId(prospectId);
    setOutreachError(prospectId, null);
    try {
      const res = await outreachApi.draft(prospectId);
      setOutreachEdits({ subject: res.data.outreach.subject, body: res.data.outreach.body });
      await refreshCandidates();
      setExpandedProspectId(prospectId);
    } catch (err: any) {
      setOutreachError(prospectId, err?.response?.data?.error ?? 'Could not draft an email -- try again.');
    } finally {
      setOutreachActionId(null);
    }
  };

  const handleSaveOutreachEdit = async (prospectId: string) => {
    setOutreachActionId(prospectId);
    setOutreachError(prospectId, null);
    try {
      await outreachApi.editDraft(prospectId, outreachEdits);
      await refreshCandidates();
    } catch {
      setOutreachError(prospectId, 'Could not save your edit -- try again.');
    } finally {
      setOutreachActionId(null);
    }
  };

  const handleApproveOutreach = async (prospectId: string) => {
    setOutreachActionId(prospectId);
    setOutreachError(prospectId, null);
    try {
      await outreachApi.approveDraft(prospectId);
      await refreshCandidates();
    } catch {
      setOutreachError(prospectId, 'Could not approve this draft -- try again.');
    } finally {
      setOutreachActionId(null);
    }
  };

  const handleSendOutreach = async (prospectId: string) => {
    setOutreachActionId(prospectId);
    setOutreachError(prospectId, null);
    try {
      await outreachApi.send(prospectId);
      await refreshCandidates();
    } catch (err: any) {
      setOutreachError(prospectId, err?.response?.data?.error ?? 'Could not send this email -- try again.');
    } finally {
      setOutreachActionId(null);
    }
  };

  const handleOptOut = async (prospectId: string) => {
    setOutreachActionId(prospectId);
    try {
      await outreachApi.optOut(prospectId);
      await refreshCandidates();
    } catch {
      setOutreachError(prospectId, 'Could not record the opt-out -- try again.');
    } finally {
      setOutreachActionId(null);
    }
  };

  const toggleExpanded = (candidate: Candidate) => {
    if (expandedProspectId === candidate.id) {
      setExpandedProspectId(null);
      return;
    }
    setExpandedProspectId(candidate.id);
    setOutreachEdits({ subject: candidate.outreach_subject ?? '', body: candidate.outreach_body ?? '' });
  };

  const fieldValue = (key: BrianFieldKey): string =>
    edits[key] !== undefined ? edits[key]! : (brian?.fields[key]?.value ?? '');

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      background: 'linear-gradient(180deg, #f9f9fb 0%, #fff 60%)',
      padding: '48px 24px 80px',
      display: 'flex', justifyContent: 'center',
    }}>
      <div style={{ maxWidth: 560, width: '100%' }}>

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#b0b0b8', marginBottom: 8 }}>
          Grafter
        </div>

        {step === 'loading' && (
          <div style={{ fontSize: 14, color: '#c0c0c8' }}>Loading...</div>
        )}

        {step === 'start' && (
          <>
            <h1 style={titleStyle}>Find your first customers</h1>
            <p style={subtitleStyle}>
              {hasIdea
                ? `For ${existingIdea!.name}. No need to finish Hone or Validate first.`
                : "Works standalone -- you don't need to finish Hone or Validate first."}
            </p>
            <form onSubmit={handleStart} style={cardStyle}>
              {!hasIdea && (
                <Field label="What are you building?">
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Acme Analytics" style={inputStyle} autoFocus />
                </Field>
              )}
              <Field label="Your website">
                <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="acmeanalytics.com" style={inputStyle} autoFocus={hasIdea} />
              </Field>
              {error && <div style={errorStyle}>{error}</div>}
              <button type="submit" disabled={submitting} style={primaryButtonStyle(submitting)}>
                {submitting ? 'Looking up your site...' : 'Continue ->'}
              </button>
            </form>
          </>
        )}

        {step === 'building' && (
          <>
            <h1 style={titleStyle}>Building your business profile...</h1>
            <p style={subtitleStyle}>Usually under a minute.</p>
            <div style={cardStyle}>
              <div style={{ fontSize: 14, color: '#6e6e73' }}>Reading your site and putting together Brian -- your business profile.</div>
            </div>
          </>
        )}

        {step === 'review' && brian && (
          <>
            <h1 style={titleStyle}>Meet Brian.</h1>
            <p style={subtitleStyle}>
              {brian.needs_manual_input
                ? "We didn't have enough to guess from, so tell us directly -- three short answers."
                : 'Your business profile, built from your site' + (Object.values(brian.fields).some(f => f?.sources.includes('validation_data')) ? ' and your validation answers' : '') + '. Check it over and fix anything that’s off.'}
            </p>

            {fetchWarning && (
              <div style={{ ...warnStyle, marginBottom: 16 }}>We couldn't reach your site ({fetchWarning}) -- Brian may be thin until you fix the URL and rebuild.</div>
            )}

            <div style={cardStyle}>
              {(['what_you_sell', 'who_its_for', 'pricing'] as BrianFieldKey[]).map(key => {
                const field = brian.fields[key];
                return (
                  <Field key={key} label={FIELD_LABELS[key]}>
                    <textarea
                      value={fieldValue(key)}
                      onChange={e => setEdits(prev => ({ ...prev, [key]: e.target.value }))}
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical' as const }}
                    />
                    {field?.sources.length ? (
                      <div style={sourceTagStyle}>{field.sources.map(s => SOURCE_LABELS[s] ?? s).join(' · ')}</div>
                    ) : null}
                  </Field>
                );
              })}

              {error && <div style={errorStyle}>{error}</div>}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={handleSaveEdits} disabled={submitting || !Object.keys(edits).length} style={secondaryButtonStyle(submitting || !Object.keys(edits).length)}>
                  Save edits
                </button>
                <button onClick={handleApprove} disabled={submitting} style={primaryButtonStyle(submitting)}>
                  {submitting ? 'Saving...' : 'Approve Brian ->'}
                </button>
              </div>
            </div>
          </>
        )}

        {step === 'icp_building' && (
          <>
            <h1 style={titleStyle}>
              {icpBuildError ? "Couldn't build your ideal customer profile" : 'Finding your ideal customer...'}
            </h1>
            <p style={subtitleStyle}>{icpBuildError ? 'Usually a one-off -- try again.' : 'Built from your approved business profile.'}</p>
            <div style={cardStyle}>
              {icpBuildError ? (
                <>
                  <div style={{ fontSize: 14, color: '#6e6e73', marginBottom: 16 }}>{icpBuildError}</div>
                  <button onClick={runIcpBuild} style={primaryButtonStyle(false)}>{'Try again ->'}</button>
                </>
              ) : (
                <div style={{ fontSize: 14, color: '#6e6e73' }}>Brian's approved -- now working out who your ideal customer is.</div>
              )}
            </div>
          </>
        )}

        {step === 'icp_review' && icp && (
          <>
            <h1 style={titleStyle}>Your ideal customer.</h1>
            <p style={subtitleStyle}>
              Built from Brian, your business profile. Check it over and fix anything that’s off.
            </p>
            <div style={cardStyle}>
              {(['target_profile', 'jobs_to_be_done', 'frustrations', 'current_alternatives'] as IcpFieldKey[]).map(key => {
                const field = icp.fields[key];
                return (
                  <Field key={key} label={ICP_FIELD_LABELS[key]}>
                    <textarea
                      value={icpFieldValue(key)}
                      onChange={e => setIcpEdits(prev => ({ ...prev, [key]: e.target.value }))}
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical' as const }}
                    />
                    {field?.sources.length ? (
                      <div style={sourceTagStyle}>{field.sources.map(s => SOURCE_LABELS[s] ?? s).join(' · ')}</div>
                    ) : null}
                  </Field>
                );
              })}

              {error && <div style={errorStyle}>{error}</div>}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={handleSaveIcpEdits} disabled={submitting || !Object.keys(icpEdits).length} style={secondaryButtonStyle(submitting || !Object.keys(icpEdits).length)}>
                  Save edits
                </button>
                <button onClick={handleApproveIcp} disabled={submitting} style={primaryButtonStyle(submitting)}>
                  {submitting ? 'Saving...' : 'Approve ->'}
                </button>
              </div>
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <h1 style={titleStyle}>You're all set.</h1>
            <p style={subtitleStyle}>Brian and your ideal customer profile are both approved.</p>
            <div style={cardStyle}>
              {icp && (['target_profile', 'jobs_to_be_done', 'frustrations', 'current_alternatives'] as IcpFieldKey[]).map(key => {
                const field = icp.fields[key];
                if (!field?.value) return null;
                return (
                  <Field key={key} label={ICP_FIELD_LABELS[key]}>
                    <div style={{ fontSize: 14, color: '#1d1d1f', lineHeight: 1.5 }}>{field.value}</div>
                  </Field>
                );
              })}

              <div style={{ paddingTop: 8, paddingBottom: 16, borderTop: '1px solid #f0f0f5' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#3a3a3c', marginBottom: 8 }}>Reaching out</div>
                {mailboxNotice && <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 8 }}>{mailboxNotice}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#1d1d1f' }}>
                    {mailboxConnected === null ? '' : mailboxConnected ? `Connected: ${mailboxEmail}` : 'No mailbox connected yet'}
                  </span>
                  {!mailboxConnected && (
                    <button onClick={handleConnectMailbox} disabled={mailboxSubmitting} style={{ ...secondaryButtonStyle(mailboxSubmitting), width: 'auto', padding: '6px 12px', fontSize: 12 }}>
                      {mailboxSubmitting ? 'Connecting...' : 'Connect your email'}
                    </button>
                  )}
                  {mailboxConnected && (
                    <button onClick={handleDisconnectMailbox} disabled={mailboxSubmitting} style={{ ...secondaryButtonStyle(mailboxSubmitting), width: 'auto', padding: '6px 12px', fontSize: 12 }}>
                      {mailboxSubmitting ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  )}
                </div>
                {mailboxConnected && !mailboxCanDetectReplies && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8, padding: '8px 10px', background: '#fffbeb', borderRadius: 8 }}>
                    <span style={{ fontSize: 12, color: '#92400e' }}>Reconnect your email so we can tell you when someone replies.</span>
                    <button onClick={handleConnectMailbox} disabled={mailboxSubmitting} style={{ ...secondaryButtonStyle(mailboxSubmitting), width: 'auto', padding: '6px 12px', fontSize: 12 }}>
                      {mailboxSubmitting ? 'Connecting...' : 'Reconnect'}
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: outreachPaused ? '#92400e' : '#1d1d1f' }}>
                    Outreach is {outreachPaused ? 'paused' : 'active'}
                  </span>
                  <button onClick={handleToggleOutreachPause} disabled={pauseSubmitting} style={{ ...secondaryButtonStyle(pauseSubmitting), width: 'auto', padding: '6px 12px', fontSize: 12 }}>
                    {pauseSubmitting ? 'Updating...' : (outreachPaused ? 'Resume outreach' : 'Pause outreach')}
                  </button>
                </div>
              </div>

              <div style={{ paddingTop: 8, paddingBottom: 16, borderTop: '1px solid #f0f0f5' }}>
                {(!prospectRun || prospectRun.status === 'failed') && candidates.length === 0 && (
                  <>
                    {prospectRun?.status === 'failed' && (
                      <div style={{ ...errorStyle, marginBottom: 0 }}>{prospectRun.error ?? 'Could not find companies.'}</div>
                    )}
                    <button onClick={handleStartProspecting} disabled={prospectSubmitting} style={{ ...primaryButtonStyle(prospectSubmitting), width: '100%', marginTop: prospectRun?.status === 'failed' ? 12 : 0 }}>
                      {prospectSubmitting ? 'Starting...' : (prospectRun?.status === 'failed' ? 'Try again ->' : 'Find matching companies ->')}
                    </button>
                  </>
                )}

                {prospectRun && (prospectRun.status === 'queued' || prospectRun.status === 'running') && (
                  <div style={{ fontSize: 14, color: '#6e6e73' }}>Looking for companies that match your ideal customer profile...</div>
                )}

                {candidates.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#3a3a3c', marginBottom: 12 }}>
                      {candidates.length} matching {candidates.length === 1 ? 'company' : 'companies'}
                      {prospectRun?.output?.droppedUnsourced ? ` (${prospectRun.output.droppedUnsourced} skipped for having no real website)` : ''}
                    </div>
                    {candidates.map(c => {
                      const busy = outreachActionId === c.id;
                      const statusLabel: Record<string, string> = { drafted: 'Drafted', approved: 'Approved', sent: 'Sent', failed: 'Send failed', replied: 'Replied' };
                      return (
                      <div key={c.id} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f5' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                          <a href={c.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none' }}>
                            {c.name}
                          </a>
                          {c.employee_count ? <span style={{ fontSize: 12, color: '#b0b0b8', flexShrink: 0 }}>{c.employee_count} employees</span> : null}
                        </div>
                        <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 2 }}>
                          {c.domain}{c.industry ? ` · ${c.industry}` : ''}
                        </div>
                        {c.reason && <div style={sourceTagStyle}>{c.reason}</div>}

                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {!c.contact_id && (
                            <button onClick={() => handleFindContact(c.id)} disabled={busy} style={{ ...secondaryButtonStyle(busy), width: 'auto', padding: '6px 12px', fontSize: 12 }}>
                              {busy ? 'Looking...' : 'Find a contact'}
                            </button>
                          )}
                          {c.contact_id && !c.contact_email && (
                            <span style={{ fontSize: 12, color: '#b0b0b8' }}>{c.contact_name} — no email found</span>
                          )}
                          {c.contact_email && !c.outreach_status && (
                            <button onClick={() => handleDraftOutreach(c.id)} disabled={busy} style={{ ...secondaryButtonStyle(busy), width: 'auto', padding: '6px 12px', fontSize: 12 }}>
                              {busy ? 'Drafting...' : 'Draft outreach ->'}
                            </button>
                          )}
                          {c.outreach_status && (
                            <button onClick={() => toggleExpanded(c)} style={{ ...secondaryButtonStyle(false), width: 'auto', padding: '6px 12px', fontSize: 12 }}>
                              {statusLabel[c.outreach_status]} {expandedProspectId === c.id ? '▴' : '▾'}
                            </button>
                          )}
                        </div>

                        {outreachErrors[c.id] && <div style={{ ...errorStyle, marginTop: 8, marginBottom: 0 }}>{outreachErrors[c.id]}</div>}

                        {expandedProspectId === c.id && c.outreach_status && (
                          <div style={{ marginTop: 12, padding: 12, background: '#f9f9fb', borderRadius: 10 }}>
                            <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 8 }}>
                              To: {c.contact_name}{c.contact_title ? `, ${c.contact_title}` : ''} &lt;{c.contact_email}&gt;
                            </div>
                            {c.outreach_status === 'replied' && (
                              <div style={{ fontSize: 12, color: '#1d7a3c', marginBottom: 8, fontWeight: 600 }}>
                                This contact replied -- check your inbox to continue the conversation.
                              </div>
                            )}
                            <input
                              value={outreachEdits.subject}
                              onChange={e => setOutreachEdits(prev => ({ ...prev, subject: e.target.value }))}
                              readOnly={c.outreach_status === 'sent' || c.outreach_status === 'replied'}
                              style={{ ...inputStyle, marginBottom: 8, fontWeight: 700 }}
                            />
                            <textarea
                              value={outreachEdits.body}
                              onChange={e => setOutreachEdits(prev => ({ ...prev, body: e.target.value }))}
                              readOnly={c.outreach_status === 'sent' || c.outreach_status === 'replied'}
                              rows={7}
                              style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}
                            />
                            {c.outreach_status !== 'sent' && c.outreach_status !== 'replied' && (
                              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                                <button onClick={() => handleSaveOutreachEdit(c.id)} disabled={busy} style={{ ...secondaryButtonStyle(busy), width: 'auto', padding: '6px 12px', fontSize: 12 }}>
                                  Save edit
                                </button>
                                {c.outreach_status === 'drafted' && (
                                  <button onClick={() => handleApproveOutreach(c.id)} disabled={busy} style={{ ...primaryButtonStyle(busy), width: 'auto', padding: '6px 12px', fontSize: 12 }}>
                                    Approve
                                  </button>
                                )}
                                {(c.outreach_status === 'approved' || c.outreach_status === 'failed') && (
                                  <button onClick={() => handleSendOutreach(c.id)} disabled={busy} style={{ ...primaryButtonStyle(busy), width: 'auto', padding: '6px 12px', fontSize: 12 }}>
                                    {busy ? 'Sending...' : (c.outreach_status === 'failed' ? 'Retry send' : 'Send ->')}
                                  </button>
                                )}
                                <button onClick={() => handleOptOut(c.id)} disabled={busy} style={{ ...secondaryButtonStyle(busy), width: 'auto', padding: '6px 12px', fontSize: 12, marginLeft: 'auto' }}>
                                  Mark opted out
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })}
                    {prospectRun?.status !== 'queued' && prospectRun?.status !== 'running' && (
                      <button onClick={handleStartProspecting} disabled={prospectSubmitting} style={{ ...secondaryButtonStyle(prospectSubmitting), width: '100%', marginTop: 16 }}>
                        {prospectSubmitting ? 'Starting...' : 'Find more ->'}
                      </button>
                    )}
                  </>
                )}
              </div>
              <div style={{ paddingTop: 16, borderTop: '1px solid #f0f0f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#c0c0c8' }}>{icp ? `ICP v${icp.version}` : ''}{brian ? ` · Brian v${brian.version}` : ''}</span>
                <button onClick={() => navigate('/progress')} style={{ ...secondaryButtonStyle(false), width: 'auto', padding: '8px 16px' }}>
                  Back to My Idea Vault
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#3a3a3c', marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  );
}

const titleStyle: React.CSSProperties = {
  fontSize: 28, fontWeight: 800, letterSpacing: -1, lineHeight: 1.15,
  color: '#1d1d1f', fontFamily: 'var(--font-display)', margin: '0 0 8px',
};
const subtitleStyle: React.CSSProperties = {
  fontSize: 15, color: '#6e6e73', margin: '0 0 32px', fontStyle: 'italic', fontFamily: 'var(--font-display)',
};
const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 20, border: '1.5px solid #e5e5ea',
  boxShadow: '0 8px 40px rgba(0,0,0,.06)', padding: '32px',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10,
  border: '1.5px solid #e5e5ea', fontSize: 15, color: '#1d1d1f',
  fontFamily: 'inherit', boxSizing: 'border-box',
};
const errorStyle: React.CSSProperties = { fontSize: 13, color: '#b42318', marginBottom: 16 };
const warnStyle: React.CSSProperties = {
  background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10,
  padding: '10px 14px', fontSize: 13, color: '#92400e', lineHeight: 1.5,
};
const sourceTagStyle: React.CSSProperties = { fontSize: 11, color: '#b0b0b8', marginTop: 4, fontStyle: 'italic' };
const primaryButtonStyle = (disabled: boolean): React.CSSProperties => ({
  flex: 1, padding: '13px', borderRadius: 10,
  background: disabled ? '#c0c0c8' : '#1d1d1f', color: '#fff',
  border: 'none', fontSize: 14, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
});
const secondaryButtonStyle = (disabled: boolean): React.CSSProperties => ({
  flex: 1, padding: '13px', borderRadius: 10,
  background: 'transparent', color: disabled ? '#c0c0c8' : '#1d1d1f',
  border: '1.5px solid #e5e5ea', fontSize: 14, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
});
