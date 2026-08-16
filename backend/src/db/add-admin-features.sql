-- ── Admin features migration ─────────────────────────────────────────────────

-- 1. Admin flag on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Idea moderation status
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'pending'
  CHECK (moderation_status IN ('pending', 'approved', 'rejected'));

-- Grandfather ALL existing ideas as approved so the community feed doesn't break
UPDATE ideas SET moderation_status = 'approved' WHERE moderation_status = 'pending';

-- 3. Post moderation status
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'visible'
  CHECK (moderation_status IN ('visible', 'flagged', 'approved', 'rejected', 'held'));
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS flag_reason TEXT;

-- 4. Create a default admin user (change the password hash as needed)
--    Password for below hash is: admin123  (bcrypt, 10 rounds)
-- Older installs created this admin on the .com address; rename it to the real
-- domain rather than leaving two admin rows. Guarded against the unique index.
UPDATE users SET email = 'admin@mvpclub.io'
 WHERE email = 'admin@mvpclub.com'
   AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@mvpclub.io');
DELETE FROM users
 WHERE email = 'admin@mvpclub.com'
   AND EXISTS (SELECT 1 FROM users WHERE email = 'admin@mvpclub.io');

INSERT INTO users (email, password_hash, name, current_stage, avatar_initials, is_admin)
VALUES (
  'admin@mvpclub.io',
  '$2b$12$o/LBOOH2DD6Ag0PHjPiEG.I.2OOUBXqwKncwFSb72QXGiXKF/Oy.q', -- "password" bcrypt hash - CHANGE IN PROD
  'MVP Club Admin',
  'idea',
  'AD',
  TRUE
)
ON CONFLICT (email) DO UPDATE SET is_admin = TRUE;

-- To make any existing user an admin:
-- UPDATE users SET is_admin = TRUE WHERE email = 'your@email.com';
