/**
 * A small iCalendar (.ics) reader for the event feed. It covers what Google
 * Calendar, Nextcloud and Outlook export: all-day and timed events, time
 * zones, the common recurrence rules (daily, weekly, monthly, yearly with
 * BYDAY / BYMONTHDAY, COUNT, UNTIL, INTERVAL), EXDATE, moved or cancelled
 * single occurrences (RECURRENCE-ID) and private events (left out).
 *
 * Every time is converted to the wall clock in Königsbrunn (Europe/Berlin),
 * so the site never has to think about time zones again.
 */

export const SITE_TIME_ZONE = 'Europe/Berlin';

export interface CalendarEvent {
  id: string;
  /** First day, YYYY-MM-DD. */
  date: string;
  /** Last day (inclusive) when the event spans several days. */
  endDate?: string;
  /** HH:MM; absent for all-day events. */
  start?: string;
  end?: string;
  title: string;
  location?: string;
  description?: string;
  url?: string;
  /** Part of a series that repeats every week ("Jede Woche"). */
  weekly: boolean;
  /** Identifies the series, so regular dates can be grouped. */
  series?: string;
}

interface Prop {
  name: string;
  params: Record<string, string>;
  value: string;
}

/** A point on the site's wall clock: whole days since 1970-01-01 plus minutes. */
interface Stamp {
  day: number;
  minute?: number;
}

const DAY_MS = 86_400_000;
const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// ---------- Lines and properties ----------

function unfold(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function parseLine(line: string): Prop | null {
  let quoted = false;
  let colon = -1;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') quoted = !quoted;
    else if (ch === ':' && !quoted) {
      colon = i;
      break;
    }
  }
  if (colon < 0) return null;
  const [name, ...rawParams] = line.slice(0, colon).split(';');
  const params: Record<string, string> = {};
  for (const p of rawParams) {
    const eq = p.indexOf('=');
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) };
}

function unescapeText(value: string): string {
  return value.replace(/\\([\\;,nN])/g, (_, ch: string) => (ch === 'n' || ch === 'N' ? '\n' : ch));
}

/** Google stores descriptions as light HTML; keep the words and line breaks. */
function plainText(value: string): string {
  return unescapeText(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------- Dates and time zones ----------

export function dayToIso(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function isoToDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

function minuteToTime(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Wall-clock fields of a UTC instant in a time zone. */
function wallClock(ms: number, timeZone: string) {
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
    formatters.set(timeZone, fmt);
  }
  const parts: Record<string, number> = {};
  for (const p of fmt.formatToParts(new Date(ms))) if (p.type !== 'literal') parts[p.type] = Number(p.value);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
}

function knownZone(timeZone: string | undefined): string | undefined {
  if (!timeZone) return undefined;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return timeZone;
  } catch {
    return undefined;
  }
}

/** Converts a date-time value of an .ics property to the site's wall clock. */
function toStamp(prop: Prop): Stamp | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(prop.value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, , utc] = m;
  if (h === undefined || prop.params.VALUE === 'DATE') return { day: Date.UTC(+y, +mo - 1, +d) / DAY_MS };

  let local = Date.UTC(+y, +mo - 1, +d, +h, +mi);
  const zone = utc ? 'UTC' : knownZone(prop.params.TZID);
  if (zone && zone !== SITE_TIME_ZONE) {
    // Local time in `zone` -> UTC instant -> wall clock in Königsbrunn.
    let instant = local;
    if (zone !== 'UTC') {
      instant = local - (wallClock(local, zone) - local);
      instant = local - (wallClock(instant, zone) - instant);
    }
    local = wallClock(instant, SITE_TIME_ZONE);
  }
  const minutes = Math.round(local / 60_000);
  return { day: Math.floor(minutes / 1440), minute: minutes % 1440 };
}

/** ISO 8601 duration (P1D, PT2H30M) in minutes. */
function durationMinutes(value: string): number {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value.trim());
  if (!m) return 0;
  const [, sign, w, d, h, mi] = m;
  const total = (+(w ?? 0) * 7 + +(d ?? 0)) * 1440 + +(h ?? 0) * 60 + +(mi ?? 0);
  return sign === '-' ? -total : total;
}

