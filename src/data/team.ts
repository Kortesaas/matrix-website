import type { ImageMetadata } from 'astro';

import r123 from '../assets/photos/r123.jpg';
import p10 from '../assets/photos/p10.jpg';
import r142 from '../assets/photos/r142.jpg';

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

// TODO: add the portraits (same background and crop for everyone) once shot.
export const teamGroups: TeamGroup[] = [
  {
    title: 'Die Hauptamtlichen',
    members: [
      { name: 'Ralf Engelstätter', role: 'CEO' },
      { name: 'Steve Klier', role: 'Medienpädagoge' },
      { name: 'Angi Klecker', role: 'Theaterpädagogin' },
      { name: 'Thomas Walk', role: 'Eventmanager' },
      { name: 'Leonie Spieß', role: 'Pädagogische Mitarbeiterin' },
      { name: 'Richy Bieger', role: 'Streetworker' },
    ],
  },
  {
    title: 'Die FSJler',
    members: [
      { name: 'Melanie Hagen', role: 'FSJlerin' },
      { open: true, title: 'Bewirb dich jetzt!', text: 'Jeden September starten neue FSJler', href: '/mitmachen/#kontakt' },
      // TODO: surname missing in the concept.
      { name: 'Mija', role: 'FSJlerin' },
    ],
  },
];

export interface GroupPhoto {
  image: ImageMetadata;
  alt: string;
}

// TODO: replace with real group photos of the young people (16:9 + two 4:3).
export const groupPhotos: GroupPhoto[] = [
  { image: r123, alt: 'Party im Saal der MatriX' },
  { image: p10, alt: 'Der Saal der MatriX' },
  { image: r142, alt: 'Kicker und Sofas in der Chill-Lounge' },
];
