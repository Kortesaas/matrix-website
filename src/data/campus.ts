import type { ImageMetadata } from 'astro';
import { campusPlanRooms } from './campus-plan.js';

import saal from '../assets/campus/room-saal.jpg';
import foyer from '../assets/photos/r128.jpg';
import theke from '../assets/photos/r161.jpg';
import werkstatt from '../assets/photos/p3.jpg';
import maedchenzimmer from '../assets/photos/r29.jpg';
import gruppenraum from '../assets/photos/r46.jpg';
import tonstudio from '../assets/photos/r55.jpg';
import bandraum from '../assets/photos/r74.jpg';

/** Where a marker sits in the 3D model. */
export type CampusAnchor =
  /** A room inside the house, in floor-plan pixels (the model maps them with (x − 1005) / 42). */
  | { plan: [number, number]; height?: number }
  /** A spot outside the house, in scene units. */
  | { scene: [number, number, number] };

export interface CampusRoom {
  /** Shares its id with the floor-plan polygon and highlight. */
  id: keyof typeof campusPlanRooms | 'basketball';
  title: string;
  /** One-sentence description for the compact map preview. */
  summary: string;
  text: string;
  /** Room photo; without one the card shows the court illustration. */
  image?: ImageMetadata;
  alt?: string;
  anchor: CampusAnchor;
  /** Outdoor spots don't open the house. */
  outdoor?: boolean;
  link?: { label: string; href: string };
}

// Room identities follow the labeled floor plan; photos match the Räume page.
// Photos: @aboutusmedia.
export const campusRooms: CampusRoom[] = [
  {
    id: 'saal',
    title: 'Saal',
    summary: 'Bühne frei für Konzerte, Tanz und deine Ideen.',
    text: 'Viel Platz und eine Bühne mit Lichttechnik: der große Raum der MatriX für Musik, Bewegung und gemeinsame Veranstaltungen.',
    image: saal,
    alt: 'Der Saal mit Bühne',
    anchor: campusPlanRooms.saal.anchor,
    link: { label: 'Zum Saal', href: '/raeume/#saal' },
  },
  {
    id: 'foyer',
    title: 'Foyer',
    summary: 'Leute treffen, Billard spielen und gemeinsam chillen.',
    text: 'Ankommen, Leute treffen und zusammen Zeit verbringen. Mit Sofaecken, Billard und Kicker ist hier Platz für eine Pause oder eine kleine Spielrunde.',
    image: foyer,
    alt: 'Die Chill-Lounge im Foyer',
    anchor: campusPlanRooms.foyer.anchor,
    link: { label: 'Zur Chill-Lounge', href: '/raeume/#chill-lounge' },
  },
  {
    id: 'theke',
    title: 'Theke',
    summary: 'Dein Platz für Getränke und eine Pause mit Freunden.',
    text: 'Die lange Theke mitten im offenen Bereich. Ein Platz zum Zusammensitzen, Reden und für eine Pause zwischendurch.',
    image: theke,
    alt: 'Die lange Theke der X-Bar',
    anchor: campusPlanRooms.theke.anchor,
    link: { label: 'Zu Theke & Küche', href: '/raeume/#theke-kueche' },
  },
  {
    id: 'tonstudio',
    title: 'Tonstudio',
    summary: 'Nimm deine Stimme, deinen Song oder deinen Podcast auf.',
    text: 'Mikrofone, Mischpult und Aufnahmetechnik für deine eigenen Sounds. Das Tonstudio liegt direkt neben dem Bandraum.',
    image: tonstudio,
    alt: 'Tonstudio mit Mischpult und Aufnahmetechnik',
    anchor: campusPlanRooms.tonstudio.anchor,
    link: { label: 'Zum Tonstudio', href: '/raeume/#studio-band' },
  },
  {
    id: 'bandraum',
    title: 'Bandraum',
    summary: 'Zusammen proben und euren eigenen Sound finden.',
    text: 'Ein eigener Proberaum mit Schlagzeug und Musiktechnik für eure Band und gemeinsame Sessions.',
    image: bandraum,
    alt: 'Bandraum mit Schlagzeug und Instrumenten',
    anchor: campusPlanRooms.bandraum.anchor,
    link: { label: 'Zum Bandraum', href: '/raeume/#studio-band' },
  },
  {
    id: 'gruppenraum',
    title: 'Gruppenraum',
    summary: 'Platz für deine Gruppe, Workshops und gemeinsame Ideen.',
    text: 'Ein gemütlicher Raum für Gruppen, Workshops und Besprechungen mit Sofas und viel Tageslicht.',
    image: gruppenraum,
    alt: 'Der Gruppenraum mit Chesterfield-Sofas',
    anchor: campusPlanRooms.gruppenraum.anchor,
    link: { label: 'Zum Gruppenraum', href: '/raeume/#gruppenraum' },
  },
  {
    id: 'werkstatt',
    title: 'Werkstatt',
    summary: 'Hier wird gebaut, repariert und kreativ ausprobiert.',
    text: 'Werkbänke, Werkzeug und jede Menge Materialien. Hier dreht sich alles ums Ausprobieren, Bauen und kreative Ideen.',
    image: werkstatt,
    alt: 'Die Werkstatt mit Werkbänken und Regalen',
    anchor: campusPlanRooms.werkstatt.anchor,
    link: { label: 'Zur Werkstatt', href: '/werkstatt/' },
  },
  {
    id: 'maedchenzimmer',
    title: 'Mädchenzimmer',
    summary: 'Dein Raum zum Quatschen, Ausruhen und Kreativsein.',
    text: 'Ein eigener Raum für Mädchen: zum Zusammensitzen, Basteln, Entspannen und für Projekte, die ihr selbst plant.',
    image: maedchenzimmer,
    alt: 'Das Mädchenzimmer mit Sofa und Fotowand',
    anchor: campusPlanRooms.maedchenzimmer.anchor,
    link: { label: 'Zum Mädchenzimmer', href: '/raeume/#maedchenzimmer' },
  },
  {
    id: 'basketball',
    title: 'Basketball',
    summary: 'Komm raus und wirf ein paar Körbe mit uns.',
    text: 'Direkt neben der MatriX liegt der runde Basketballplatz mit zwei Körben. Draußen zusammen spielen oder einfach ein paar Würfe üben.',
    anchor: { scene: [-39.5, 0.2, 3] },
    outdoor: true,
  },
];
