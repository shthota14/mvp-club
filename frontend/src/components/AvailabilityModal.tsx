import { useState, useEffect, useRef, useMemo, Fragment, TouchEvent as ReactTouchEvent, CSSProperties } from 'react';
import { availabilityApi } from '@/api/client';

const T1 = '#1d1d1f'; const T2 = '#6e6e73'; const T3 = '#b0b0b8'; const BORDER = '#e5e5ea';

const DAYS = [
  { i: 0, label: 'Sun' }, { i: 1, label: 'Mon' }, { i: 2, label: 'Tue' }, { i: 3, label: 'Wed' },
  { i: 4, label: 'Thu' }, { i: 5, label: 'Fri' }, { i: 6, label: 'Sat' },
];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const FALLBACK_TZ = [
  'UTC',
  'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York', 'America/Sao_Paulo',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Africa/Cairo', 'Africa/Johannesburg',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Kathmandu', 'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Shanghai', 'Asia/Tokyo',
  'Asia/Seoul', 'Asia/Singapore', 'Australia/Sydney', 'Australia/Perth', 'Pacific/Auckland',
];
const TZ_LIST: string[] = (() => {
  try {
    const fn = (Intl as any).supportedValuesOf;
    if (typeof fn === 'function') return fn('timeZone');
  } catch { /* fall through to the curated list below */ }
  return FALLBACK_TZ;
})();

// ── Drag-to-select half-hour grid, shared by the weekly pattern and the
// calendar's week view ──────────────────────────────────────────────────────
// Half-hour cells from 6:00am to 10:00pm. Each cell is independently
// paintable, so a day can end up with more than one open block (e.g. 9-11am
// and 4-6pm) -- the backend stores availability as a flat list of
// (day-or-date, start, end) rows with no per-day uniqueness constraint.
const GRID_START_HOUR = 6;
const GRID_END_HOUR = 22;
const SLOT_MINS = 30;
const SLOTS_PER_DAY = ((GRID_END_HOUR - GRID_START_HOUR) * 60) / SLOT_MINS; // 32

