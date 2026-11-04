import { query } from '../db';
import { threadHasReply, GMAIL_METADATA_SCOPE } from './gmail';

// -- Reply detection (GRF-27) --------------------------------------------------
//
// Runs as a periodic sweep from grafter-worker (see worker.ts's setInterval),
// not a queued grafter_run job -- there's no single triggering event for
// "check for replies", it's continuous background polling of every 'sent'
// outreach thread across every founder's idea. Keeps the same "Postgres is
// enough, no Redis, no external scheduler" spirit as queue.ts without
// forcing this into that job model, since nothing here is a one-off task
// with a start and an end.
//
// A reply does NOT auto-suppress future outreach to that contact -- GRF-25's
// opt-out stays a separate, explicit founder action. A reply might be
// genuine interest, not a request to stop.

interface SentOutreachRow {
  id: string;
  gmail_thread_id: string;
  user_id: string;
}

export async function checkForReplies(): Promise<void> {
  const sent = await query<SentOutreachRow>(
    `SELECT o.id, o.gmail_thread_id, i.user_id
     FROM grafter_outreach o
     JOIN ideas i ON i.id = o.idea_id
     JOIN users u ON u.id = i.user_id
     WHERE o.status = 'sent' AND o.gmail_thread_id IS NOT NULL
       -- skip mailboxes connected before gmail.metadata was requested;
       -- they'd 403 every sweep until the founder reconnects
       AND (' ' || COALESCE(u.gmail_scopes, '') || ' ') LIKE '% ' || $1 || ' %'`,
    [GMAIL_METADATA_SCOPE]
  );

  for (const row of sent.rows) {
    try {
      const replied = await threadHasReply(row.user_id, row.gmail_thread_id);
      if (!replied) continue;
      await query(
        `UPDATE grafter_outreach SET status = 'replied', replied_at = NOW() WHERE id = $1 AND status = 'sent'`,
        [row.id]
      );
      console.log(`[grafter/replyDetection] outreach ${row.id} marked replied`);
    } catch (err) {
      // One bad thread (revoked token, deleted thread, transient Gmail API
      // error) must never stop the sweep from checking the rest.
      console.error(
        `[grafter/replyDetection] failed checking outreach ${row.id}:`,
        err instanceof Error ? err.message : err
      );
    }
  }
}