function stampKey(s: Stamp): string {
  return s.minute === undefined ? `${s.day}` : `${s.day}T${s.minute}`;
}

// ---------- Recurrence ----------

interface Rule {
  freq: string;
  interval: number;
  count?: number;
  until?: Stamp;
  byDay: { weekday: number; nth: number }[];
  byMonthDay: number[];
  byMonth: number[];
}

function parseRule(value: string): Rule | null {
  const parts: Record<string, string> = {};
  for (const pair of value.split(';')) {
    const [k, v] = pair.split('=');
    if (k && v) parts[k.toUpperCase()] = v;
  }
  if (!parts.FREQ) return null;
  return {
    freq: parts.FREQ,
    interval: Math.max(1, Number(parts.INTERVAL ?? 1)),
    count: parts.COUNT ? Number(parts.COUNT) : undefined,
    until: parts.UNTIL ? (toStamp({ name: 'UNTIL', params: {}, value: parts.UNTIL }) ?? undefined) : undefined,
    byDay: (parts.BYDAY ?? '')
      .split(',')
      .map((t) => /^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(t.trim()))
      .filter((x): x is RegExpExecArray => x !== null)
      .map((x) => ({ weekday: WEEKDAYS.indexOf(x[2]), nth: Number(x[1] ?? 0) })),
    byMonthDay: (parts.BYMONTHDAY ?? '').split(',').filter(Boolean).map(Number),
    byMonth: (parts.BYMONTH ?? '').split(',').filter(Boolean).map(Number),
  };
}

const weekday = (day: number) => (day + 4) % 7; // 1970-01-01 was a Thursday

/** Days in a month that match BYDAY (with optional ordinal) or BYMONTHDAY. */
function daysInMonth(year: number, month: number, rule: Rule, fallbackDate: number): number[] {
  const first = Date.UTC(year, month, 1) / DAY_MS;
  const length = Math.round((Date.UTC(year, month + 1, 1) / DAY_MS) - first);
  const out = new Set<number>();
  for (const md of rule.byMonthDay) {
    const d = md > 0 ? md : length + md + 1;
    if (d >= 1 && d <= length) out.add(first + d - 1);
  }
  for (const { weekday: wd, nth } of rule.byDay) {
    const matches: number[] = [];
    for (let d = 0; d < length; d++) if (weekday(first + d) === wd) matches.push(first + d);
    if (nth === 0) matches.forEach((d) => out.add(d));
    else {
      const pick = nth > 0 ? matches[nth - 1] : matches[matches.length + nth];
      if (pick !== undefined) out.add(pick);
    }
  }
  if (!rule.byMonthDay.length && !rule.byDay.length && fallbackDate <= length) out.add(first + fallbackDate - 1);
  return [...out].sort((a, b) => a - b);
}

