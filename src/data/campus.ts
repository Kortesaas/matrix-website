import type { ImageMetadata } from 'astro';
import { campusPlanRooms } from './campus-plan.js';

import saal from '../assets/campus/room-saal.jpg';
import foyer from '../assets/photos/r128.jpg';
import theke from '../assets/photos/r161.jpg';
import werkstatt from '../assets/photos/p3.jpg';
import maedchenzimmer from '../assets/photos/r29.jpg';
import gruppenraum from '../assets/photos/r46.jpg';
import tonstudio from '../assets/photos/r55.jpg';

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

// Room identities follow the labeled floor plan; titles match the room pages
// (studio and band room share one marker, like they share one page).
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
    link: { label: 'Zum Saal', href: '/saal/' },
  },
  {
    id: 'foyer',
    title: 'Chill-Lounge',
    summary: 'Leute treffen, Billard spielen und gemeinsam chillen.',
    text: 'Ankommen, Leute treffen und zusammen Zeit verbringen. Mit Sofaecken, Billard und Kicker ist hier Platz für eine Pause oder eine kleine Spielrunde.',
    image: foyer,
    alt: 'Die Chill-Lounge im Foyer',
    anchor: campusPlanRooms.foyer.anchor,
    link: { label: 'Zur Chill-Lounge', href: '/chill-lounge/' },
  },
  {
    id: 'theke',
    title: 'Theke & Küche',
    summary: 'Dein Platz für Getränke und eine Pause mit Freunden.',
    text: 'Die lange Theke mitten im offenen Bereich. Ein Platz zum Zusammensitzen, Reden und für eine Pause zwischendurch.',
    image: theke,
    alt: 'Die lange Theke der X-Bar',
    anchor: campusPlanRooms.theke.anchor,
    link: { label: 'Zu Theke & Küche', href: '/theke-kueche/' },
  },
  {
    id: 'tonstudio',
    title: 'Studio & Band',
    summary: 'Proben, aufnehmen und deinen eigenen Sound finden.',
    text: 'Tonstudio mit Mischpult und Aufnahmetechnik, direkt daneben der Proberaum mit Schlagzeug für eure Band.',
    image: tonstudio,
    alt: 'Tonstudio mit Mischpult und Aufnahmetechnik',
    // Between the studio and the band room, which share this marker.
    anchor: { plan: [1665, 150] },
    link: { label: 'Zu Studio & Band', href: '/studio-band/' },
  },
  {
    id: 'gruppenraum',
    title: 'Gruppenraum',
    summary: 'Platz für deine Gruppe, Workshops und gemeinsame Ideen.',
    text: 'Ein gemütlicher Raum für Gruppen, Workshops und Besprechungen mit Sofas und viel Tageslicht.',
    image: gruppenraum,
    alt: 'Der Gruppenraum mit Chesterfield-Sofas',
    // The three east rooms are staggered inside their rooms so their markers
    // don't crowd each other in the 3D view.
    anchor: { ...campusPlanRooms.gruppenraum.anchor, plan: [1760, 435] },
    link: { label: 'Zum Gruppenraum', href: '/gruppenraum/' },
  },
  {
    id: 'werkstatt',
    title: 'Werkstatt',
    summary: 'Hier wird gebaut, repariert und kreativ ausprobiert.',
    text: 'Werkbänke, Werkzeug und jede Menge Materialien. Hier dreht sich alles ums Ausprobieren, Bauen und kreative Ideen.',
    image: werkstatt,
    alt: 'Die Werkstatt mit Werkbänken und Regalen',
    anchor: { ...campusPlanRooms.werkstatt.anchor, plan: [1640, 630] },
    link: { label: 'Zur Werkstatt', href: '/werkstatt/' },
  },
  {
    id: 'maedchenzimmer',
    title: 'Mädchenzimmer',
    summary: 'Dein Raum zum Quatschen, Ausruhen und Kreativsein.',
    text: 'Ein eigener Raum für Mädchen: zum Zusammensitzen, Basteln, Entspannen und für Projekte, die ihr selbst plant.',
    image: maedchenzimmer,
    alt: 'Das Mädchenzimmer mit Sofa und Fotowand',
    anchor: { ...campusPlanRooms.maedchenzimmer.anchor, plan: [1520, 815] },
    link: { label: 'Zum Mädchenzimmer', href: '/maedchenzimmer/' },
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
