-- Per-date availability overrides, layered on top of the recurring weekly
-- pattern in availability_rules. When a date has been explicitly customized
-- (tracked via availability_override_dates), its windows in
-- availability_overrides *completely replace* the recurring pattern for that
-- one date -- including having zero window rows, which means "explicitly
-- blocked, don't fall back to the weekly pattern." A date with no row in
-- availability_override_dates simply uses the day-of-week recurring pattern,
-- unchanged from before this migration.

CREATE TABLE IF NOT EXISTS availability_override_dates (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date    DATE NOT NULL,
  PRIMARY KEY (user_id, date)
);

CREATE TABLE IF NOT EXISTS availability_overrides (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time   TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_availability_overrides_user_date ON availability_overrides(user_id, date);
