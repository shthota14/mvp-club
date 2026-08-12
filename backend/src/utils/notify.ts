import { query } from '../db';
import { sendNotificationEmail } from './mailer';

export type NotificationType =
  | 'new_post'
  | 'new_comment'
  | 'encourage'
  | 'network_offer'
  | 'new_reply';

// Encourages are high-volume — skip emailing those
const EMAIL_ELIGIBLE: NotificationType[] = [
  'new_post', 'new_comment', 'new_reply', 'network_offer',
];

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string | null,
  link: string | null
): Promise<void> {
  try {
    // 1. Insert in-app notification
    await query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, body, link]
    );

    // 2. Optionally send email — only for email-eligible types
    if (EMAIL_ELIGIBLE.includes(type)) {
      const userResult = await query<{
        email: string;
        name: string;
        email_notifications: boolean;
      }>(
        `SELECT email, name, COALESCE(email_notifications, TRUE) AS email_notifications
         FROM users WHERE id = $1`,
        [userId]
      );

      const user = userResult.rows[0];
      if (user?.email_notifications) {
        // Fire-and-forget — a failed email must never affect the main action
        sendNotificationEmail({
          toEmail: user.email,
          toName:  user.name,
          type,
          title,
          body,
          link,
        }).catch(err => console.error('[notify] Email send failed:', err));
      }
    }
  } catch (err) {
    // Notifications are non-critical — log but never throw
    console.error('[notify] Failed to create notification:', err);
  }
}