/** Start days of every occurrence, beginning at the first one, up to `toDay`. */
function expand(startDay: number, rule: Rule, toDay: number): number[] {
  const out: number[] = [];
  const start = new Date(startDay * DAY_MS);
  const lastDay = rule.until ? rule.until.day : Infinity;
  const limit = Math.min(toDay, lastDay);
  const push = (day: number) => {
    if (day < startDay || day > limit) return true;
    if (rule.count !== undefined && out.length >= rule.count) return false;
    out.push(day);
    return true;
  };
  const done = () => rule.count !== undefined && out.length >= rule.count;
  const monthOk = (day: number) => !rule.byMonth.length || rule.byMonth.includes(new Date(day * DAY_MS).getUTCMonth() + 1);

  for (let step = 0; step < 5000 && !done(); step++) {
    if (rule.freq === 'DAILY') {
      const day = startDay + step * rule.interval;
      if (day > limit) break;
      if (monthOk(day) && (!rule.byDay.length || rule.byDay.some((b) => b.weekday === weekday(day)))) push(day);
    } else if (rule.freq === 'WEEKLY') {
      const monday = startDay - ((weekday(startDay) + 6) % 7) + step * 7 * rule.interval;
      if (monday > limit) break;
      const days = rule.byDay.length ? rule.byDay.map((b) => b.weekday) : [weekday(startDay)];
      for (const d of days.map((wd) => monday + ((wd + 6) % 7)).sort((a, b) => a - b)) {
        if (monthOk(d) && !push(d)) break;
      }
    } else if (rule.freq === 'MONTHLY') {
      const total = start.getUTCMonth() + step * rule.interval;
      const year = start.getUTCFullYear() + Math.floor(total / 12);
      const month = total % 12;
      if (Date.UTC(year, month, 1) / DAY_MS > limit) break;
      if (!monthOk(Date.UTC(year, month, 1) / DAY_MS)) continue;
      for (const d of daysInMonth(year, month, rule, start.getUTCDate())) if (!push(d)) break;
    } else if (rule.freq === 'YEARLY') {
      const year = start.getUTCFullYear() + step * rule.interval;
      if (Date.UTC(year, 0, 1) / DAY_MS > limit) break;
      const months = rule.byMonth.length ? rule.byMonth.map((m) => m - 1) : [start.getUTCMonth()];
      for (const month of months) {
        for (const d of daysInMonth(year, month, rule, start.getUTCDate())) if (!push(d)) break;
      }
    } else {
      // Unknown frequency: keep the first date only.
      push(startDay);
      break;
    }
  }
  return out;
}

// ---------- Events ----------

interface RawEvent {
  props: Map<string, Prop[]>;
}

function first(ev: RawEvent, name: string): Prop | undefined {
  return ev.props.get(name)?.[0];
}

function text(ev: RawEvent, name: string, html = false): string | undefined {
  const p = first(ev, name);
  if (!p) return undefined;
  const value = html ? plainText(p.value) : unescapeText(p.value).trim();
  return value || undefined;
}

function readEvents(lines: string[]): RawEvent[] {
  const events: RawEvent[] = [];
  let current: RawEvent | null = null;
  let depth = 0; // nested blocks inside VEVENT (VALARM)
  for (const line of lines) {
    const prop = parseLine(line);
    if (!prop) continue;
    if (prop.name === 'BEGIN') {
      if (prop.value.toUpperCase() === 'VEVENT' && !current) current = { props: new Map() };
      else if (current) depth++;
      continue;
    }
    if (prop.name === 'END') {
      if (current && depth > 0) depth--;
      else if (current && prop.value.toUpperCase() === 'VEVENT') {
        events.push(current);
        current = null;
      }
      continue;
    }
    if (current && depth === 0) {
      const list = current.props.get(prop.name) ?? [];
      list.push(prop);
      current.props.set(prop.name, list);
    }
  }
  return events;
}

