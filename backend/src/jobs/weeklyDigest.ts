import { query } from '../db';
import { sendWeeklyDigestEmail } from '../utils/mailer';

type Stage = 'idea' | 'hone' | 'validate' | 'shape' | 'done';

interface DigestUser {
  id: string;
  name: string;
  email: string;
  current_stage: Stage;
  idea_name: string | null;
  idea_stage: Stage | null;
}

export async function runWeeklyDigest(): Promise<void> {
  console.log('[weeklyDigest] Starting weekly digest job...');

  try {
    // All non-admin users who have email notifications enabled, with their active idea
    const result = await query<DigestUser>(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.current_stage,
        i.name      AS idea_name,
        i.stage     AS idea_stage
      FROM users u
      LEFT JOIN ideas i ON i.user_id = u.id AND i.is_active = TRUE
      WHERE COALESCE(u.email_notifications, TRUE) = TRUE
        AND COALESCE(u.is_admin, FALSE) = FALSE
    `);

    const users = result.rows;
    console.log(`[weeklyDigest] Sending to ${users.length} user(s)`);

    for (const user of users) {
      try {
        // Count stage_entries touches in the last 7 days for this user
        const activityResult = await query<{ count: string }>(
          `SELECT COUNT(*) AS count
           FROM stage_entries
           WHERE user_id = $1
             AND updated_at >= NOW() - INTERVAL '7 days'`,
          [user.id]
        );
        const entriesThisWeek = parseInt(activityResult.rows[0]?.count ?? '0', 10);

        // Fire-and-forget per user so one failure doesn't block the rest
        await sendWeeklyDigestEmail({
          toEmail:         user.email,
          toName:          user.name,
          stage:           user.idea_stage ?? user.current_stage,
          ideaName:        user.idea_name,
          entriesThisWeek,
        });

        // Brief pause to stay within Gmail's send rate limit (~100/day on free tier)
        await new Promise(r => setTimeout(r, 300));
      } catch (userErr) {
        console.error(`[weeklyDigest] Failed for ${user.email}:`, userErr);
      }
    }

    console.log('[weeklyDigest] Done.');
  } catch (err) {
    console.error('[weeklyDigest] Job failed:', err);
  }
}
