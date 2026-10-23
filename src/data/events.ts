/**
 * Termine for Aktuelles and the start page. Google Calendar (or any iCal
 * feed) is the source: the page asks /api/calendar.php, which fetches the
 * feed on our own server and caches it for a few minutes, and the browser
 * reads it with ./calendar/ics.ts. Visitors never contact Google.
 */
import { dayToIso, isoToDay, parseIcs, SITE_TIME_ZONE, type CalendarEvent } from './calendar/ics';

export type { CalendarEvent };

/** Today in Königsbrunn, YYYY-MM-DD. */
export const todayInKoenigsbrunn = () => new Intl.DateTimeFormat('en-CA', { timeZone: SITE_TIME_ZONE }).format(new Date());

/** Two months back to a year ahead: enough for the calendar to flip through. */
export function parseFeed(ics: string, today = todayInKoenigsbrunn()): CalendarEvent[] {
  const day = isoToDay(today);
  return parseIcs(ics, { from: dayToIso(day - 62), to: dayToIso(day + 400) });
}

// ---------- Demo dates for `astro dev`, which has no PHP ----------

export function demoIcs(today = todayInKoenigsbrunn()): string {
  const base = isoToDay(today);
  const d = (offset: number) => dayToIso(base + offset).replaceAll('-', '');
  const monday = base - ((base + 3) % 7);
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
}
