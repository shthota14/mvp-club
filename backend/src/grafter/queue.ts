import { query, getClient } from '../db';

// -- Postgres-backed queue (GRF-16) -------------------------------------------
//
// Per the architecture review's recommendation: no Redis, no separate queue
// service -- grafter_run IS the queue. A job is enqueued as a 'queued' row;
// grafter-worker (worker.ts) claims one at a time with
// SELECT ... FOR UPDATE SKIP LOCKED so two worker processes (or two poll
// ticks) never double-process the same row.
//
// Sprint 1's jobs (fetch_site, brain_build) still run inline via
// runGrafterJob in researchGateway.ts -- they're fast enough not to need a
// worker. This queue exists for Sprint 2's prospecting job, which is slow
// enough to be worth running out-of-request.

export interface QueuedJob {
  id: string;
  idea_id: string;
  kind: string;
  input: Record<string, unknown> | null;
}

export async function enqueueGrafterJob(
  ideaId: string,
  kind: string,
  input: Record<string, unknown>
): Promise<string> {
  const result = await query<{ id: string }>(
    `INSERT INTO grafter_run (idea_id, kind, status, input) VALUES ($1, $2, 'queued', $3) RETURNING id`,
    [ideaId, kind, JSON.stringify(input)]
  );
  return result.rows[0].id;
}

// Claims the oldest queued job, if any, and marks it 'running' inside the
// same transaction as the claim -- this is the "no double-processing" half
// of GRF-16's AC. Returns null when the queue is empty.
export async function claimNextJob(): Promise<QueuedJob | null> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query<QueuedJob>(
      `SELECT id, idea_id, kind, input FROM grafter_run
       WHERE status = 'queued' ORDER BY started_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`
    );
    const job = result.rows[0];
    if (!job) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query(`UPDATE grafter_run SET status = 'running' WHERE id = $1`, [job.id]);
    await client.query('COMMIT');
    return job;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function markJobDone(id: string, output: unknown): Promise<void> {
  await query(
    `UPDATE grafter_run SET status = 'done', output = $2, finished_at = NOW() WHERE id = $1`,
    [id, JSON.stringify(output ?? {})]
  );
}

export async function markJobFailed(id: string, error: string): Promise<void> {
  await query(
    `UPDATE grafter_run SET status = 'failed', error = $2, finished_at = NOW() WHERE id = $1`,
    [id, error]
  );
}
