import type { ImageMetadata } from 'astro';

import ralf from '../assets/team/ralf.png';
import steve from '../assets/team/steve.png';
import angi from '../assets/team/angi.png';
import thomas from '../assets/team/thomas.png';
import leonie from '../assets/team/leonie.png';
import richy from '../assets/team/richy.png';
import groupOutdoors from '../assets/youth/group-outdoors.png';
import groupStage from '../assets/youth/group-stage.png';
import groupCostumes from '../assets/youth/group-costumes.png';

export interface TeamMember {
  name: string;
  role: string;
  /** Square, shoulders-up portrait in front of the X mural. Missing → placeholder tile. */
  portrait?: ImageMetadata;
}

export interface OpenPosition {
  open: true;
  title: string;
  text: string;
  href: string;
}

export interface TeamGroup {
  title: string;
  members: (TeamMember | OpenPosition)[];
}

// Staff portraits supplied in the design handoff.
export const teamGroups: TeamGroup[] = [
  {
    title: 'Die Hauptamtlichen',
    members: [
      { name: 'Ralf Engelstätter', portrait: ralf, role: 'CEO' },
      { name: 'Steve Klier', portrait: steve, role: 'Medienpädagoge' },
      { name: 'Angi Klecker', portrait: angi, role: 'Theaterpädagogin' },
      { name: 'Thomas Walk', portrait: thomas, role: 'Eventmanager' },
      { name: 'Leonie Spieß', portrait: leonie, role: 'Pädagogische Mitarbeiterin' },
      { name: 'Richy Bieger', portrait: richy, role: 'Streetworker' },
    ],
  },
  {
    title: 'Die FSJler',
    members: [
      { name: 'Nick Diehl', role: 'FSJler' },
      { open: true, title: 'Bewirb dich jetzt!', text: 'Jeden September starten neue FSJler', href: '/mitmachen/#kontakt' },
      // TODO: surname missing in the concept.
      { name: 'Cash Money', role: 'FSJler' },
    ],
  },
];

export interface GroupPhoto {
  image: ImageMetadata;
  alt: string;
}

// Original youth group photos; keep the full compositions visible.
export const groupPhotos: GroupPhoto[] = [
  { image: groupOutdoors, alt: 'Jugendliche der MatriX gemeinsam im Außenbereich' },
  { image: groupStage, alt: 'Gruppenfoto von Jugendlichen auf der Bühne der MatriX' },
  { image: groupCostumes, alt: 'Jugendliche in Kostümen im Garten der MatriX' },
];
