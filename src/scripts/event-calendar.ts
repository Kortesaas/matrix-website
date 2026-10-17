/**
 * Month grid and day agenda for the Aktuelles calendar. The same functions
 * render the first month at build time and every month the visitor flips to
 * in the browser, so both look identical.
 */
import type { CalendarEvent } from '../data/calendar/ics';

const DAY_MS = 86_400_000;

const monthName = new Intl.DateTimeFormat('de-DE', { month: 'long', timeZone: 'UTC' });
const longDay = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const shortDay = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'UTC' });

const toDay = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY_MS;
const toIso = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);
const asDate = (iso: string) => new Date(`${iso}T12:00:00Z`);

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/** Events per day; multi-day events appear on each of their days. */
export function indexByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const last = ev.endDate ? toDay(ev.endDate) : toDay(ev.date);
    for (let d = toDay(ev.date); d <= last; d++) {
      const key = toIso(d);
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
  }
  return map;
}

export interface MonthView {
  /** Any day inside the shown month, YYYY-MM-DD. */
  month: string;
  today: string;
  selected?: string;
}

export function monthTitle(month: string): string {
  return `${monthName.format(asDate(month))} <span>${month.slice(0, 4)}</span>`;
}

export function renderMonth(byDay: Map<string, CalendarEvent[]>, { month, today, selected }: MonthView): string {
  const year = +month.slice(0, 4);
  const m = +month.slice(5, 7) - 1;
  const first = Date.UTC(year, m, 1) / DAY_MS;
  const last = Date.UTC(year, m + 1, 0) / DAY_MS;
  const lead = (first + 3) % 7; // days before the 1st, weeks start on Monday
  const cells: string[] = [];

  for (let i = 0; i < lead; i++) cells.push('<span class="mx-cal__day mx-cal__day--blank" aria-hidden="true"></span>');
  for (let d = first; d <= last; d++) {
    const iso = toIso(d);
    const list = byDay.get(iso) ?? [];
    const specials = list.filter((ev) => !ev.weekly);
    const classes = ['mx-cal__day'];
    if (iso === today) classes.push('is-today');
    if (iso === selected) classes.push('is-selected');
    if (iso < today) classes.push('is-past');
    if (specials.length) classes.push('has-event');
    else if (list.length) classes.push('has-weekly');

    const label = `${longDay.format(asDate(iso))}${list.length ? `, ${list.length} ${list.length === 1 ? 'Termin' : 'Termine'}` : ''}`;
    const chips = specials
      .slice(0, 2)
      .map((ev) => `<span class="mx-cal__chip">${esc(ev.title)}</span>`)
      .join('');
    const more = specials.length > 2 ? `<span class="mx-cal__more">+${specials.length - 2}</span>` : '';
    const dots = list.length
      ? `<span class="mx-cal__dots" aria-hidden="true">${list
          .slice(0, 3)
          .map((ev) => `<i class="${ev.weekly ? 'is-weekly' : ''}"></i>`)
          .join('')}</span>`
      : '';

    cells.push(
      `<button type="button" class="${classes.join(' ')}" data-day="${iso}" aria-label="${esc(label)}" aria-pressed="${iso === selected}">` +
        `<span class="mx-cal__num">${d - first + 1}</span>${dots}<span class="mx-cal__chips" aria-hidden="true">${chips}${more}</span>` +
        `</button>`,
    );
  }
  return cells.join('');
}

function timeLabel(ev: CalendarEvent, day: string): string {
  if (!ev.start) return 'ganztags';
  if (ev.endDate && day !== ev.date) return day === ev.endDate && ev.end ? `bis ${ev.end}` : 'ganztags';
  return ev.end ? `${ev.start} bis ${ev.end}` : ev.start;
}

function card(ev: CalendarEvent, day: string, showDate: boolean): string {
  const date = showDate ? `<span class="mx-cal__card-date">${esc(shortDay.format(asDate(day)))}</span>` : '';
  const meta = [ev.location, ev.weekly ? 'jede Woche' : undefined].filter(Boolean).map((t) => esc(t!)).join(' · ');
  const description = ev.description
    ? `<p class="mx-cal__card-text">${esc(ev.description).replace(/\n/g, '<br>')}</p>`
    : '';
  const link = ev.url ? `<a class="mx-cal__card-link" href="${esc(ev.url)}" rel="noopener" target="_blank">Mehr dazu</a>` : '';
  return (
    `<li class="mx-cal__card${ev.weekly ? ' is-weekly' : ''}">` +
    `<p class="mx-cal__card-time">${date}${esc(timeLabel(ev, day))}</p>` +
    `<h4 class="mx-cal__card-title">${esc(ev.title)}</h4>` +
    (meta ? `<p class="mx-cal__card-meta">${meta}</p>` : '') +
    description +
    link +
    `</li>`
  );
}

/**
 * The panel next to the grid: one day when a day is picked, otherwise the
 * month's events from today on (weekly dates are left to the grid).
 */
export function renderAgenda(byDay: Map<string, CalendarEvent[]>, { month, today, selected }: MonthView): string {
  if (selected) {
    const list = byDay.get(selected) ?? [];
    const title = `<h3 class="mx-cal__agenda-title">${esc(longDay.format(asDate(selected)))}</h3>`;
    const back = '<button type="button" class="mx-cal__back" data-cal="month">Ganzer Monat</button>';
    const body = list.length
      ? `<ul class="mx-cal__cards">${list.map((ev) => card(ev, selected, false)).join('')}</ul>`
      : '<p class="mx-cal__empty">Für diesen Tag ist nichts eingetragen.</p>';
    return title + body + back;
  }

  const prefix = month.slice(0, 7);
  const seen = new Set<string>();
  const items: string[] = [];
  for (const [day, list] of [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (!day.startsWith(prefix) || day < today) continue;
    for (const ev of list) {
      if (ev.weekly || seen.has(ev.id)) continue;
      seen.add(ev.id);
      items.push(card(ev, day, true));
    }
  }
  const title = `<h3 class="mx-cal__agenda-title">${prefix < today.slice(0, 7) ? 'Vorbei' : `Im ${esc(monthName.format(asDate(month)))}`}</h3>`;
  const body = items.length
    ? `<ul class="mx-cal__cards">${items.join('')}</ul>`
    : `<p class="mx-cal__empty">${prefix < today.slice(0, 7) ? 'Dieser Monat liegt hinter uns.' : 'Noch keine Events eingetragen. Die festen Termine jede Woche findest du im Kalender.'}</p>`;
  return title + body;
}
