/**
 * Termine for Aktuelles and the start page.
 *
 * With CALENDAR_ICS_URL set (in .env or the build environment), the build
 * reads that iCalendar feed, e.g. the "public address in iCal format" of a
 * Google Calendar. Visitors never contact Google: the dates are written into
 * the static pages, so the site shows what the calendar held at build time.
 * Without the variable, the demo dates below are used.
 */
import { dayToIso, isoToDay, parseIcs, SITE_TIME_ZONE, type CalendarEvent } from './calendar/ics';

export type { CalendarEvent };

export interface EventItem {
  /** Short date ("12.02.") or weekday ("Mi"), shown in the fixed date column. */
  date: string;
  name: string;
  sub?: string;
}

export interface EventColumn {
  title: string;
  items: EventItem[];
}

/** Optional link for visitors to subscribe to the calendar in their own app. */
export const calendarSubscribeUrl: string | undefined = import.meta.env.CALENDAR_SUBSCRIBE_URL || undefined;

/** Today in Königsbrunn when the site is built. */
export const buildDate = new Intl.DateTimeFormat('en-CA', { timeZone: SITE_TIME_ZONE }).format(new Date());

const today = isoToDay(buildDate);
const range = { from: dayToIso(today - 62), to: dayToIso(today + 400) };

// ---------- Demo dates (used until the calendar feed is set) ----------

const demoIcs = (): string => {
  const d = (offset: number) => dayToIso(today + offset).replaceAll('-', '');
  const monday = today - ((today + 3) % 7); // Monday of this week
  const w = (weekday: number) => dayToIso(monday + weekday - 7).replaceAll('-', '');
  const ev = (uid: string, lines: string[]) => ['BEGIN:VEVENT', `UID:${uid}`, ...lines, 'END:VEVENT'];
  return [
    'BEGIN:VCALENDAR',
    ...ev('metal', [`DTSTART;TZID=Europe/Berlin:${d(6)}T190000`, `DTEND;TZID=Europe/Berlin:${d(6)}T230000`, 'SUMMARY:Metal Meeting', 'LOCATION:Saal', 'DESCRIPTION:Konzertabend im Saal mit drei Bands aus der Region.']),
    ...ev('dart', [`DTSTART;TZID=Europe/Berlin:${d(13)}T170000`, `DTEND;TZID=Europe/Berlin:${d(13)}T210000`, 'SUMMARY:Darttunier', 'LOCATION:X-Bar', 'DESCRIPTION:Anmeldung an der X-Bar.']),
    ...ev('mammut', [`DTSTART;TZID=Europe/Berlin:${d(20)}T180000`, `DTEND;TZID=Europe/Berlin:${d(20)}T230000`, 'SUMMARY:Mammut Metal und Bier', 'LOCATION:Saal', 'DESCRIPTION:Live im Saal.']),
    ...ev('jam', [`DTSTART;TZID=Europe/Berlin:${d(34)}T180000`, `DTEND;TZID=Europe/Berlin:${d(34)}T220000`, 'SUMMARY:MatriX Jam', 'LOCATION:Saal', 'DESCRIPTION:Open Stage für alle.']),
    ...ev('ferien', [`DTSTART;VALUE=DATE:${d(41)}`, `DTEND;VALUE=DATE:${d(44)}`, 'SUMMARY:Ferienprogramm', 'LOCATION:ganzes Haus']),
    ...ev('tanzen', [`DTSTART;TZID=Europe/Berlin:${w(2)}T170000`, `DTEND;TZID=Europe/Berlin:${w(2)}T190000`, 'RRULE:FREQ=WEEKLY', 'SUMMARY:Tanzen', 'LOCATION:Saal']),
    ...ev('spiele', [`DTSTART;TZID=Europe/Berlin:${w(3)}T170000`, `DTEND;TZID=Europe/Berlin:${w(3)}T200000`, 'RRULE:FREQ=WEEKLY', 'SUMMARY:Spieleabend', 'LOCATION:Chill-Lounge']),
    ...ev('party', [`DTSTART;TZID=Europe/Berlin:${w(4)}T180000`, `DTEND;TZID=Europe/Berlin:${w(4)}T200000`, 'RRULE:FREQ=WEEKLY', 'SUMMARY:Party', 'LOCATION:X-Bar & Saal']),
    'END:VCALENDAR',
  ].join('\r\n');
};

async function loadIcs(source: string): Promise<string> {
  if (!/^(https?|webcal):\/\//i.test(source)) throw new Error(`CALENDAR_ICS_URL muss mit https:// oder webcal:// beginnen: ${source}`);
  const url = source.replace(/^webcal:/i, 'https:');
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Kalender konnte nicht geladen werden (${res.status} ${res.statusText}): ${url}`);
  return res.text();
}

async function loadCalendar(): Promise<CalendarEvent[]> {
  const source: string | undefined = import.meta.env.CALENDAR_ICS_URL;
  if (!source) {
    console.warn('[events] CALENDAR_ICS_URL ist nicht gesetzt: Es werden Beispieltermine angezeigt.');
    return parseIcs(demoIcs(), range);
  }
  // A configured feed that fails stops the build, so no outdated or demo
  // dates get uploaded by accident.
  return parseIcs(await loadIcs(source), range);
}

/** Every occurrence from two months back to a year ahead. */
export const calendarEvents: CalendarEvent[] = await loadCalendar();

// ---------- The two lists ("Events" and "Jede Woche") ----------

const shortDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;
const shortWeekday = (iso: string) =>
  new Intl.DateTimeFormat('de-DE', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`)).replace('.', '');
const timeRange = (ev: CalendarEvent) => (ev.start ? `${ev.start}${ev.end ? ` bis ${ev.end}` : ''} Uhr` : undefined);
const sub = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(', ') || undefined;

export const events: EventItem[] = calendarEvents
  .filter((ev) => !ev.weekly && (ev.endDate ?? ev.date) >= buildDate)
  .slice(0, 4)
  .map((ev) => ({ date: shortDate(ev.date), name: ev.title, sub: sub(ev.location, timeRange(ev)) }));

// One line per weekly series, Monday first.
const seriesSeen = new Set<string>();
export const regulars: EventItem[] = calendarEvents
  .filter((ev) => ev.weekly && ev.date >= buildDate && !seriesSeen.has(ev.series!) && seriesSeen.add(ev.series!))
  .sort((a, b) => ((isoToDay(a.date) + 3) % 7) - ((isoToDay(b.date) + 3) % 7) || (a.start ?? '').localeCompare(b.start ?? ''))
  .map((ev) => ({ date: shortWeekday(ev.date), name: ev.title, sub: ev.location }));

export const eventColumns: EventColumn[] = [
  { title: 'Events', items: events },
  { title: 'Jede Woche', items: regulars },
].filter((col) => col.items.length > 0);