function occurrence(ev: RawEvent, uid: string, start: Stamp, lengthMin: number, weekly: boolean, index: string): CalendarEvent {
  const title = text(ev, 'SUMMARY') ?? 'Termin';
  const out: CalendarEvent = {
    id: `${uid}#${index}`,
    date: dayToIso(start.day),
    title,
    weekly,
    series: weekly ? uid : undefined,
  };
  if (start.minute === undefined) {
    const lastDay = start.day + Math.max(1, Math.round(lengthMin / 1440)) - 1;
    if (lastDay > start.day) out.endDate = dayToIso(lastDay);
  } else {
    out.start = minuteToTime(start.minute);
    if (lengthMin > 0) {
      const endAbs = start.day * 1440 + start.minute + lengthMin;
      out.end = minuteToTime(endAbs % 1440);
      // An event ending at midnight belongs to the previous evening.
      const endDay = Math.floor((endAbs - 1) / 1440);
      if (endDay > start.day) out.endDate = dayToIso(endDay);
    }
  }
  const location = text(ev, 'LOCATION');
  const description = text(ev, 'DESCRIPTION', true);
  const url = text(ev, 'URL');
  if (location) out.location = location;
  if (description) out.description = description;
  if (url && /^https?:\/\//.test(url)) out.url = url;
  return out;
}

export interface ParseOptions {
  /** First day to include (YYYY-MM-DD). */
  from: string;
  /** Last day to include (YYYY-MM-DD). */
  to: string;
}

/** All occurrences between `from` and `to`, sorted by date and time. */
export function parseIcs(icsText: string, { from, to }: ParseOptions): CalendarEvent[] {
  const fromDay = isoToDay(from);
  const toDay = isoToDay(to);
  const raw = readEvents(unfold(icsText));

  const isHidden = (ev: RawEvent) => {
    const cls = first(ev, 'CLASS')?.value.toUpperCase();
    const status = first(ev, 'STATUS')?.value.toUpperCase();
    return status === 'CANCELLED' || cls === 'PRIVATE' || cls === 'CONFIDENTIAL';
  };

  // Moved or cancelled single dates of a series, keyed by UID + original start.
  const overrides = new Map<string, RawEvent>();
  for (const ev of raw) {
    const rid = first(ev, 'RECURRENCE-ID');
    const uid = first(ev, 'UID')?.value;
    const stamp = rid && toStamp(rid);
    if (uid && stamp) overrides.set(`${uid}|${stamp.day}`, ev);
  }

  const out: CalendarEvent[] = [];
  const inRange = (start: Stamp, lengthMin: number) => {
    const lastDay = start.minute === undefined
      ? start.day + Math.max(1, Math.round(lengthMin / 1440)) - 1
      : Math.floor((start.day * 1440 + start.minute + Math.max(lengthMin, 1) - 1) / 1440);
    return lastDay >= fromDay && start.day <= toDay;
  };
  const lengthOf = (ev: RawEvent, start: Stamp) => {
    const endProp = first(ev, 'DTEND');
    const end = endProp && toStamp(endProp);
    if (end) return (end.day - start.day) * 1440 + (end.minute ?? 0) - (start.minute ?? 0);
    const duration = first(ev, 'DURATION');
    if (duration) return durationMinutes(duration.value);
    return start.minute === undefined ? 1440 : 0;
  };

  raw.forEach((ev, n) => {
    if (first(ev, 'RECURRENCE-ID')) {
      // Rendered below through its series, unless the series is missing.
      const uid = first(ev, 'UID')?.value;
      if (uid && raw.some((o) => o !== ev && first(o, 'UID')?.value === uid && first(o, 'RRULE'))) return;
    }
    const startProp = first(ev, 'DTSTART');
    const start = startProp && toStamp(startProp);
    if (!start) return;
    const uid = first(ev, 'UID')?.value ?? `event-${n}`;
    const lengthMin = lengthOf(ev, start);
    const ruleProp = first(ev, 'RRULE');
    const rule = ruleProp && !first(ev, 'RECURRENCE-ID') ? parseRule(ruleProp.value) : null;

    if (!rule) {
      if (!isHidden(ev) && inRange(start, lengthMin)) out.push(occurrence(ev, uid, start, lengthMin, false, stampKey(start)));
      return;
    }
    if (isHidden(ev)) return;

    const weekly = rule.freq === 'WEEKLY' && rule.interval === 1;
    const excluded = new Set<number>();
    for (const ex of ev.props.get('EXDATE') ?? []) {
      for (const value of ex.value.split(',')) {
        const s = toStamp({ ...ex, value });
        if (s) excluded.add(s.day);
      }
    }
    for (const day of expand(start.day, rule, toDay)) {
      if (excluded.has(day)) continue;
      const moved = overrides.get(`${uid}|${day}`);
      if (moved) {
        const movedStartProp = first(moved, 'DTSTART');
        const movedStart = movedStartProp && toStamp(movedStartProp);
        if (!movedStart || isHidden(moved)) continue;
        const movedLength = lengthOf(moved, movedStart);
        if (inRange(movedStart, movedLength)) out.push(occurrence(moved, uid, movedStart, movedLength, weekly, `${day}`));
        continue;
      }
      const s: Stamp = { day, minute: start.minute };
      if (inRange(s, lengthMin)) out.push(occurrence(ev, uid, s, lengthMin, weekly, `${day}`));
    }
  });

  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? '').localeCompare(b.start ?? '') || a.title.localeCompare(b.title));
}
