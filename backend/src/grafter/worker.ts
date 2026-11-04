import { claimNextJob, markJobDone, markJobFailed, type QueuedJob } from './queue';
import { runProspectingJob } from './prospecting';
import { checkForReplies } from './replyDetection';

// ── grafter-worker (GRF-16) ───────────────────────────────────────────────────
//
// Standalone process, its own container (docker-compose.yml's grafter-worker
// service) — separate from the `backend` API process, so a slow prospecting
// run never ties up a request-handling thread. Polls grafter_run for
// 'queued' rows and claims one at a time via queue.ts's
// SELECT ... FOR UPDATE SKIP LOCKED, which is the whole "Postgres IS the
// queue, no Redis" decision from the architecture review.
//
// No job kind is registered yet — GRF-18 (the prospecting job itself) is
// still blocked on picking a real company-discovery data source (see the
// PRD's Sprint 0 decisions, GRF-2, never actually answered). This process
// runs today so the plumbing exists and can be verified end-to-end (enqueue
// -> claim -> done/failed), but it has nothing to *do* until a handler for
// 'prospecting' is registered below.

const POLL_INTERVAL_MS = 3000;

// GRF-27: how often to sweep every 'sent' outreach thread for a reply.
// Independent of the job poll loop above -- this isn't a grafter_run job,
// it's a standing background check. 5 minutes is frequent enough to feel
// responsive to a founder without hammering Gmail's API across every
// connected mailbox on every tick.
const REPLY_CHECK_INTERVAL_MS = 5 * 60 * 1000;

type JobHandler = (job: QueuedJob) => Promise<unknown>;

const handlers: Record<string, JobHandler> = {
  prospecting: runProspectingJob,
};

async function processJob(job: QueuedJob): Promise<void> {
  const handler = handlers[job.kind];
  if (!handler) {
    await markJobFailed(job.id, `No worker handler registered for job kind "${job.kind}"`);
    return;
  }
  try {
    const output = await handler(job);
    await markJobDone(job.id, output);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Job failed';
    await markJobFailed(job.id, message);
  }
}

async function pollLoop(): Promise<void> {
  console.log(`[grafter-worker] started, polling every ${POLL_INTERVAL_MS}ms`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const job = await claimNextJob();
      if (job) {
        console.log(`[grafter-worker] claimed ${job.kind} job ${job.id} (idea ${job.idea_id})`);
        await processJob(job);
      } else {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    } catch (err) {
      console.error('[grafter-worker] poll error:', err);
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}

if (require.main === module) {
  pollLoop();
  setInterval(() => {
    checkForReplies().catch(err => console.error('[grafter-worker] reply-check sweep failed:', err));
  }, REPLY_CHECK_INTERVAL_MS);
}
