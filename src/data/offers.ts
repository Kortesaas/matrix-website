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

export interface Offer {
  slug: string;
  title: string;
  /** One or two sentences, shown on the card (on hover with a mouse, always on touch screens). */
  text: string;
  image: ImageMetadata;
  /** Frame colour of the card; the grid rotates through the accents. */
  frame: Accent;
  /** The room (or room section) the offer happens in; cards without one are not links. */
  href?: string;
  /** Featured chip on the landing page (max one). */
  hot?: boolean;
}

// Photos are placeholders until the final photography arrives.
export const offers: Offer[] = [
  { slug: 'offener-betrieb', href: '/raeume/#chill-lounge', title: 'Offener Betrieb', text: 'Einfach vorbeikommen: Leute treffen, Billard oder Kicker spielen oder auf dem Sofa chillen. Ganz ohne Anmeldung.', image: r142, frame: 'purple' },
  { slug: 'streetwork', title: 'Streetwork', text: 'Wir sind auch draußen unterwegs, dort, wo ihr euch trefft. Mit offenem Ohr und Hilfe, wenn ihr sie braucht.', image: e5, frame: 'blue' },
  { slug: 'musik', href: '/raeume/#studio-band', title: 'Musik', text: 'Mit deiner Band im Proberaum jammen oder im Tonstudio deine eigenen Songs aufnehmen.', image: r74, frame: 'green' },
  { slug: '3d-druck', href: '/werkstatt/#3d-druck', title: '3D-Druck', text: 'Eigene Ideen am Rechner entwerfen und in der Werkstatt Schicht für Schicht ausdrucken.', image: r155, frame: 'coral' },
  { slug: 'kochen', href: '/raeume/#theke-kueche', title: 'Kochen', text: 'Gemeinsam schnippeln und kochen und danach an der X-Bar zusammen essen.', image: r118, frame: 'yellow' },
  { slug: 'theater', href: '/raeume/#saal', title: 'Theater', text: 'Auf der Bühne im Saal proben, improvisieren und mit der Gruppe ein eigenes Stück auf die Beine stellen.', image: r119, frame: 'pink' },
  { slug: 'girls-day', href: '/raeume/#maedchenzimmer', title: 'Girls Day', text: 'Ein Nachmittag nur für Mädchen: quatschen, basteln und eigene Projekte planen.', image: r30, frame: 'pink' },
  { slug: 'siebdruck', href: '/werkstatt/#siebdruck', title: 'Siebdruck', text: 'Mit Sieb, Farbe und Rakel deine eigenen Motive auf Shirts, Beutel und Poster drucken.', image: r10, frame: 'purple' },
  { slug: 'spieleabend', href: '/gruppenraum/#spieleabend', title: 'Spieleabend', text: 'Brettspiele, Kartenspiele oder Konsole: zusammen zocken und Neues ausprobieren.', image: r151, frame: 'yellow' },
  { slug: 'nachhaltigkeit', href: '/werkstatt/#holzbearbeitung', title: 'Nachhaltigkeit', text: 'Reparieren statt wegwerfen: Aus alten Sachen und Holzresten baust du in der Werkstatt etwas Neues.', image: r96, frame: 'green' },
  { slug: 'events', href: '/aktuelles/', title: 'Events', text: 'Konzerte, Partys und Turniere, oft von Jugendlichen selbst auf die Beine gestellt.', image: r123, frame: 'coral' },
  { slug: 'tanzen', title: 'Tanzen', text: 'Choreos lernen oder im Freestyle deinen eigenen Style finden.', image: r29, frame: 'pink' },
  { slug: 'fahrrad', href: '/werkstatt/#fahrrad', title: 'Fahrrad', text: 'In der Selbsthilfe-Werkstatt flickst du Schlauch, Bremsen und Kette selbst. Wir zeigen dir, wie’s geht.', image: r170, frame: 'purple' },
  { slug: 'foto-video', title: 'Foto/Video', text: 'Mit Kamera, Licht und Schnittprogramm eigene Fotos, Clips und Videos produzieren.', image: r99, frame: 'yellow' },
  { slug: 'verleih', href: '/theke-kueche/#verleih', title: 'Verleih', text: 'BMX, Scooter und Skateboards zum Ausleihen, den passenden Helm gibt’s gleich mit dazu.', image: r170, frame: 'blue' },
];
