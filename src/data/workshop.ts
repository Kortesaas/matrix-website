import type { ImageMetadata } from 'astro';

import r10 from '../assets/photos/r10.jpg';
import r20 from '../assets/photos/r20.jpg';
import r170 from '../assets/photos/r170.jpg';
import r16 from '../assets/photos/r16.jpg';
import r86 from '../assets/photos/r86.jpg';
import r96 from '../assets/photos/r96.jpg';
import r155 from '../assets/photos/r155.jpg';
import r18 from '../assets/photos/r18.jpg';
import r90 from '../assets/photos/r90.jpg';

export interface WorkshopArea {
  slug: string;
  title: string;
  text: string;
  photos: [ImageMetadata] | [ImageMetadata, ImageMetadata];
  alt: string;
}

// Werkstatt detail page. Photos are placeholders.
export const workshopAreas: WorkshopArea[] = [
  {
    slug: 'siebdruck',
    title: 'Siebdruck',
    text: 'Eigene Shirts, Beutel und Poster: Du lernst, Motive zu belichten, Farben zu mischen und sauber zu drucken. Bring deine Idee mit. Den Rest zeigen wir dir.',
    photos: [r10, r20],
    alt: 'Siebdruck',
  },
  {
    slug: 'fahrrad',
    title: 'Fahrrad',
    text: 'Platten, Kette, Bremsen: In der Selbsthilfe-Werkstatt reparierst du dein Rad selbst, mit Werkzeug, Ersatzteilen und jemandem, der dir hilft.',
    photos: [r170],
    alt: 'Fahrradwerkstatt',
  },
  {
    slug: 'elektrotechnik',
    title: 'Elektrotechnik',
    text: 'Löten, Schalten, Programmieren: Vom ersten Stromkreis bis zum kleinen Roboter lernst du hier, wie Technik funktioniert.',
    photos: [r16],
    alt: 'Elektrotechnik',
  },
  {
    slug: 'holzbearbeitung',
    title: 'Holzbearbeitung',
    text: 'Sägen, schleifen, bauen: An der Werkbank entsteht, was du dir vornimmst: Regale, Skateboard-Rampen oder Möbel aus Paletten.',
    photos: [r86, r96],
    alt: 'Holzbearbeitung',
  },
  {
    slug: '3d-druck',
    title: '3D-Druck',
    text: 'Vom Entwurf am Rechner zum fertigen Teil: Du lernst modellieren und druckst Ersatzteile, Figuren oder Prototypen.',
    photos: [r155],
    alt: '3D-Drucker',
  },
  {
    slug: 'sprayen-malen',
    title: 'Sprayen & Malen',
    text: 'Wand, Leinwand oder Skizzenbuch: Mit Dosen, Pinseln und Schablonen probierst du dich drinnen und draußen aus.',
    photos: [r18, r90],
    alt: 'Sprayen und Malen',
  },
];
