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

// TODO: replace with the real programme (or feed it from a PHP/JSON source later).
export const events: EventItem[] = [
  { date: '12.02.', name: 'Metal Meeting', sub: 'Konzertabend im Saal' },
  { date: '14.05.', name: 'Darttunier', sub: 'Anmeldung an der X-Bar' },
  { date: '16.05.', name: 'Mammut Metal und Bier', sub: 'Live im Saal' },
  { date: '16.06.', name: 'MatriX Jam', sub: 'Open Stage für alle' },
];

export const regulars: EventItem[] = [
  { date: 'Mi', name: 'Tanzen', sub: 'Saal' },
  { date: 'Do', name: 'Spieleabend', sub: 'Chill-Lounge' },
  { date: 'Fr', name: 'Party', sub: 'X-Bar & Saal' },
  { date: 'So', name: 'Schanzenfest', sub: 'draußen am Haus' },
];

export const eventColumns: EventColumn[] = [
  { title: 'Events', items: events },
  { title: 'Jede Woche', items: regulars },
];
