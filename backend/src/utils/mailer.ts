import nodemailer from 'nodemailer';
import ical, { ICalCalendarMethod } from 'ical-generator';

// Lazy-initialised transporter — only created if SMTP env vars are set
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_PORT, SMTP_SECURE } = process.env;
  if (!SMTP_USER || !SMTP_PASS) return null;

  if (SMTP_HOST) {
    // Any SMTP provider — Brevo, Zoho, Postmark, Resend, Google Workspace, etc.
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT ? Number(SMTP_PORT) : 587,
      secure: SMTP_SECURE ? SMTP_SECURE === 'true' : false, // true only for port 465
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  } else {
    // Back-compat: a bare Gmail account with no SMTP_HOST configured
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

// The address/name every outgoing email is sent "from". Defaults to the SMTP
// login itself so nothing breaks if MAIL_FROM isn't set, but once a proper
// mailbox like hello@mvpclub.io exists, point MAIL_FROM there — this lets the
// display name/address stay consistent even if the SMTP provider (e.g. Brevo)
// authenticates with a different login than the human-facing sender address.
const FROM_NAME    = process.env.MAIL_FROM_NAME || 'MVP Club';
const FROM_ADDRESS = process.env.MAIL_FROM || process.env.SMTP_USER || '';

export async function sendPasswordResetEmail({
  toEmail,
  toName,
  resetLink,
}: {
  toEmail: string;
  toName: string;
  resetLink: string;
}) {
  const t = getTransporter();
  if (!t) {
    console.warn('[mailer] SMTP not configured — password reset email not sent. Link:', resetLink);
    return;
  }

  const firstName = toName.split(' ')[0];

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111">
      <div style="text-align:center;padding:32px 0 20px">
        <div style="font-size:42px;margin-bottom:8px">🔑</div>
        <h2 style="font-size:22px;font-weight:800;margin:0;letter-spacing:-.5px">Reset your password</h2>
      </div>
      <p>Hi ${firstName},</p>
      <p>We received a request to reset the password for your <strong>MVP Club</strong> account. Click the button below — this link expires in <strong>1 hour</strong>.</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${resetLink}" style="background:#1d1d1f;color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:700;font-size:15px;display:inline-block">
          Reset my password →
        </a>
      </div>
      <p style="font-size:13px;color:#6b7280">Or copy this link into your browser:<br/>
        <a href="${resetLink}" style="color:#6366f1;word-break:break-all">${resetLink}</a>
      </p>
      <p style="font-size:13px;color:#6b7280">If you didn't request this, you can safely ignore this email — your password won't change.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
      <p style="font-size:11px;color:#9ca3af;text-align:center">MVP Club · Building real startups, one step at a time.</p>
    </div>
  `;

  const text = [
    `Hi ${firstName},`,
    '',
    'We received a request to reset your MVP Club password.',
    '',
    `Reset link (expires in 1 hour): ${resetLink}`,
    '',
    "If you didn't request this, ignore this email.",
  ].join('\n');

  await t.sendMail({
    from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to: toEmail,
    subject: 'Reset your MVP Club password',
    text,
    html,
  });

  console.log(`[mailer] Password reset email sent to ${toEmail}`);
}

export async function sendNetworkOfferEmail({
  toEmail,
  toName,
  fromName,
  ideaName,
  howTheyCanHelp,
  relationship,
}: {
  toEmail: string;
  toName: string;
  fromName: string;
  ideaName: string;
  howTheyCanHelp: string;
  relationship?: string;
}) {
  const t = getTransporter();
  if (!t) {
    console.warn('[mailer] SMTP not configured — skipping email send');
    return;
  }

  const firstName = toName.split(' ')[0];
  const relationshipLine = relationship ? ` We ${relationship}.` : '';

  const appUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';

  const text = [
    `Hi ${firstName},`,
    '',
    `Hope you're doing well!${relationshipLine} I came across a founder on MVP Club building something I think you'd find interesting.`,
    '',
    `Their idea: "${ideaName}"`,
    '',
    `Based on what I know about your background, I think you'd be really valuable to them — specifically: ${howTheyCanHelp}`,
    '',
    `I've already shared your contact with the founder on the platform, so they may reach out to you soon. Would you be open to a quick chat if they do?`,
    '',
    `You can also join MVP Club and connect with them directly: ${appUrl}`,
    '',
    `Thanks,`,
    fromName,
  ].join('\n');

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
      <p>Hi ${firstName},</p>
      <p>Hope you're doing well!${relationshipLine} I came across a founder on <strong>MVP Club</strong> building something I think you'd find interesting.</p>
      <div style="background:#f8fafc;border-left:4px solid #5856d6;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0">
        <strong>Their idea:</strong> "${ideaName}"
      </div>
      <p>Based on what I know about your background, I think you'd be really valuable to them — specifically: <strong>${howTheyCanHelp}</strong></p>
      <p>I've already shared your contact with the founder on the platform, so they may reach out to you soon. Would you be open to a quick chat if they do?</p>
      <div style="text-align:center;margin:28px 0">
        <a href="${appUrl}" style="background:#5856d6;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block">
          Join MVP Club →
        </a>
        <p style="font-size:12px;color:#9ca3af;margin-top:10px">${appUrl}</p>
      </div>
      <p>Thanks,<br/><strong>${fromName}</strong></p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
      <p style="font-size:11px;color:#9ca3af">You received this because ${fromName} offered your expertise to a founder on MVP Club.</p>
    </div>
  `;

  await t.sendMail({
    from: `"${fromName} via ${FROM_NAME}" <${FROM_ADDRESS}>`,
    to: toEmail,
    subject: `Quick intro — ${ideaName}`,
    text,
    html,
  });

  console.log(`[mailer] Warm-up email sent to ${toEmail}`);
}

// ── Interview invite (.ics) ───────────────────────────────────────────────────
// Shared ICS builder for a booked interview — used both by the interviewee's invite
// email (below) and, independently, by the organizer's confirmation email, so the
// organizer's calendar invite never depends on the interviewee's email having been
// sent successfully (or having an address at all). intervieweeEmail is optional:
// when absent, the interviewee is left off the attendee list rather than added with
// a blank address (ical-generator requires a real email per attendee).
function buildInterviewIcs({
  organizerName,
  organizerEmail,
  intervieweeName,
  intervieweeEmail,
  ideaName,
  startTime,
  endTime,
  meetingLink,
  meetingProvider,
}: {
  organizerName: string;
  organizerEmail: string;
  intervieweeName: string;
  intervieweeEmail?: string;
  ideaName: string;
  startTime: Date;
  endTime: Date;
  meetingLink: string;
  meetingProvider: string;
}): string {
  const cal = ical({ name: 'MVP Club Interview' });
  cal.method(ICalCalendarMethod.REQUEST);

  const firstName = intervieweeName.split(' ')[0];
  const providerLabel = meetingProvider === 'zoom' ? 'Zoom' : meetingProvider === 'teams' ? 'Microsoft Teams' : 'Video Call';
  const subject = `Customer Discovery Interview — ${ideaName}`;

  const attendees = [{ name: organizerName, email: organizerEmail, rsvp: true }];
  if (intervieweeEmail) attendees.push({ name: intervieweeName, email: intervieweeEmail, rsvp: true });

  const event = cal.createEvent({
    start: startTime,
    end: endTime,
    summary: subject,
    description: [
      `Hi ${firstName},`,
      '',
      `${organizerName} has invited you to a customer discovery interview about "${ideaName}".`,
      '',
      meetingLink ? `Join via ${providerLabel}: ${meetingLink}` : 'The organiser will share the meeting link shortly.',
      '',
      'This is an informal conversation — no preparation needed.',
      '',
      `Questions? Reply to this email or contact ${organizerName} directly.`,
    ].join('\n'),
    location: meetingLink || providerLabel,
    url: meetingLink || undefined,
    organizer: { name: organizerName, email: organizerEmail },
    attendees,
  });

  void event; // used for side-effect: adds to cal

  return cal.toString();
}

export async function sendInterviewInviteEmail({
  organizerName,
  organizerEmail,
  intervieweeName,
  intervieweeEmail,
  ideaName,
  startTime,
  endTime,
  meetingLink,
  meetingProvider,
}: {
  organizerName: string;
  organizerEmail: string;
  intervieweeName: string;
  intervieweeEmail: string;
  ideaName: string;
  startTime: Date;
  endTime: Date;
  meetingLink: string;
  meetingProvider: string;
}) {
  const t = getTransporter();
  if (!t) {
    console.warn('[mailer] SMTP not configured — skipping interview invite email');
    return null;
  }

  const firstName = intervieweeName.split(' ')[0];
  const providerLabel = meetingProvider === 'zoom' ? 'Zoom' : meetingProvider === 'teams' ? 'Microsoft Teams' : 'Video Call';
  const subject = `Customer Discovery Interview — ${ideaName}`;

  const icsContent = buildInterviewIcs({
    organizerName, organizerEmail, intervieweeName, intervieweeEmail, ideaName,
    startTime, endTime, meetingLink, meetingProvider,
  });

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
      <h2 style="font-size:20px;font-weight:800;margin-bottom:4px">You've been invited to a discovery interview</h2>
      <p style="color:#6b7280;margin-top:0">via <strong>MVP Club</strong></p>

      <div style="background:#f8fafc;border-radius:12px;padding:20px 24px;margin:20px 0">
        <div style="font-size:13px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">ABOUT</div>
        <div style="font-size:17px;font-weight:800;margin-bottom:4px">${ideaName}</div>
        <div style="font-size:14px;color:#374151">Hosted by <strong>${organizerName}</strong></div>
      </div>

      <div style="background:#f8fafc;border-radius:12px;padding:20px 24px;margin:20px 0">
        <div style="font-size:13px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">WHEN</div>
        <div style="font-size:15px;font-weight:700">${startTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div style="font-size:14px;color:#374151">${startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} – ${endTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>

      ${meetingLink ? `
      <div style="text-align:center;margin:28px 0">
        <a href="${meetingLink}" style="background:#4F46E5;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block">
          Join ${providerLabel} →
        </a>
      </div>
      ` : ''}

      <p style="color:#374151;line-height:1.6">Hi ${firstName},<br/><br/>
      ${organizerName} is building <strong>"${ideaName}"</strong> and would love to hear your perspective in a short discovery chat. There's nothing to prepare — just a conversation about how you currently deal with the problem they're exploring.<br/><br/>
      A calendar invite is attached to this email. Accept it to add the meeting to your diary.</p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
      <p style="font-size:11px;color:#9ca3af">You received this because ${organizerName} invited you via MVP Club.</p>
    </div>
  `;

  const text = [
    `You've been invited to a customer discovery interview`,
    '',
    `Idea: ${ideaName}`,
    `Host: ${organizerName}`,
    `When: ${startTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} at ${startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
    meetingLink ? `Join: ${meetingLink}` : '',
    '',
    `Hi ${firstName}, a calendar invite is attached. Accept it to add the meeting to your diary.`,
  ].filter(Boolean).join('\n');

  await t.sendMail({
    from: `"${organizerName} via ${FROM_NAME}" <${FROM_ADDRESS}>`,
    to: `"${intervieweeName}" <${intervieweeEmail}>`,
    subject,
    text,
    html,
    icalEvent: {
      method: 'REQUEST',
      content: icsContent,
    },
  });

  // Also return the ICS so the backend can send a copy to the organiser
  return icsContent;
}

// ── In-app notification emails ────────────────────────────────────────────────

const NOTIF_ICON: Record<string, string> = {
  new_post:      '📝',
  new_comment:   '💬',
  new_reply:     '↩️',
  encourage:     '👍',
  network_offer: '🤝',
  new_feedback:  '💡',
};

const NOTIF_COLOR: Record<string, string> = {
  new_post:      '#007aff',
  new_comment:   '#5856d6',
  new_reply:     '#5856d6',
  encourage:     '#ff9500',
  network_offer: '#34c759',
  new_feedback:  '#8b5cf6',
};

export async function sendNotificationEmail({
  toEmail,
  toName,
  type,
  title,
  body,
  link,
}: {
  toEmail: string;
  toName: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
}) {
  const t = getTransporter();
  if (!t) {
    console.warn('[mailer] SMTP not configured — notification email not sent:', title);
    return;
  }

  const firstName = toName.split(' ')[0];
  const appUrl    = process.env.FRONTEND_URL ?? 'http://localhost:3001';
  const actionUrl = link ? `${appUrl}${link}` : appUrl;
  const icon      = NOTIF_ICON[type] ?? '🔔';
  const color     = NOTIF_COLOR[type] ?? '#1d1d1f';

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;color:#1d1d1f;background:#fff">
      <!-- Header -->
      <div style="background:${color};padding:28px 32px;text-align:center">
        <div style="font-size:40px;margin-bottom:8px">${icon}</div>
        <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.75);margin-bottom:4px">MVP Club</div>
        <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.02em">${title}</div>
      </div>

      <!-- Body -->
      <div style="padding:28px 32px">
        <p style="margin:0 0 16px;font-size:15px;color:#3a3a3c;line-height:1.6">
          Hi ${firstName},
        </p>
        ${body ? `<p style="margin:0 0 24px;font-size:15px;color:#3a3a3c;line-height:1.6">${body}</p>` : ''}

        <div style="text-align:center;margin:28px 0">
          <a href="${actionUrl}"
             style="background:${color};color:#fff;text-decoration:none;padding:13px 32px;
                    border-radius:12px;font-weight:700;font-size:15px;display:inline-block;
                    letter-spacing:-0.01em">
            View in MVP Club →
          </a>
        </div>

        <hr style="border:none;border-top:1px solid #e5e5ea;margin:24px 0"/>
        <p style="font-size:11px;color:#aeaeb2;text-align:center;margin:0">
          You're receiving this because you have email notifications enabled on MVP Club.<br/>
          <a href="${appUrl}/profile" style="color:#aeaeb2">Manage preferences</a>
        </p>
      </div>
    </div>
  `;

  const text = [
    `Hi ${firstName},`,
    '',
    title,
    body ?? '',
    '',
    `View it here: ${actionUrl}`,
    '',
    `To turn off email notifications, visit ${appUrl}/profile`,
  ].filter(l => l !== null).join('\n');

  await t.sendMail({
    from:    `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to:      toEmail,
    subject: title,
    text,
    html,
  });

  console.log(`[mailer] Notification email (${type}) sent to ${toEmail}`);
}

// ── Weekly momentum digest ────────────────────────────────────────────────────

const DIGEST_STAGE_LABEL: Record<string, string> = {
  idea:     '💡 Idea',
  hone:     '🎯 Hone',
  validate: '🧪 Validate',
  shape:    '🔨 Shape',
  done:     '🚀 Ship',
};

const DIGEST_STAGE_COLOR: Record<string, string> = {
  idea:     '#5856d6',
  hone:     '#0066cc',
  validate: '#34c759',
  shape:    '#ff9500',
  done:     '#ff3b30',
};

const DIGEST_NEXT_STEP: Record<string, { action: string; desc: string; path: string }> = {
  idea:     { action: 'Write your one-liner',  desc: 'Describe your idea in one sentence so clearly that a stranger immediately gets it.',             path: '/work' },
  hone:     { action: 'Score your idea',       desc: 'Answer the honing questions to reveal where your thinking is strongest — and where the gaps are.', path: '/work' },
  validate: { action: 'Book one conversation', desc: 'Pick one person from your target market and ask for 20 minutes of their time this week.',        path: '/work' },
  shape:    { action: 'Lock your 3 features',  desc: 'Define the smallest feature set that delivers the core value. Everything else goes on the backlog.', path: '/work' },
  done:     { action: 'Share your progress',   desc: 'Post a win in the community — even a small one. Progress shared is progress doubled.',           path: '/community' },
};

export async function sendWeeklyDigestEmail({
  toEmail,
  toName,
  stage,
  ideaName,
  entriesThisWeek,
}: {
  toEmail: string;
  toName: string;
  stage: string;
  ideaName: string | null;
  entriesThisWeek: number;
}) {
  const t = getTransporter();
  if (!t) {
    console.warn('[mailer] SMTP not configured — weekly digest not sent to', toEmail);
    return;
  }

  const firstName  = toName.split(' ')[0];
  const appUrl     = process.env.FRONTEND_URL ?? 'http://localhost:3001';
  const stageLabel = DIGEST_STAGE_LABEL[stage] ?? stage;
  const stageColor = DIGEST_STAGE_COLOR[stage] ?? '#1d1d1f';
  const nextStep   = DIGEST_NEXT_STEP[stage]   ?? DIGEST_NEXT_STEP['idea'];
  const ctaUrl     = `${appUrl}${nextStep.path}`;
  const wasActive  = entriesThisWeek > 0;

  const activityLine = wasActive
    ? `You made <strong>${entriesThisWeek} update${entriesThisWeek !== 1 ? 's' : ''}</strong> last week. Keep that momentum going.`
    : `No updates in the last 7 days — no judgement, just a nudge to take one small step today.`;

  const ideaLine = ideaName ? `<strong>"${ideaName}"</strong>` : 'your idea';

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;color:#1d1d1f;background:#fff">
      <div style="background:${stageColor};padding:32px;text-align:center">
        <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.75);margin-bottom:8px">MVP Club · Weekly Update</div>
        <div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.03em;line-height:1.2">Your momentum<br/>check-in</div>
        <div style="margin-top:14px;display:inline-block;background:rgba(255,255,255,0.2);border-radius:20px;padding:5px 14px">
          <span style="color:#fff;font-size:13px;font-weight:700">${stageLabel}</span>
        </div>
      </div>

      <div style="padding:28px 32px">
        <p style="font-size:16px;color:#1d1d1f;margin:0 0 8px">Hi ${firstName} 👋</p>
        <p style="font-size:15px;color:#3a3a3c;line-height:1.6;margin:0 0 24px">Here's your weekly check-in for ${ideaLine}.</p>

        <div style="background:${wasActive ? '#f0fdf4' : '#fafafa'};border-left:4px solid ${wasActive ? '#34c759' : '#d2d2d7'};border-radius:0 10px 10px 0;padding:14px 16px;margin-bottom:24px;font-size:14px;color:#3a3a3c;line-height:1.5">
          ${activityLine}
        </div>

        <div style="background:#f5f5f7;border-radius:14px;padding:20px 22px;margin-bottom:28px">
          <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#6e6e73;margin-bottom:8px">Your one next step</div>
          <div style="font-size:17px;font-weight:800;color:#1d1d1f;margin-bottom:6px">${nextStep.action}</div>
          <div style="font-size:14px;color:#6e6e73;line-height:1.5">${nextStep.desc}</div>
        </div>

        <div style="text-align:center;margin:0 0 28px">
          <a href="${ctaUrl}" style="background:${stageColor};color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:800;font-size:15px;display:inline-block;letter-spacing:-0.01em">
            ${nextStep.action} →
          </a>
        </div>

        <hr style="border:none;border-top:1px solid #e5e5ea;margin:24px 0"/>
        <p style="font-size:12px;color:#aeaeb2;text-align:center;margin:0;line-height:1.6">
          Sent every Monday · <a href="${appUrl}/profile" style="color:#aeaeb2">Unsubscribe</a>
        </p>
      </div>
    </div>
  `;

  const text = [
    `Hi ${firstName},`,
    '',
    `Your weekly MVP Club check-in — currently in ${stageLabel}.`,
    '',
    wasActive
      ? `Great work — you made ${entriesThisWeek} update${entriesThisWeek !== 1 ? 's' : ''} last week.`
      : `No updates in the last 7 days — time to take one small step.`,
    '',
    `Your next step: ${nextStep.action}`,
    nextStep.desc,
    '',
    `Get moving: ${ctaUrl}`,
    '',
    `Unsubscribe: ${appUrl}/profile`,
  ].join('\n');

  await t.sendMail({
    from:    `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to:      toEmail,
    subject: wasActive
      ? `⚡ Keep it up, ${firstName} — here's your next step`
      : `👋 ${firstName}, time for your weekly move`,
    text,
    html,
  });

  console.log(`[mailer] Weekly digest sent to ${toEmail} (stage: ${stage}, entries: ${entriesThisWeek})`);
}

// ── Re-engagement (progress amnesia) email ────────────────────────────────────

const RE_ENGAGEMENT_QUOTES: Record<number, { text: string; attr: string }> = {
  3:  { text: 'The way to get started is to quit talking and begin doing.', attr: '— Walt Disney' },
  7:  { text: "Don't worry about failure. You only have to be right once.", attr: '— Drew Houston, Dropbox founder' },
  14: { text: 'Ideas are easy. Execution is all that matters.', attr: '— Casey Neistat' },
};

const RE_ENGAGEMENT_STAGE_META: Record<string, { nextLabel: string; nextDesc: string; checklist: string[] }> = {
  idea: {
    nextLabel: 'Hone it',
    nextDesc: 'Sharpen your idea into one clear problem statement.',
    checklist: ['Captured your idea in writing', 'Defined the problem you\'re solving', 'Talk to 3 real users'],
  },
  hone: {
    nextLabel: 'Validate',
    nextDesc: 'Talk to 3 real people who have the problem.',
    checklist: ['Captured your idea in writing', 'Honed your problem statement', 'Talk to 3 real users'],
  },
  validate: {
    nextLabel: 'Shape it',
    nextDesc: 'Define the simplest version of your product.',
    checklist: ['Captured your idea', 'Honed the problem', 'Completed 3 user interviews', 'Define your MVP features'],
  },
  shape: {
    nextLabel: 'Get it done',
    nextDesc: 'Build your 3 core features and share your progress.',
    checklist: ['Captured your idea', 'Honed the problem', 'Validated with users', 'Build your MVP'],
  },
  done: {
    nextLabel: 'Share your launch',
    nextDesc: 'Post a win in the community and keep iterating.',
    checklist: ['Captured your idea', 'Validated the problem', 'Built your MVP', 'Share it with the world'],
  },
};

const RE_ENGAGEMENT_SUBJECTS: Record<number, (name: string) => string> = {
  3:  (name) => `You're further along than you think, ${name}`,
  7:  (name) => `Your progress is waiting, ${name}`,
  14: (name) => `Be honest with yourself, ${name}`,
};

const RE_ENGAGEMENT_OPENERS: Record<number, string> = {
  3:  "You haven't been back in a few days — that's okay. Before you talk yourself out of it, here's what you've already done:",
  7:  "A week has passed. Most people at this stage either come back in the next few days — or they don't come back at all. Here's a reminder of how far you've come:",
  14: "Two weeks. We're not going to pretend that's not a long time. Here's where things stand:",
};

const RE_ENGAGEMENT_CLOSERS: Record<number, string> = {
  3:  'The next step is quick — one question, 20 minutes.',
  7:  "You're still in the window where this matters. One step today keeps the momentum alive.",
  14: "Is this idea still alive in your head? If yes, now is the moment. If not — that's okay too. Close it out and make space for the next one.",
};

const RE_ENGAGEMENT_CTA: Record<number, string> = {
  3:  'Pick up where you left off →',
  7:  'Come back today →',
  14: "I'm coming back →",
};

const RE_ENGAGEMENT_GHOST: Record<number, string> = {
  3:  'I need more time',
  7:  'Snooze for 3 days',
  14: 'Archive this idea',
};

const RE_ENGAGEMENT_PROGRESS_LABEL: Record<number, string> = {
  3:  'Most founders never get this far.',
  7:  'Founders who validate within 2 weeks are 4× more likely to ship.',
  14: '68% of ideas are abandoned after 2 weeks of inactivity. Don\'t be a statistic.',
};

export async function sendReEngagementEmail({
  toEmail,
  toName,
  stage,
  ideaName,
  daysSinceLastActivity,
}: {
  toEmail: string;
  toName: string;
  stage: string;
  ideaName: string | null;
  daysSinceLastActivity: 3 | 7 | 14;
}) {
  const t = getTransporter();
  if (!t) {
    console.warn('[mailer] SMTP not configured — re-engagement email not sent to', toEmail);
    return;
  }

  const firstName   = toName.split(' ')[0];
  const appUrl      = process.env.FRONTEND_URL ?? 'http://localhost:3001';
  const ctaUrl      = `${appUrl}/work`;
  const archiveUrl  = `${appUrl}/work`;
  const d           = daysSinceLastActivity;
  const quote       = RE_ENGAGEMENT_QUOTES[d];
  const stageMeta   = RE_ENGAGEMENT_STAGE_META[stage] ?? RE_ENGAGEMENT_STAGE_META['idea'];
  const subject     = RE_ENGAGEMENT_SUBJECTS[d](firstName);
  const opener      = RE_ENGAGEMENT_OPENERS[d];
  const closer      = RE_ENGAGEMENT_CLOSERS[d];
  const ctaLabel    = RE_ENGAGEMENT_CTA[d];
  const ghostLabel  = RE_ENGAGEMENT_GHOST[d];
  const progLabel   = RE_ENGAGEMENT_PROGRESS_LABEL[d];
  const ideaLine    = ideaName ? `"${ideaName}"` : 'your idea';

  // Work out checklist: all but last item are done
  const checklist = stageMeta.checklist;
  const checklistHtml = checklist.map((item, i) => {
    const done = i < checklist.length - 1;
    return `
      <div style="display:flex;align-items:center;gap:10px;font-size:13px;color:#3a3a3c;padding:4px 0">
        <div style="width:18px;height:18px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;
          background:${done ? '#f0fdf4' : '#f5f5f7'};border:1px solid ${done ? '#86efac' : '#d2d2d7'}">
          ${done ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
        </div>
        <span style="${done ? 'color:#6e6e73' : 'font-weight:600;color:#1d1d1f'}">${item}${!done ? ' <span style="font-size:10px;background:#e8f0fe;color:#1a56db;padding:1px 6px;border-radius:99px;margin-left:4px;font-weight:600">next</span>' : ''}</span>
      </div>`;
  }).join('');

  const progressPct = Math.round(((checklist.length - 1) / checklist.length) * 100);

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;color:#1d1d1f;background:#fff">

      <!-- Dark header with quote -->
      <div style="background:#0d0d1a;padding:28px 32px 24px">
        <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:16px">
          MVP Club
        </div>
        <div style="font-size:13px;font-style:italic;color:rgba(255,255,255,0.75);font-family:Georgia,serif;line-height:1.65;margin-bottom:8px">
          "${quote.text}"
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,0.3);letter-spacing:0.03em">${quote.attr}</div>
      </div>

      <!-- Body -->
      <div style="padding:28px 32px">
        <p style="font-size:16px;font-weight:600;color:#1d1d1f;margin:0 0 10px">Hey ${firstName},</p>
        <p style="font-size:14px;color:#3a3a3c;line-height:1.65;margin:0 0 20px">${opener}</p>

        <!-- Checklist -->
        <div style="background:#fafafa;border-radius:12px;padding:14px 16px;margin-bottom:12px">
          ${checklistHtml}
        </div>

        <!-- Progress bar -->
        <div style="height:3px;background:#e5e7eb;border-radius:99px;margin-bottom:5px;overflow:hidden">
          <div style="height:100%;width:${progressPct}%;background:#1a56db;border-radius:99px"></div>
        </div>
        <p style="font-size:11px;color:#9ca3af;margin:0 0 20px">${progressPct}% of the way there. ${progLabel}</p>

        <p style="font-size:14px;color:#3a3a3c;line-height:1.65;margin:0 0 18px">${closer}</p>

        <!-- Stage banner -->
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:12px 16px;margin-bottom:22px;display:flex;align-items:center;gap:12px">
          <div style="font-size:20px;color:#1a56db">→</div>
          <div>
            <div style="font-size:13px;font-weight:600;color:#1e40af;margin-bottom:2px">Up next: ${stageMeta.nextLabel}</div>
            <div style="font-size:12px;color:#3b82f6">${stageMeta.nextDesc}</div>
          </div>
        </div>

        <!-- CTA -->
        <div style="text-align:center;margin-bottom:8px">
          <a href="${ctaUrl}" style="background:#0d0d1a;color:#fff;text-decoration:none;padding:13px 32px;border-radius:12px;font-weight:600;font-size:14px;display:inline-block;letter-spacing:-0.01em">
            ${ctaLabel}
          </a>
        </div>
        <div style="text-align:center;margin-bottom:24px">
          <a href="${d === 14 ? archiveUrl : ctaUrl}" style="font-size:13px;color:#9ca3af;text-decoration:none">${ghostLabel}</a>
        </div>

        <hr style="border:none;border-top:1px solid #e5e5ea;margin:0 0 16px"/>
        <p style="font-size:11px;color:#aeaeb2;text-align:center;margin:0;line-height:1.6">
          You're receiving this because you started your MVP journey on MVP Club for ${ideaLine}.<br/>
          <a href="${appUrl}/profile" style="color:#aeaeb2">Unsubscribe</a> · <a href="${appUrl}/profile" style="color:#aeaeb2">Update preferences</a>
        </p>
      </div>
    </div>
  `;

  const text = [
    `Hey ${firstName},`,
    '',
    `"${quote.text}" ${quote.attr}`,
    '',
    opener,
    '',
    checklist.map((item, i) => `${i < checklist.length - 1 ? '✓' : '○'} ${item}`).join('\n'),
    '',
    closer,
    '',
    `Up next: ${stageMeta.nextLabel} — ${stageMeta.nextDesc}`,
    '',
    `${ctaLabel}: ${ctaUrl}`,
    '',
    `To unsubscribe: ${appUrl}/profile`,
  ].join('\n');

  await t.sendMail({
    from:    `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to:      toEmail,
    subject,
    text,
    html,
  });

  console.log(`[mailer] Re-engagement email (day ${d}) sent to ${toEmail} (stage: ${stage})`);
}

