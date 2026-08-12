// Computes open booking slots from a founder's recurring weekly availability
// rules, minus already-booked meetings, honoring notice/buffer/window settings.
//
// No timezone library dependency (nothing like luxon/moment-timezone is
// installed, and adding one would mean the user has to rebuild the backend
// Docker image before this works) — timezone conversion is done with the
// native Intl API instead, which has full ICU support built into Node.

export type AvailabilityRule = { day_of_week: number; start_time: string; end_time: string }; // start/end as 'HH:MM' or 'HH:MM:SS'
export type AvailabilitySettings = {
  timezone: string;
  min_notice_hours: number;
  booking_window_days: number;
  buffer_mins: number;
};
export type BusyRange = { start: Date; end: Date };

// A per-date override window (date as 'YYYY-MM-DD'). When a date is present in
// the `overriddenDates` set passed to computeOpenSlots, that date's windows in
// `overrides` completely replace the recurring day-of-week pattern for that one
// date -- including having zero matching windows, which means 'explicitly
// blocked, do not fall back to the weekly pattern.'
export type AvailabilityOverrideWindow = { date: string; start_time: string; end_time: string };

// Offset (in minutes) such that: local wall-clock = UTC + offset, for the
// instant `date` in the given IANA timezone.
function tzOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const asUTC = Date.UTC(
    Number(map.year), Number(map.month) - 1, Number(map.day),
    Number(map.hour), Number(map.minute), Number(map.second)
  );
  return (asUTC - date.getTime()) / 60000;
}

// Converts a wall-clock date+time (year/month/day/hour/minute, 1-indexed month)
// in `timeZone` into the actual UTC instant it represents. Converges in at
// most 2 passes for real-world timezones (including DST transitions).
export function zonedTimeToUtc(y: number, m: number, d: number, hh: number, mm: number, timeZone: string): Date {
  let guess = Date.UTC(y, m - 1, d, hh, mm, 0);
  for (let i = 0; i < 2; i++) {
    const offset = tzOffsetMinutes(new Date(guess), timeZone);
    const desired = Date.UTC(y, m - 1, d, hh, mm, 0) - offset * 60000;
    if (desired === guess) break;
    guess = desired;
  }
  return new Date(guess);
}

// day_of_week (0=Sunday..6=Saturday) and Y/M/D of `instant`, as seen in `timeZone`.
function zonedDateParts(instant: Date, timeZone: string): { y: number; m: number; d: number; dow: number } {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  });
  const parts = dtf.formatToParts(instant);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    y: Number(map.year), m: Number(map.month), d: Number(map.day),
    dow: WEEKDAYS.indexOf(map.weekday),
  };
}

function parseHHMM(t: string): { h: number; m: number } {
  const [h, m] = t.split(':').map(Number);
  return { h, m: m || 0 };
}

const SLOT_GRID_MINS = 15; // candidate slot starts are offered on a 15-min grid

/**
 * Returns candidate open slot start times (UTC Date objects), each `durationMins`
 * long, derived from the founder's weekly `rules` + `settings`, excluding any
 * that overlap `busy` (already-booked meetings, with `buffer_mins` padding on
 * both sides) or fall inside the `min_notice_hours` window from `now`.
 */
export function computeOpenSlots({
  rules,
  settings,
  durationMins,
  busy,
  now = new Date(),
  overriddenDates = new Set<string>(),
  overrides = [],
}: {
  rules: AvailabilityRule[];
  settings: AvailabilitySettings;
  durationMins: number;
  busy: BusyRange[];
  now?: Date;
  // Dates ('YYYY-MM-DD') that have an explicit override -- see
  // AvailabilityOverrideWindow above for what "explicit" means for a blocked day.
  overriddenDates?: Set<string>;
  overrides?: AvailabilityOverrideWindow[];
}): Date[] {
  if (!rules.length && overriddenDates.size === 0) return [];

  const tz = settings.timezone || 'UTC';
  const earliestStart = new Date(now.getTime() + settings.min_notice_hours * 3600_000);
  const windowEnd = new Date(now.getTime() + settings.booking_window_days * 86_400_000);
  const bufferMs = settings.buffer_mins * 60_000;

  const rulesByDow = new Map<number, AvailabilityRule[]>();
  for (const r of rules) {
    if (!rulesByDow.has(r.day_of_week)) rulesByDow.set(r.day_of_week, []);
    rulesByDow.get(r.day_of_week)!.push(r);
  }

  const overridesByDate = new Map<string, AvailabilityOverrideWindow[]>();
  for (const o of overrides) {
    if (!overridesByDate.has(o.date)) overridesByDate.set(o.date, []);
    overridesByDate.get(o.date)!.push(o);
  }

  const slots: Date[] = [];

  // Walk each calendar day (in the founder's timezone) inside the booking window.
  for (let cursor = new Date(now); cursor.getTime() <= windowEnd.getTime(); cursor = new Date(cursor.getTime() + 86_400_000)) {
    const { y, m, d, dow } = zonedDateParts(cursor, tz);
    const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayRules: { start_time: string; end_time: string }[] = overriddenDates.has(dateKey)
      ? (overridesByDate.get(dateKey) || [])
      : (rulesByDow.get(dow) || []);
    if (!dayRules.length) continue;

    for (const rule of dayRules) {
      const start = parseHHMM(rule.start_time);
      const end = parseHHMM(rule.end_time);
      const windowStartUtc = zonedTimeToUtc(y, m, d, start.h, start.m, tz);
      const windowEndUtc = zonedTimeToUtc(y, m, d, end.h, end.m, tz);

      for (
        let slotStart = windowStartUtc.getTime();
        slotStart + durationMins * 60_000 <= windowEndUtc.getTime();
        slotStart += SLOT_GRID_MINS * 60_000
      ) {
        const slotEnd = slotStart + durationMins * 60_000;
        if (slotStart < earliestStart.getTime()) continue;

        const overlapsBusy = busy.some(b =>
          slotStart < b.end.getTime() + bufferMs && slotEnd > b.start.getTime() - bufferMs
        );
        if (overlapsBusy) continue;

        slots.push(new Date(slotStart));
      }
    }
  }

  slots.sort((a, b) => a.getTime() - b.getTime());
  return slots;
}
