interface ImportMetaEnv {
  /** iCalendar feed with the Termine, read at build time (see src/data/events.ts). */
  readonly CALENDAR_ICS_URL?: string;
  /** Optional public link so visitors can subscribe to the calendar. */
  readonly CALENDAR_SUBSCRIBE_URL?: string;
}