export async function sendOrganizerCalendarInvite({
  organizerName,
  organizerEmail,
  intervieweeName,
  intervieweeEmail,
  ideaName,
  startTime,
  endTime,
  meetingLink,
  meetingProvider,
  icsContent,
}: {
  organizerName: string;
  organizerEmail: string;
  intervieweeName: string;
  intervieweeEmail?: string;
  ideaName: string;
  startTime: Date;
  endTime: Date;
  meetingLink: string;
  meetingProvider: string;
  // Optional — if the interviewee's invite already built one, reuse it. If it's
  // missing (interviewee had no email, or that send failed/was skipped), this
  // builds its own rather than silently skipping the organizer's notification.
  icsContent?: string;
}) {
  const t = getTransporter();
  if (!t) return;

  const ics = icsContent || buildInterviewIcs({
    organizerName, organizerEmail, intervieweeName, intervieweeEmail, ideaName,
    startTime, endTime, meetingLink, meetingProvider,
  });

  const providerLabel = meetingProvider === 'zoom' ? 'Zoom' : meetingProvider === 'teams' ? 'Microsoft Teams' : 'Video Call';

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
      <h2 style="font-size:18px;font-weight:800;margin-bottom:4px">Interview scheduled ✓</h2>
      <p>Your interview with <strong>${intervieweeName}</strong> about <strong>"${ideaName}"</strong> has been scheduled.</p>
      <p>📅 ${startTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} at ${startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
      ${meetingLink ? `<p><a href="${meetingLink}">Join ${providerLabel}</a></p>` : ''}
      <p>A calendar invite is attached — accept it to add this to your diary.</p>
    </div>
  `;

  await t.sendMail({
    from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to: `"${organizerName}" <${organizerEmail}>`,
    subject: `Interview confirmed: ${intervieweeName} — ${ideaName}`,
    html,
    text: `Interview scheduled with ${intervieweeName} on ${startTime.toLocaleDateString()}. Join: ${meetingLink}`,
    icalEvent: {
      method: 'REQUEST',
      content: ics,
    },
  });
}

// ── Meeting request (self-serve slot booking) ──────────────────────────────────
export async function sendMeetingRequestEmail({
  toEmail,
  toName,
  organizerName,
  ideaName,
  problem,
  bookingLink,
  durationMins,
}: {
  toEmail: string;
  toName: string;
  organizerName: string;
  ideaName: string;
  problem?: string;
  bookingLink: string;
  durationMins: number;
}) {
  const t = getTransporter();
  if (!t) {
    console.warn('[mailer] SMTP not configured — meeting request email not sent. Link:', bookingLink);
    return false;
  }

  const firstName = toName.split(' ')[0];
  const problemLine = problem ? ` I'm exploring: ${problem}.` : '';

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
      <p>Hi ${firstName},</p>
      <p>I'm ${organizerName}, working on <strong>"${ideaName}"</strong>.${problemLine} Would you be open to a quick ${durationMins}-minute chat? No prep needed — just a real conversation.</p>
      <div style="text-align:center;margin:28px 0">
        <a href="${bookingLink}" style="background:#059669;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block">
          Pick a time →
        </a>
        <p style="font-size:12px;color:#9ca3af;margin-top:10px">${bookingLink}</p>
      </div>
      <p>Pick whatever slot works for you — I'll get a confirmation the moment you do.</p>
      <p>Thanks,<br/><strong>${organizerName}</strong></p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
      <p style="font-size:11px;color:#9ca3af">Sent via MVP Club on behalf of ${organizerName}.</p>
    </div>
  `;

  const text = [
    `Hi ${firstName},`,
    '',
    `I'm ${organizerName}, working on "${ideaName}".${problemLine} Would you be open to a quick ${durationMins}-minute chat?`,
    '',
    `Pick a time that works for you: ${bookingLink}`,
    '',
    `Thanks,`,
    organizerName,
  ].join('\n');

  await t.sendMail({
    from: `"${organizerName} via ${FROM_NAME}" <${FROM_ADDRESS}>`,
    to: `"${toName}" <${toEmail}>`,
    subject: `Quick ${durationMins}-min chat about "${ideaName}"?`,
    text,
    html,
  });

  console.log(`[mailer] Meeting request email sent to ${toEmail}`);
  return true;
}
