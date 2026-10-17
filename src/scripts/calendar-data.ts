/**
 * Loads the Termine once per page, shared by the lists and the calendar.
 * In `astro dev` (no PHP) it falls back to demo dates.
 */
import { demoIcs, parseFeed, type CalendarEvent } from '../data/events';

export const CALENDAR_ENDPOINT = '/api/calendar.php';

let pending: Promise<CalendarEvent[]> | undefined;

export function loadEvents(): Promise<CalendarEvent[]> {
  pending ??= (async () => {
    try {
      const res = await fetch(CALENDAR_ENDPOINT, { headers: { Accept: 'text/calendar' } });
      if (!res.ok) throw new Error(`Kalender: ${res.status}`);
      return parseFeed(await res.text());
    } catch (error) {
      if (import.meta.env.DEV) return parseFeed(demoIcs());
      throw error;
    }
  })();
  return pending;
}
