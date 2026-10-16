import type { ImageMetadata } from 'astro';
import type { Accent } from './site';

import r128 from '../assets/photos/r128.jpg';
import r161 from '../assets/photos/r161.jpg';
import r29 from '../assets/photos/r29.jpg';
import p3 from '../assets/photos/p3.jpg';
import r16 from '../assets/photos/r16.jpg';
import r119 from '../assets/photos/r119.jpg';
import r55 from '../assets/photos/r55.jpg';
import r74 from '../assets/photos/r74.jpg';
import r46 from '../assets/photos/r46.jpg';
import p10 from '../assets/photos/p10.jpg';
import p11 from '../assets/photos/p11.jpg';
import p13 from '../assets/photos/p13.jpg';
import e5 from '../assets/photos/e5.jpg';
import e6 from '../assets/photos/e6.jpg';

export interface Room {
  slug: string;
  title: string;
  text: string;
  accent: Accent;
  /** One photo (4:3), or two for a duo (4:3 + 1:1). */
  photos: [ImageMetadata] | [ImageMetadata, ImageMetadata];
  alt: string;
}

// Räume page — rows alternate and take the accents in the design's order.
export const rooms: Room[] = [
  {
    slug: 'chill-lounge',
    title: 'Chill-Lounge',
    text: 'Herz der MatriX: Sofas, Kicker, Billard, Dart und das große X an der Wand. Hier triffst du deine Leute, zockst eine Runde oder machst einfach mal nichts.',
    accent: 'yellow',
    photos: [r128],
    alt: 'Die Chill-Lounge mit Sitzreihe vor dem X-Wandbild',
  },
  {
    slug: 'theke-kueche',
    title: 'Theke & Küche',
    text: 'An der X-Bar gibt’s Getränke und Snacks zu kleinen Preisen. In der Küche kochen wir zusammen – und manchmal wird’s richtig gut.',
    accent: 'blue',
    photos: [r161],
    alt: 'Die X-Bar mit Theke und Getränkekühlschrank',
  },
  {
    slug: 'maedchenzimmer',
    title: 'Mädchenzimmer',
    text: 'Ein eigener Raum nur für Mädchen: zum Quatschen, Basteln, Ausruhen und für Projekte, die ihr selbst plant.',
    accent: 'purple',
    photos: [r29],
    alt: 'Das Mädchenzimmer mit Sofa und Fotowand',
  },
  {
    slug: 'werkstatt',
    title: 'Werkstatt',
    text: 'Werkbänke, Siebdruck, Fahrradständer und jede Menge Werkzeug. Bring eine Idee mit – wir zeigen dir, wie du sie baust.',
    accent: 'coral',
    photos: [p3, r16],
    alt: 'Die Werkstatt mit Werkbänken und Akkuschrauber',
  },
  {
    slug: 'saal',
    title: 'Saal',
    text: 'Bühne, Licht und Platz für alle: Konzerte, Theater, Tanz und Partys. Der Saal ist unser größter Raum.',
    accent: 'blue',
    photos: [r119],
    alt: 'Der Saal mit Bühne',
  },
  {
    slug: 'studio-band',
    title: 'Studio & Band',
    text: 'Tonstudio und Proberaum mit Schlagzeug, Amps und Mischpult. Nimm deine Songs auf oder starte mit Freunden eine Band.',
    accent: 'pink',
    photos: [r55, r74],
    alt: 'Tonstudio mit Mischpult und Proberaum mit Schlagzeug',
  },
  {
    slug: 'gruppenraum',
    title: 'Gruppenraum',
    text: 'Gemütlicher Raum für Gruppen, Workshops und Besprechungen – mit Chesterfield-Sofas und viel Tageslicht.',
    accent: 'green',
    photos: [r46],
    alt: 'Der Gruppenraum mit Chesterfield-Sofas',
  },
];

export interface MapSpot {
  title: string;
  /** Hotspot position in % of the map art. */
  x: number;
  y: number;
  image: ImageMetadata;
  alt: string;
  text: string;
  link: { label: string; href: string };
}

// Landing page campus map. Positions come from the design reference.
export const mapSpots: MapSpot[] = [
  {
    title: 'Werkstatt', x: 18.7, y: 59.2, image: p3, alt: 'Die Werkstatt',
    text: 'Siebdruck, Holz, Fahrrad und 3D-Druck – hier wird gebaut, gedruckt und geschraubt.',
    link: { label: 'Zur Werkstatt', href: '/werkstatt/' },
  },
  {
    title: 'Garten', x: 27.2, y: 42.2, image: e5, alt: 'Die MatriX von oben mit Garten',
    text: 'Rund ums Haus ist Platz für Grillen, Sport und Sommerfeste unter freiem Himmel.',
    link: { label: 'Zu den Räumen', href: '/raeume/' },
  },
  {
    title: 'Saal', x: 44.6, y: 55.5, image: p10, alt: 'Der Saal',
    text: 'Unser größter Raum: Konzerte, Partys, Tanz und Turniere.',
    link: { label: 'Zum Saal', href: '/raeume/#saal' },
  },
  {
    title: 'Theater-Bühne', x: 51.3, y: 38.4, image: r119, alt: 'Die Bühne im Saal',
    text: 'Bühne, Licht und Technik – für Theater, Open Stage und deinen großen Auftritt.',
    link: { label: 'Zum Saal', href: '/raeume/#saal' },
  },
  {
    title: 'Studio', x: 61.0, y: 52.8, image: r55, alt: 'Das Tonstudio',
    text: 'Tonstudio und Proberaum: Nimm deine Songs auf oder probe mit deiner Band.',
    link: { label: 'Zum Studio', href: '/raeume/#studio-band' },
  },
  {
    title: 'Dachterrasse', x: 68.8, y: 11.4, image: e6, alt: 'Die MatriX von oben',
    text: 'Oben auf dem Haus: Aussicht, frische Luft und Platz für Sommerabende.',
    link: { label: 'Zu den Räumen', href: '/raeume/' },
  },
  {
    title: 'Chill-Lounge', x: 80.3, y: 46.1, image: p11, alt: 'Die Chill-Lounge',
    text: 'Sofas, Kicker, Billard und Dart – hier triffst du deine Leute.',
    link: { label: 'Zur Chill-Lounge', href: '/raeume/#chill-lounge' },
  },
  {
    title: 'Eingang', x: 57.8, y: 82.7, image: p13, alt: 'Der Eingangsbereich mit der X-Bar',
    text: 'Rein, Hallo sagen, umschauen. An der X-Bar gibt’s Getränke und Snacks.',
    link: { label: 'Zu Theke & Küche', href: '/raeume/#theke-kueche' },
  },
];
