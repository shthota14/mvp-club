import { query } from '../db';
import { sendReEngagementEmail } from '../utils/mailer';

type Stage = 'idea' | 'hone' | 'validate' | 'shape' | 'done';
type ReEngagementDay = 3 | 7 | 14;

interface InactiveUser {
  id: string;
  name: string;
  email: string;
  stage: Stage;
  idea_name: string | null;
  days_since_activity: number;
}

/**
 * Finds users whose last stage_entry falls within a 3, 7, or 14-day inactivity
 * window (±12 hours) and sends the matching re-engagement email variant.
 *
 * Runs daily. The ±12h window ensures each user receives at most one email per
 * threshold even if the cron fires slightly off-schedule.
 */
export async function runReEngagement(): Promise<void> {
  console.log('[reEngagement] Starting re-engagement job...');

  try {
    // Find non-admin users with email notifications on who have an active idea
    // and whose last stage_entry is approximately 3, 7, or 14 days ago.
    const result = await query<InactiveUser>(`
      SELECT
        u.id,
        u.name,
        u.email,
        COALESCE(i.stage, u.current_stage) AS stage,
        i.name                              AS idea_name,
        EXTRACT(DAY FROM NOW() - MAX(se.updated_at))::int AS days_since_activity
      FROM users u
      LEFT JOIN ideas i
        ON i.user_id = u.id AND i.is_active = TRUE
      LEFT JOIN stage_entries se
        ON se.user_id = u.id
      WHERE COALESCE(u.email_notifications, TRUE) = TRUE
        AND COALESCE(u.is_admin, FALSE) = FALSE
        AND i.id IS NOT NULL
      GROUP BY u.id, u.name, u.email, u.current_stage, i.stage, i.name
      HAVING
        -- Has at least one stage entry (started the journey)
        COUNT(se.id) > 0
        AND (
          -- Day 3 window: 2.5–3.5 days ago
          EXTRACT(EPOCH FROM (NOW() - MAX(se.updated_at))) BETWEEN 216000 AND 302400
          OR
          -- Day 7 window: 6.5–7.5 days ago
          EXTRACT(EPOCH FROM (NOW() - MAX(se.updated_at))) BETWEEN 561600 AND 648000
          OR
          -- Day 14 window: 13.5–14.5 days ago
          EXTRACT(EPOCH FROM (NOW() - MAX(se.updated_at))) BETWEEN 1166400 AND 1252800
        )
    `);

    const users = result.rows;
    console.log(`[reEngagement] Found ${users.length} user(s) to re-engage`);

    for (const user of users) {
      try {
        // Map days to the nearest threshold
        const days = user.days_since_activity;
        let variant: ReEngagementDay;
        if (days <= 4)       variant = 3;
        else if (days <= 10) variant = 7;
        else                 variant = 14;

        await sendReEngagementEmail({
          toEmail:               user.email,
          toName:                user.name,
          stage:                 user.stage,
          ideaName:              user.idea_name,
          daysSinceLastActivity: variant,
        });

        // Respect Gmail's send rate limit
        await new Promise(r => setTimeout(r, 300));
      } catch (userErr) {
        console.error(`[reEngagement] Failed for ${user.email}:`, userErr);
      }
    }

    console.log('[reEngagement] Done.');
  } catch (err) {
    console.error('[reEngagement] Job failed:', err);
  }
}
