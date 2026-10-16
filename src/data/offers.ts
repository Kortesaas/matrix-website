import type { ImageMetadata } from 'astro';
import type { Accent } from './site';

import r142 from '../assets/photos/r142.jpg';
import e5 from '../assets/photos/e5.jpg';
import r74 from '../assets/photos/r74.jpg';
import r155 from '../assets/photos/r155.jpg';
import r118 from '../assets/photos/r118.jpg';
import r119 from '../assets/photos/r119.jpg';
import r30 from '../assets/photos/r30.jpg';
import r10 from '../assets/photos/r10.jpg';
import r151 from '../assets/photos/r151.jpg';
import r96 from '../assets/photos/r96.jpg';
import r123 from '../assets/photos/r123.jpg';
import r29 from '../assets/photos/r29.jpg';
import r170 from '../assets/photos/r170.jpg';
import r99 from '../assets/photos/r99.jpg';
import r113 from '../assets/photos/r113.jpg';

export interface Offer {
  slug: string;
  title: string;
  meta?: string;
  image: ImageMetadata;
  /** Frame colour of the card; the grid rotates through the accents. */
  frame: Accent;
  /** Where the card leads; cards without a page of their own are not links. */
  href?: string;
  /** Featured chip on the landing page (max one). */
  hot?: boolean;
}

// Photos are placeholders until the final photography arrives.
export const offers: Offer[] = [
  { slug: 'offener-betrieb', href: '/raeume/#chill-lounge', title: 'Offener Betrieb', meta: 'Einfach vorbeikommen', image: r142, frame: 'purple' },
  { slug: 'streetwork', title: 'Streetwork', meta: 'Wir kommen zu dir', image: e5, frame: 'blue' },
  { slug: 'musik', href: '/raeume/#studio-band', title: 'Musik', meta: 'Proberaum & Tonstudio', image: r74, frame: 'green' },
  { slug: '3d-druck', href: '/werkstatt/#3d-druck', title: '3D-Druck', meta: 'In der Werkstatt', image: r155, frame: 'coral' },
  { slug: 'kochen', href: '/raeume/#theke-kueche', title: 'Kochen', meta: 'An der X-Bar', image: r118, frame: 'yellow' },
  { slug: 'theater', href: '/raeume/#saal', title: 'Theater', meta: 'Bühne im Saal', image: r119, frame: 'pink' },
  { slug: 'girls-day', href: '/raeume/#maedchenzimmer', title: 'Girls Day', meta: 'Nur für Mädchen', image: r30, frame: 'pink' },
  { slug: 'siebdruck', href: '/werkstatt/#siebdruck', title: 'Siebdruck', meta: 'Shirts, Beutel, Poster', image: r10, frame: 'purple' },
  { slug: 'spieleabend', href: '/aktuelles/', title: 'Spieleabend', meta: 'Brett- und Konsolenspiele', image: r151, frame: 'yellow' },
  { slug: 'nachhaltigkeit', href: '/werkstatt/#holzbearbeitung', title: 'Nachhaltigkeit', meta: 'Reparieren statt wegwerfen', image: r96, frame: 'green' },
  { slug: 'events', href: '/aktuelles/', title: 'Events', meta: 'Konzerte, Partys, Turniere', image: r123, frame: 'coral' },
  { slug: 'tanzen', title: 'Tanzen', meta: 'Choreos & Freestyle', image: r29, frame: 'pink' },
  { slug: 'fahrrad', href: '/werkstatt/#fahrrad', title: 'Fahrrad', meta: 'Selbsthilfe-Werkstatt', image: r170, frame: 'purple' },
  { slug: 'foto-video', title: 'Foto/Video', meta: 'Kamera, Schnitt, Licht', image: r99, frame: 'yellow' },
  { slug: 'verleih', title: 'Verleih', meta: 'Technik & Equipment', image: r113, frame: 'blue' },
];