function slotToTime(slot: number): string {
  const mins = GRID_START_HOUR * 60 + slot * SLOT_MINS;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function timeToSlot(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return Math.round(((h || 0) * 60 + (m || 0) - GRID_START_HOUR * 60) / SLOT_MINS);
}
function cellKey(day: number, slot: number) { return `${day}-${slot}`; }
function slotLabel(slot: number): string {
  const mins = GRID_START_HOUR * 60 + slot * SLOT_MINS;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12}${h24 < 12 ? 'a' : 'p'}` : '';
}
function slotsToWindows(slots: Set<number>): { start_time: string; end_time: string }[] {
  const result: { start_time: string; end_time: string }[] = [];
  let blockStart: number | null = null;
  for (let slot = 0; slot <= SLOTS_PER_DAY; slot++) {
    const on = slot < SLOTS_PER_DAY && slots.has(slot);
    if (on && blockStart === null) blockStart = slot;
    if (!on && blockStart !== null) {
      result.push({ start_time: slotToTime(blockStart), end_time: slotToTime(slot) });
      blockStart = null;
    }
  }
  return result;
}
function weekdaySlots(cells: Set<string>, weekday: number): Set<number> {
  const s = new Set<number>();
  for (let slot = 0; slot < SLOTS_PER_DAY; slot++) if (cells.has(cellKey(weekday, slot))) s.add(slot);
  return s;
}

// ── Real-calendar date helpers (no library -- native Date + Intl only) ─────
function pad2(n: number) { return String(n).padStart(2, '0'); }
function dateKeyOf(d: Date): string { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function parseDateKey(k: string): Date { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function startOfWeek(d: Date): Date { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - x.getDay()); return x; }
function startOfMonthGrid(d: Date): Date { return startOfWeek(new Date(d.getFullYear(), d.getMonth(), 1)); }
function sameDate(a: Date, b: Date): boolean { return dateKeyOf(a) === dateKeyOf(b); }

// Offset (in minutes) such that: local wall-clock = UTC + offset, for the
// instant `date` in the given IANA timezone. Mirrors the backend's
// tzOffsetMinutes in backend/src/utils/availability.ts -- kept independent
// (no shared package between frontend/backend in this repo) but must stay in
// sync with it conceptually.
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
function formatOffsetLabel(tz: string): string {
  const mins = tzOffsetMinutes(new Date(), tz);
  const sign = mins >= 0 ? '+' : '-';
  const abs = Math.abs(mins);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

// Shifts a (weekday, slot) cell by `diffMinutes` of wall-clock time, wrapping
// across day boundaries. Used when the timezone changes, to preserve the same
// underlying moments rather than the same wall-clock numbers. Returns
// slot === -1 when the shifted moment falls outside the visible 6am-10pm grid.
function shiftSlot(weekday: number, slot: number, diffMinutes: number): { weekday: number; slot: number; dayOffset: number } {
  const minuteOfDay = GRID_START_HOUR * 60 + slot * SLOT_MINS;
  const total = weekday * 1440 + minuteOfDay + diffMinutes;
  const dayIndex = Math.floor(total / 1440);
  const newWeekday = ((dayIndex % 7) + 7) % 7;
  const newMinuteOfDay = ((total % 1440) + 1440) % 1440;
  const rawSlot = Math.round((newMinuteOfDay - GRID_START_HOUR * 60) / SLOT_MINS);
  const slotInView = rawSlot >= 0 && rawSlot < SLOTS_PER_DAY;
  return { weekday: newWeekday, slot: slotInView ? rawSlot : -1, dayOffset: dayIndex - weekday };
}

interface Props {
  accentColor: string;
  onClose: () => void;
}

export default function AvailabilityModal({ accentColor, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [tab, setTab] = useState<'weekly' | 'calendar'>('weekly');
  const [calView, setCalView] = useState<'week' | 'month'>('week');
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const today = useMemo(() => new Date(), []);

  // Recurring weekly pattern (day-of-week + slot, no real dates).
  const [cells, setCells] = useState<Set<string>>(new Set());

  // Per-date overrides ('YYYY-MM-DD' -> set of open slots). A date present in
  // `overriddenDateSet` but with an empty slot set is explicitly blocked --
  // that's different from a date simply not being in the set at all (which
  // falls back to the weekly pattern above).
  const [overrideCells, setOverrideCells] = useState<Record<string, Set<number>>>({});
  const [overriddenDateSet, setOverriddenDateSet] = useState<Set<string>>(new Set());
  const [dirtyDates, setDirtyDates] = useState<Set<string>>(new Set());
  const [dateSaving, setDateSaving] = useState<string | null>(null);
  const [dateSavedFlash, setDateSavedFlash] = useState<string | null>(null);
  const overrideCellsRef = useRef(overrideCells);
  const overriddenDateSetRef = useRef(overriddenDateSet);
  const dirtyDatesRef = useRef(dirtyDates);
  useEffect(() => { overrideCellsRef.current = overrideCells; }, [overrideCells]);
  useEffect(() => { overriddenDateSetRef.current = overriddenDateSet; }, [overriddenDateSet]);
  useEffect(() => { dirtyDatesRef.current = dirtyDates; }, [dirtyDates]);

  const draggingRef = useRef(false);
  const dragKindRef = useRef<'weekly' | 'date' | null>(null);
  const dragDateRef = useRef<string | null>(null);
  const dragModeRef = useRef<'add' | 'remove' | null>(null);

  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [minNoticeHours, setMinNoticeHours] = useState(12);
  const [bookingWindowDays, setBookingWindowDays] = useState(14);
  const [bufferMins, setBufferMins] = useState(10);

  useEffect(() => {
    availabilityApi.get()
      .then(r => {
        const { rules, settings } = r.data;
        if (settings) {
          setTimezone(settings.timezone || timezone);
          setMinNoticeHours(settings.min_notice_hours ?? 12);
          setBookingWindowDays(settings.booking_window_days ?? 14);
          setBufferMins(settings.buffer_mins ?? 10);
        }
        if (Array.isArray(rules) && rules.length) {
          setCells(prev => {
            const next = new Set(prev);
            for (const r of rules) {
              const day = r.day_of_week;
              const s = Math.max(0, timeToSlot((r.start_time || '09:00').slice(0, 5)));
              const e = Math.min(SLOTS_PER_DAY, timeToSlot((r.end_time || '17:00').slice(0, 5)));
              for (let i = s; i < e; i++) next.add(cellKey(day, i));
            }
            return next;
          });
        }
      })
      .catch((e: any) => setError(e?.response?.data?.error || "Couldn't load your availability."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load per-date overrides for whichever range the Calendar tab currently
  // shows. Never clobbers a date the user has already edited this session
  // (tracked via dirtyDatesRef) -- those win until they're saved or reset.
  const weekStart = startOfWeek(anchorDate);
  const weekStartKey = dateKeyOf(weekStart);
  const monthKey = `${anchorDate.getFullYear()}-${anchorDate.getMonth()}`;
  useEffect(() => {
    if (tab !== 'calendar') return;
    const rangeStart = calView === 'week' ? weekStart : startOfMonthGrid(anchorDate);
    const rangeEnd = calView === 'week' ? addDays(weekStart, 6) : addDays(rangeStart, 41);
    availabilityApi.getOverrides(dateKeyOf(rangeStart), dateKeyOf(rangeEnd))
      .then(r => {
        const od: string[] = r.data?.overriddenDates || [];
        const ov: { date: string; start_time: string; end_time: string }[] = r.data?.overrides || [];
        setOverriddenDateSet(prev => {
          const next = new Set(prev);
          od.forEach(d => next.add(d));
          return next;
        });
        const grouped: Record<string, Set<number>> = {};
        od.forEach(d => { grouped[d] = new Set<number>(); });
        ov.forEach(w => {
          if (!grouped[w.date]) grouped[w.date] = new Set<number>();
          const s = Math.max(0, timeToSlot((w.start_time || '').slice(0, 5)));
          const e = Math.min(SLOTS_PER_DAY, timeToSlot((w.end_time || '').slice(0, 5)));
          for (let i = s; i < e; i++) grouped[w.date].add(i);
        });
        setOverrideCells(prev => {
          const next = { ...prev };
          for (const d of Object.keys(grouped)) {
            if (!dirtyDatesRef.current.has(d)) next[d] = grouped[d];
          }
          return next;
        });
      })
      .catch((e: any) => {
        if (e?.response?.status === 503) setError(e.response.data?.error || "Per-date overrides aren't set up on the server yet.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, calView, weekStartKey, monthKey]);

  // End a drag no matter where the pointer is released -- including outside the grid.
  useEffect(() => {
    const stop = () => {
      if (draggingRef.current && dragKindRef.current === 'date' && dragDateRef.current) {
        saveDateOverride(dragDateRef.current);
      }
      draggingRef.current = false;
      dragKindRef.current = null;
      dragDateRef.current = null;
      dragModeRef.current = null;
    };
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchend', stop);
    window.addEventListener('touchcancel', stop);
    return () => {
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchend', stop);
      window.removeEventListener('touchcancel', stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Weekly pattern painting (unchanged model: day-of-week + slot) ────────
  const paintCell = (day: number, slot: number, mode: 'add' | 'remove') => {
    setCells(prev => {
      const key = cellKey(day, slot);
      const has = prev.has(key);
      if (mode === 'add' && has) return prev;
      if (mode === 'remove' && !has) return prev;
      const next = new Set(prev);
      if (mode === 'add') next.add(key); else next.delete(key);
      return next;
    });
    setSaved(false);
  };
  const handleCellDown = (day: number, slot: number) => {
    const mode: 'add' | 'remove' = cells.has(cellKey(day, slot)) ? 'remove' : 'add';
    draggingRef.current = true;
    dragKindRef.current = 'weekly';
    dragModeRef.current = mode;
    paintCell(day, slot, mode);
  };
  const handleCellEnter = (day: number, slot: number) => {
    if (!draggingRef.current || dragKindRef.current !== 'weekly' || !dragModeRef.current) return;
    paintCell(day, slot, dragModeRef.current);
  };
  const handleTouchMove = (e: ReactTouchEvent) => {
    if (!draggingRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
    const day = el?.dataset?.day;
    const slot = el?.dataset?.slot;
    const date = el?.dataset?.date;
    if (date !== undefined && date !== null && slot !== undefined && slot !== null) {
      handleWeekViewCellEnter(date, Number(slot));
    } else if (day !== undefined && slot !== undefined && day !== null && slot !== null) {
      handleCellEnter(Number(day), Number(slot));
    }
  };

  const clearDay = (day: number) => {
    setCells(prev => {
      const next = new Set(prev);
      for (let s = 0; s < SLOTS_PER_DAY; s++) next.delete(cellKey(day, s));
      return next;
    });
    setSaved(false);
  };
  const clearAll = () => { setCells(new Set()); setSaved(false); };

  const cellsToRules = (): { day_of_week: number; start_time: string; end_time: string }[] => {
    const result: { day_of_week: number; start_time: string; end_time: string }[] = [];
    for (let day = 0; day < 7; day++) {
      const windows = slotsToWindows(weekdaySlots(cells, day));
      for (const w of windows) result.push({ day_of_week: day, ...w });
    }
    return result;
  };

  const handleSaveWeekly = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const rules = cellsToRules();
      await availabilityApi.save({
        rules, timezone,
        min_notice_hours: minNoticeHours,
        booking_window_days: bookingWindowDays,
        buffer_mins: bufferMins,
      });
      setSaved(true);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Couldn't save -- please try again.");
    } finally {
      setSaving(false);
    }
  };

  const anyEnabled = cells.size > 0;
  const totalHours = (cells.size * SLOT_MINS) / 60;
  const dayHasCells = (day: number) => weekdaySlots(cells, day).size > 0;

  // ── Calendar tab: per-date override painting ──────────────────────────────
  const ensureDateSeeded = (date: string, weekday: number) => {
    setOverrideCells(prev => {
      if (prev[date]) return prev;
      return { ...prev, [date]: weekdaySlots(cells, weekday) };
    });
    setOverriddenDateSet(prev => {
      if (prev.has(date)) return prev;
      const next = new Set(prev);
      next.add(date);
      return next;
    });
  };
  const paintDateCell = (date: string, slot: number, mode: 'add' | 'remove') => {
    setOverrideCells(prev => {
      const set = new Set(prev[date] || []);
      if (mode === 'add') set.add(slot); else set.delete(slot);
      return { ...prev, [date]: set };
    });
    setDirtyDates(prev => { const n = new Set(prev); n.add(date); return n; });
  };
  const handleWeekViewCellDown = (date: string, weekday: number, slot: number) => {
    const currentlyOn = overrideCells[date] ? overrideCells[date].has(slot) : cells.has(cellKey(weekday, slot));
    const mode: 'add' | 'remove' = currentlyOn ? 'remove' : 'add';
    ensureDateSeeded(date, weekday);
    draggingRef.current = true;
    dragKindRef.current = 'date';
    dragDateRef.current = date;
    dragModeRef.current = mode;
    paintDateCell(date, slot, mode);
  };
  const handleWeekViewCellEnter = (date: string, slot: number) => {
    if (!draggingRef.current || dragKindRef.current !== 'date' || dragDateRef.current !== date || !dragModeRef.current) return;
    paintDateCell(date, slot, dragModeRef.current);
  };

  const saveDateOverride = async (date: string) => {
    const slots = overrideCellsRef.current[date] || new Set<number>();
    setDateSaving(date);
    try {
      await availabilityApi.saveOverride(date, slotsToWindows(slots));
      setDirtyDates(prev => { const n = new Set(prev); n.delete(date); return n; });
      setDateSavedFlash(date);
      setTimeout(() => setDateSavedFlash(cur => (cur === date ? null : cur)), 1500);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Couldn't save that date -- please try again.");
    } finally {
      setDateSaving(cur => (cur === date ? null : cur));
    }
  };
  const resetDate = async (date: string) => {
    setOverrideCells(prev => { const n = { ...prev }; delete n[date]; return n; });
    setOverriddenDateSet(prev => { const n = new Set(prev); n.delete(date); return n; });
    setDirtyDates(prev => { const n = new Set(prev); n.delete(date); return n; });
    setDateSaving(date);
    try {
      await availabilityApi.clearOverride(date);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Couldn't reset that date -- please try again.");
    } finally {
      setDateSaving(cur => (cur === date ? null : cur));
    }
  };
  const syncDirtyOverrides = async () => {
    const dates = Array.from(dirtyDatesRef.current);
    for (const d of dates) await saveDateOverride(d);
  };

  // ── Timezone: move painted cells to preserve the same underlying moments ──
  const handleTimezoneChange = (newTz: string) => {
    if (newTz === timezone) return;
    const ref = new Date(); ref.setHours(12, 0, 0, 0);
    const diff = tzOffsetMinutes(ref, newTz) - tzOffsetMinutes(ref, timezone);

    if (diff !== 0) {
      setCells(prev => {
        const next = new Set<string>();
        prev.forEach(key => {
          const [wStr, sStr] = key.split('-');
          const shifted = shiftSlot(Number(wStr), Number(sStr), diff);
          if (shifted.slot >= 0) next.add(cellKey(shifted.weekday, shifted.slot));
        });
        return next;
      });

      const nextOverrideCells: Record<string, Set<number>> = {};
      for (const [dstr, slots] of Object.entries(overrideCellsRef.current)) {
        const d = parseDateKey(dstr);
        const weekday = d.getDay();
        let dayDelta = 0;
        const shiftedSlots = new Set<number>();
        slots.forEach(slot => {
          const shifted = shiftSlot(weekday, slot, diff);
          dayDelta = shifted.dayOffset;
          if (shifted.slot >= 0) shiftedSlots.add(shifted.slot);
        });
        const newKey = dateKeyOf(addDays(d, dayDelta));
        nextOverrideCells[newKey] = nextOverrideCells[newKey]
          ? new Set([...nextOverrideCells[newKey], ...shiftedSlots])
          : shiftedSlots;
      }
      const refDelta = shiftSlot(ref.getDay(), 0, diff).dayOffset - shiftSlot(ref.getDay(), 0, 0).dayOffset;
      const nextOverriddenDates = new Set<string>();
      overriddenDateSetRef.current.forEach(dstr => {
        const shiftedKey = dateKeyOf(addDays(parseDateKey(dstr), refDelta));
        nextOverriddenDates.add(shiftedKey);
        if (!nextOverrideCells[shiftedKey]) nextOverrideCells[shiftedKey] = new Set();
      });

      setOverrideCells(nextOverrideCells);
      setOverriddenDateSet(nextOverriddenDates);
      setDirtyDates(new Set(Object.keys(nextOverrideCells)));
    }

    setTimezone(newTz);
    setSaved(false);
  };

  // ── Calendar navigation ────────────────────────────────────────────────────
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStartKey]);
  const monthDates = useMemo(() => {
    const start = startOfMonthGrid(anchorDate);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [monthKey]);
  const weekRangeLabel = (() => {
    const end = addDays(weekStart, 6);
    if (weekStart.getMonth() === end.getMonth()) {
      return `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()}–${end.getDate()}, ${weekStart.getFullYear()}`;
    }
    return `${MONTH_ABBR[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTH_ABBR[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  })();
  const goPrev = () => setAnchorDate(prev => (calView === 'week' ? addDays(prev, -7) : new Date(prev.getFullYear(), prev.getMonth() - 1, 1)));
  const goNext = () => setAnchorDate(prev => (calView === 'week' ? addDays(prev, 7) : new Date(prev.getFullYear(), prev.getMonth() + 1, 1)));
  const goToday = () => setAnchorDate(new Date());
  const resolvedSlotsForDate = (d: Date): Set<number> => {
    const key = dateKeyOf(d);
    return overriddenDateSet.has(key) ? (overrideCells[key] || new Set<number>()) : weekdaySlots(cells, d.getDay());
  };

  const tzOptions = TZ_LIST.includes(timezone) ? TZ_LIST : [timezone, ...TZ_LIST];
  const pillBtn = (active: boolean): CSSProperties => ({
    padding: '5px 12px', fontSize: 11.5, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    background: active ? accentColor : '#fff', color: active ? '#fff' : T2,
  });

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(9,9,20,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 501, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, pointerEvents: 'none' }}>
        <div style={{
          width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto',
          background: '#fff', borderRadius: 16, pointerEvents: 'all',
          boxShadow: '0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T1 }}>🗓️ Your availability</div>
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: T3, fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</button>
          </div>

          <div style={{ padding: '18px 20px' }}>
            {loading ? (
              <div style={{ fontSize: 12, color: T3, padding: '20px 0', textAlign: 'center' }}>Loading…</div>
            ) : (
              <>
                {error && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '8px 12px', fontSize: 12, marginBottom: 14 }}>{error}</div>
                )}

                {/* ── Timezone -- moved to the top and made explicit ── */}
                <div style={{ background: '#f5f5f7', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 12px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: T2, whiteSpace: 'nowrap' }}>🌐 Time zone</span>
                  <select
                    value={timezone}
                    onChange={e => handleTimezoneChange(e.target.value)}
                    style={{ padding: '5px 8px', borderRadius: 6, border: `1.5px solid ${BORDER}`, fontSize: 12.5, fontFamily: 'inherit', color: T1, background: '#fff' }}
                  >
                    {tzOptions.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                  <span style={{ fontSize: 11, color: T3 }}>
                    All times below are shown in <strong style={{ color: T2 }}>{timezone}</strong> ({formatOffsetLabel(timezone)}). Contacts always see times converted to their own time zone automatically.
                  </span>
                </div>

                {/* ── Tabs ── */}
                <div style={{ display: 'flex', border: `1.5px solid ${BORDER}`, borderRadius: 9, overflow: 'hidden', width: 'fit-content', marginBottom: 16 }}>
                  <button onClick={() => setTab('weekly')} style={{ ...pillBtn(tab === 'weekly'), borderRadius: 0 }}>Weekly pattern</button>
                  <button onClick={() => setTab('calendar')} style={{ ...pillBtn(tab === 'calendar'), borderRadius: 0, borderLeft: `1.5px solid ${BORDER}` }}>Calendar</button>
                </div>

                {tab === 'weekly' ? (
                  <>
                    <div style={{ fontSize: 12, color: T2, lineHeight: 1.6, marginBottom: 14 }}>
                      This repeats every week. Click a cell to open it, or click and drag across several. Use the <strong>Calendar</strong> tab to open extra hours or block off a single specific date.
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: accentColor }}>
                        {totalHours > 0 ? `${totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)} hrs/week open` : 'No open slots yet'}
                      </div>
                      {anyEnabled && (
                        <button onClick={clearAll} style={{ border: 'none', background: 'transparent', color: T3, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                          Clear all
                        </button>
                      )}
                    </div>

                    <div
                      onTouchMove={handleTouchMove}
                      style={{ userSelect: 'none', border: `1.5px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', marginBottom: 18 }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '34px repeat(7, 1fr)', background: '#fafafa', borderBottom: `1px solid ${BORDER}` }}>
                        <div />
                        {DAYS.map(d => (
                          <div key={d.i} style={{ textAlign: 'center', padding: '6px 2px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: dayHasCells(d.i) ? accentColor : T2 }}>{d.label}</span>
                            {dayHasCells(d.i) && (
                              <span onClick={() => clearDay(d.i)} style={{ fontSize: 9, color: T3, cursor: 'pointer' }} title={`Clear ${d.label}`}>clear</span>
                            )}
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '34px repeat(7, 1fr)' }}>
                        {Array.from({ length: SLOTS_PER_DAY }).map((_, slot) => {
                          const label = slotLabel(slot);
                          return (
                            <Fragment key={slot}>
                              <div style={{ fontSize: 8.5, color: T3, textAlign: 'right', paddingRight: 4, lineHeight: '16px', fontWeight: label ? 700 : 400 }}>
                                {label}
                              </div>
                              {DAYS.map(d => {
                                const on = cells.has(cellKey(d.i, slot));
                                return (
                                  <div
                                    key={`${d.i}-${slot}`}
                                    data-day={d.i}
                                    data-slot={slot}
                                    onMouseDown={() => handleCellDown(d.i, slot)}
                                    onMouseEnter={() => handleCellEnter(d.i, slot)}
                                    onTouchStart={() => handleCellDown(d.i, slot)}
                                    style={{
                                      height: 16,
                                      background: on ? accentColor : '#f0f0f5',
                                      borderTop: label ? `1px solid ${BORDER}` : 'none',
                                      borderLeft: `1px solid #fff`,
                                      cursor: 'pointer',
                                      transition: 'background .06s',
                                    }}
                                  />
                                );
                              })}
                            </Fragment>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: T2, marginBottom: 4 }}>Min. notice (hrs)</div>
                        <input type="number" min={0} value={minNoticeHours} onChange={e => { setMinNoticeHours(Number(e.target.value) || 0); setSaved(false); }}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '6px 9px', borderRadius: 6, border: `1.5px solid ${BORDER}`, fontSize: 12.5, fontFamily: 'inherit', color: T1 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: T2, marginBottom: 4 }}>Booking window (days)</div>
                        <input type="number" min={1} value={bookingWindowDays} onChange={e => { setBookingWindowDays(Number(e.target.value) || 1); setSaved(false); }}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '6px 9px', borderRadius: 6, border: `1.5px solid ${BORDER}`, fontSize: 12.5, fontFamily: 'inherit', color: T1 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: T2, marginBottom: 4 }}>Buffer between calls (min)</div>
                        <input type="number" min={0} value={bufferMins} onChange={e => { setBufferMins(Number(e.target.value) || 0); setSaved(false); }}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '6px 9px', borderRadius: 6, border: `1.5px solid ${BORDER}`, fontSize: 12.5, fontFamily: 'inherit', color: T1 }} />
                      </div>
                    </div>

                    {!anyEnabled && (
                      <div style={{ fontSize: 11.5, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '7px 10px', marginTop: 10 }}>
                        Open at least one slot so contacts have something to book.
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: T2, lineHeight: 1.6, marginBottom: 14 }}>
                      Solid blocks are custom to that date; lighter blocks are inherited from your weekly pattern. Drag on a specific date to open extra hours or block it off -- it saves automatically.
                    </div>

                    {dirtyDates.size > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '7px 10px', marginBottom: 12, fontSize: 11.5, color: '#b45309' }}>
                        <span>{dirtyDates.size} custom date{dirtyDates.size === 1 ? '' : 's'} not saved yet.</span>
                        <button onClick={syncDirtyOverrides} style={{ marginLeft: 'auto', border: 'none', background: '#b45309', color: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Save now
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={goPrev} style={{ width: 26, height: 26, borderRadius: 7, border: `1.5px solid ${BORDER}`, background: '#fff', color: T2, cursor: 'pointer', fontSize: 13 }}>‹</button>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T1, minWidth: 150, textAlign: 'center' }}>
                          {calView === 'week' ? weekRangeLabel : `${MONTH_NAMES[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`}
                        </div>
                        <button onClick={goNext} style={{ width: 26, height: 26, borderRadius: 7, border: `1.5px solid ${BORDER}`, background: '#fff', color: T2, cursor: 'pointer', fontSize: 13 }}>›</button>
                        <button onClick={goToday} style={{ marginLeft: 4, border: `1.5px solid ${BORDER}`, background: '#fff', color: T2, borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Today</button>
                      </div>
                      <div style={{ display: 'flex', border: `1.5px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                        <button onClick={() => setCalView('week')} style={pillBtn(calView === 'week')}>Week</button>
                        <button onClick={() => setCalView('month')} style={{ ...pillBtn(calView === 'month'), borderLeft: `1.5px solid ${BORDER}` }}>Month</button>
                      </div>
                    </div>

                    {calView === 'month' ? (
                      <div style={{ border: `1.5px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', marginBottom: 18 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#fafafa', borderBottom: `1px solid ${BORDER}` }}>
                          {DAYS.map(d => (
                            <div key={d.i} style={{ textAlign: 'center', padding: '6px 2px', fontSize: 10, fontWeight: 700, color: T2 }}>{d.label}</div>
                          ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                          {monthDates.map(d => {
                            const key = dateKeyOf(d);
                            const inMonth = d.getMonth() === anchorDate.getMonth();
                            const overridden = overriddenDateSet.has(key);
                            const hasHours = resolvedSlotsForDate(d).size > 0;
                            const isToday = sameDate(d, today);
                            return (
                              <div
                                key={key}
                                onClick={() => { if (!inMonth) return; setCalView('week'); setAnchorDate(d); }}
                                style={{
                                  aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                  opacity: inMonth ? 1 : 0.32, cursor: inMonth ? 'pointer' : 'default', borderRadius: 8,
                                  border: isToday ? `1.5px solid ${accentColor}` : '1px solid transparent',
                                }}
                              >
                                <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: T1 }}>{d.getDate()}</span>
                                <span style={{
                                  width: 5, height: 5, borderRadius: '50%', marginTop: 3,
                                  background: overridden ? accentColor : (hasHours ? `${accentColor}70` : 'transparent'),
                                  boxShadow: overridden ? `0 0 0 2px ${accentColor}25` : 'none',
                                }} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div
                        onTouchMove={handleTouchMove}
                        style={{ userSelect: 'none', border: `1.5px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', marginBottom: 18 }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: '34px repeat(7, 1fr)', background: '#fafafa', borderBottom: `1px solid ${BORDER}` }}>
                          <div />
                          {weekDates.map(d => {
                            const key = dateKeyOf(d);
                            const overridden = overriddenDateSet.has(key);
                            const isToday = sameDate(d, today);
                            return (
                              <div key={key} style={{ textAlign: 'center', padding: '5px 2px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                <span style={{ fontSize: 9.5, fontWeight: 700, color: T2 }}>{DAYS[d.getDay()].label}</span>
                                <span style={{ fontSize: 12, fontWeight: 800, color: isToday ? accentColor : T1 }}>{d.getDate()}</span>
                                {overridden ? (
                                  <span onClick={() => resetDate(key)} style={{ fontSize: 8, color: accentColor, cursor: 'pointer', fontWeight: 700 }} title="Revert to weekly pattern">
                                    {dateSaving === key ? '…' : dateSavedFlash === key ? '✓ saved' : 'custom · reset'}
                                  </span>
                                ) : (
                                  weekdaySlots(cells, d.getDay()).size > 0 ? <span style={{ fontSize: 8, color: T3 }}>(pattern)</span> : null
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '34px repeat(7, 1fr)' }}>
                          {Array.from({ length: SLOTS_PER_DAY }).map((_, slot) => {
                            const label = slotLabel(slot);
                            return (
                              <Fragment key={slot}>
                                <div style={{ fontSize: 8.5, color: T3, textAlign: 'right', paddingRight: 4, lineHeight: '16px', fontWeight: label ? 700 : 400 }}>
                                  {label}
                                </div>
                                {weekDates.map(d => {
                                  const key = dateKeyOf(d);
                                  const overridden = overriddenDateSet.has(key);
                                  const slots = resolvedSlotsForDate(d);
                                  const on = slots.has(slot);
                                  return (
                                    <div
                                      key={`${key}-${slot}`}
                                      data-date={key}
                                      data-slot={slot}
                                      onMouseDown={() => handleWeekViewCellDown(key, d.getDay(), slot)}
                                      onMouseEnter={() => handleWeekViewCellEnter(key, slot)}
                                      onTouchStart={() => handleWeekViewCellDown(key, d.getDay(), slot)}
                                      style={{
                                        height: 16,
                                        background: on ? (overridden ? accentColor : `${accentColor}55`) : '#f0f0f5',
                                        borderTop: label ? `1px solid ${BORDER}` : 'none',
                                        borderLeft: `1px solid #fff`,
                                        cursor: 'pointer',
                                        transition: 'background .06s',
                                      }}
                                    />
                                  );
                                })}
                              </Fragment>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderTop: `1px solid ${BORDER}` }}>
            <button onClick={handleSaveWeekly} disabled={loading || saving}
              style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: accentColor, color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading || saving ? 'default' : 'pointer', opacity: loading || saving ? 0.6 : 1, fontFamily: 'inherit' }}>
              {saving ? 'Saving…' : 'Save weekly pattern'}
            </button>
            {saved && <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>✓ Saved</span>}
            <div style={{ flex: 1 }} />
            <button onClick={onClose} style={{ padding: '9px 14px', borderRadius: 9, border: `1.5px solid ${BORDER}`, background: '#fff', color: T2, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
