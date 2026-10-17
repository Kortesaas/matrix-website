import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIcs } from '../src/data/calendar/ics.ts';

const range = { from: '2026-10-01', to: '2026-12-31' };
const ics = (...events) =>
  ['BEGIN:VCALENDAR', ...events.flatMap((lines) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n');

test('times are shown on the Königsbrunn wall clock', () => {
  const events = parseIcs(
    ics(
      ['UID:a', 'DTSTART;TZID=Europe/Berlin:20261023T190000', 'DTEND;TZID=Europe/Berlin:20261023T230000', 'SUMMARY:Metal Meeting'],
      // 18:00 UTC is 19:00 in winter time and 20:00 in summer time.
      ['UID:b', 'DTSTART:20261120T180000Z', 'DTEND:20261120T210000Z', 'SUMMARY:Winter'],
      ['UID:c', 'DTSTART:20261015T180000Z', 'DURATION:PT2H', 'SUMMARY:Sommer'],
      ['UID:d', 'DTSTART;TZID=America/New_York:20261105T120000', 'DTEND;TZID=America/New_York:20261105T130000', 'SUMMARY:Call'],
    ),
    range,
  );
  const by = Object.fromEntries(events.map((e) => [e.title, e]));
  assert.deepEqual([by['Metal Meeting'].date, by['Metal Meeting'].start, by['Metal Meeting'].end], ['2026-10-23', '19:00', '23:00']);
  assert.deepEqual([by.Winter.start, by.Winter.end], ['19:00', '22:00']);
  assert.deepEqual([by.Sommer.start, by.Sommer.end], ['20:00', '22:00']);
  assert.equal(by.Call.start, '18:00');
});

test('all-day events keep their span and end exclusive like the spec says', () => {
  const [ferien, single] = parseIcs(
    ics(
      ['UID:f', 'DTSTART;VALUE=DATE:20261102', 'DTEND;VALUE=DATE:20261107', 'SUMMARY:Ferien'],
      ['UID:s', 'DTSTART;VALUE=DATE:20261103', 'DTEND;VALUE=DATE:20261104', 'SUMMARY:Einzeltag'],
    ),
    range,
  );
  assert.deepEqual([ferien.date, ferien.endDate, ferien.start], ['2026-11-02', '2026-11-06', undefined]);
  assert.equal(single.endDate, undefined);
});

test('weekly series honour EXDATE, moved and cancelled dates', () => {
  const events = parseIcs(
    ics(
      [
        'UID:tanz',
        'DTSTART;TZID=Europe/Berlin:20261007T170000',
        'DTEND;TZID=Europe/Berlin:20261007T190000',
        'RRULE:FREQ=WEEKLY;UNTIL=20261104T230000Z',
        'EXDATE;TZID=Europe/Berlin:20261014T170000',
        'SUMMARY:Tanzen',
      ],
      ['UID:tanz', 'RECURRENCE-ID;TZID=Europe/Berlin:20261021T170000', 'DTSTART;TZID=Europe/Berlin:20261022T180000', 'DTEND;TZID=Europe/Berlin:20261022T200000', 'SUMMARY:Tanzen (verschoben)'],
      ['UID:tanz', 'RECURRENCE-ID;TZID=Europe/Berlin:20261028T170000', 'DTSTART;TZID=Europe/Berlin:20261028T170000', 'STATUS:CANCELLED', 'SUMMARY:Tanzen'],
    ),
    range,
  );
  assert.deepEqual(
    events.map((e) => `${e.date} ${e.start} ${e.title}`),
    ['2026-10-07 17:00 Tanzen', '2026-10-22 18:00 Tanzen (verschoben)', '2026-11-04 17:00 Tanzen'],
  );
  assert.ok(events.every((e) => e.weekly && e.series === 'tanz'));
});

test('weekly BYDAY with COUNT and monthly ordinal rules', () => {
  const events = parseIcs(
    ics(
      ['UID:w', 'DTSTART;TZID=Europe/Berlin:20261005T160000', 'RRULE:FREQ=WEEKLY;BYDAY=MO,TH;COUNT=3', 'SUMMARY:Training'],
      ['UID:m', 'DTSTART;TZID=Europe/Berlin:20261030T200000', 'RRULE:FREQ=MONTHLY;BYDAY=-1FR', 'SUMMARY:Monatsparty'],
    ),
    range,
  );
  assert.deepEqual(events.filter((e) => e.title === 'Training').map((e) => e.date), ['2026-10-05', '2026-10-08', '2026-10-12']);
  assert.deepEqual(events.filter((e) => e.title === 'Monatsparty').map((e) => e.date), ['2026-10-30', '2026-11-27', '2026-12-25']);
  assert.ok(events.filter((e) => e.title === 'Monatsparty').every((e) => !e.weekly));
});

test('private events stay hidden and text is unescaped', () => {
  const events = parseIcs(
    ics(
      ['UID:p', 'DTSTART:20261010T100000Z', 'CLASS:PRIVATE', 'SUMMARY:Teamsitzung'],
      [
        'UID:t',
        'DTSTART:20261011T100000Z',
        'SUMMARY:Turnier\\, offen',
        'LOCATION:X-Bar\\; Saal',
        'DESCRIPTION:Anmeldung <b>vor Ort</b>.<br>Bring Freunde mit &amp\\; Spaß!',
        ' Und gute Laune.',
        'BEGIN:VALARM',
        'DESCRIPTION:Erinnerung',
        'END:VALARM',
      ],
    ),
    range,
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].title, 'Turnier, offen');
  assert.equal(events[0].location, 'X-Bar; Saal');
  assert.equal(events[0].description, 'Anmeldung vor Ort.\nBring Freunde mit & Spaß!Und gute Laune.');
});
