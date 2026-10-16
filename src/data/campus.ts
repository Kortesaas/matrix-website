import type { ImageMetadata } from 'astro';

import saal from '../assets/campus/room-saal.jpg';
import treffpunkt from '../assets/campus/room-treffpunkt.jpg';
import bar from '../assets/campus/room-bar.jpg';
import werkstatt from '../assets/campus/room-werkstatt.jpg';
import chillout from '../assets/campus/room-chillout.jpg';
import medien from '../assets/campus/room-medienraum.jpg';
import musik from '../assets/campus/room-musik.jpg';

/** Where a marker sits in the 3D model. */
export type CampusAnchor =
  /** A room inside the house, in floor-plan pixels (the model maps them with (x − 1005) / 42). */
  | { plan: [number, number]; height?: number }
  /** A spot outside the house, in scene units. */
  | { scene: [number, number, number] };

export interface CampusRoom {
  /** Must match the room ids of the 3D highlights (saal, treffpunkt, bar, werkstatt, chillout, medien, musik). */
  id: string;
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

// Room uses and photo-to-room mapping are approximate — verify with the MatriX team.
// Photos: @aboutusmedia.
export const campusRooms: CampusRoom[] = [
  {
    id: 'saal',
    title: 'Saal',
    summary: 'Bühne frei für Konzerte, Tanz und deine Ideen.',
    text: 'Viel Platz und eine Bühne mit Lichttechnik: der große Raum der MatriX für Musik, Bewegung und gemeinsame Veranstaltungen.',
    image: saal,
    alt: 'Der Saal mit Bühne',
    anchor: { plan: [490, 280], height: 6.1 },
    link: { label: 'Zum Saal', href: '/raeume/#saal' },
  },
  {
    id: 'treffpunkt',
    title: 'Offener Treff',
    summary: 'Leute treffen, Billard spielen und gemeinsam chillen.',
    text: 'Ankommen, Leute treffen und zusammen Zeit verbringen. Mit Sofaecken, Billard und Kicker ist hier Platz für eine Pause oder eine kleine Spielrunde.',
    image: treffpunkt,
    alt: 'Der offene Treff mit Sofas und Kicker',
    anchor: { plan: [360, 715] },
    link: { label: 'Zur Chill-Lounge', href: '/raeume/#chill-lounge' },
  },
  {
    id: 'bar',
    title: 'X-Bar',
    summary: 'Dein Platz für Getränke und eine Pause mit Freunden.',
    text: 'Die lange Theke mitten im offenen Bereich. Ein Platz zum Zusammensitzen, Reden und für eine Pause zwischendurch.',
    image: bar,
    alt: 'Die lange Theke der X-Bar',
    anchor: { plan: [820, 1040] },
    link: { label: 'Zu Theke & Küche', href: '/raeume/#theke-kueche' },
  },
  {
    id: 'werkstatt',
    title: 'Werkstatt',
    summary: 'Hier wird gebaut, repariert und kreativ ausprobiert.',
    text: 'Werkbänke, Werkzeug und jede Menge Materialien. Hier dreht sich alles ums Ausprobieren, Bauen und kreative Ideen.',
    image: werkstatt,
    alt: 'Die Werkstatt mit Werkbänken und Regalen',
    anchor: { plan: [1690, 630] },
    link: { label: 'Zur Werkstatt', href: '/werkstatt/' },
  },
  {
    id: 'chillout',
    title: 'Chillout',
    summary: 'Mach’s dir auf dem Sofa gemütlich und schalte ab.',
    text: 'Sofas, Kunst an den Wänden und ein bisschen Abstand vom Trubel. Eine gemütliche Ecke zum Abschalten und Zusammensitzen.',
    image: chillout,
    alt: 'Der Chillout-Raum mit Sofas und Bildern',
    anchor: { plan: [1680, 820] },
    link: { label: 'Zu den Räumen', href: '/raeume/' },
  },
  {
    id: 'medien',
    title: 'Medienraum',
    summary: 'Zusammen zocken und Medien entdecken.',
    text: 'Eine Sofaecke und ein großer Bildschirm. Der Raum bietet einen gemütlichen Rahmen für gemeinsame Medien- und Spielpausen.',
    image: medien,
    alt: 'Der Medienraum mit Sofa und Bildschirm',
    anchor: { plan: [1660, 420] },
    link: { label: 'Zu den Räumen', href: '/raeume/' },
  },
  {
    id: 'musik',
    title: 'Musikräume',
    summary: 'Hier ist Platz für Bandproben und deinen eigenen Sound.',
    text: 'Schlagzeug, Mikrofone und Musiktechnik. In diesem Bereich geht es um gemeinsame Sounds, Proben und eigene musikalische Ideen.',
    image: musik,
    alt: 'Ein Musikraum mit Schlagzeug',
    anchor: { plan: [1665, 145] },
    link: { label: 'Zu Studio & Band', href: '/raeume/#studio-band' },
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
