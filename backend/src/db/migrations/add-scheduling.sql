-- Outreach scheduling: structured contact details, founder weekly availability,
-- and public slot-booking (a "meeting request" is an interviews row that starts
-- unscheduled with a public booking_token; confirming a slot fills in
-- scheduled_at/meeting_link the same way book-meeting already does manually).

-- Structured contact details (email/phone/LinkedIn), replacing reliance on the
-- single free-text `contact` field for anything that needs to actually send mail.
ALTER TABLE validation_contacts
  ADD COLUMN IF NOT EXISTS email        TEXT,
  ADD COLUMN IF NOT EXISTS phone        TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Founder's recurring weekly availability (one row per open window per day).
CREATE TABLE IF NOT EXISTS availability_rules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week  INT  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_availability_rules_user ON availability_rules(user_id);

-- Per-user booking defaults.
CREATE TABLE IF NOT EXISTS availability_settings (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  timezone             TEXT NOT NULL DEFAULT 'UTC',
  min_notice_hours     INT  NOT NULL DEFAULT 12,
  booking_window_days  INT  NOT NULL DEFAULT 14,
  buffer_mins          INT  NOT NULL DEFAULT 10,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Booking fields on interviews.
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS booking_token         TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS booking_status        TEXT NOT NULL DEFAULT ''
              CHECK (booking_status IN ('', 'awaiting_response', 'booked', 'expired')),
  ADD COLUMN IF NOT EXISTS duration_mins         INT NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS validation_contact_id UUID REFERENCES validation_contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_interviews_validation_contact ON interviews(validation_contact_id);
CREATE INDEX IF NOT EXISTS idx_interviews_booking_token       ON interviews(booking_token);
