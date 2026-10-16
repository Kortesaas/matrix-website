import type { ImageMetadata } from 'astro';

import p10 from '../assets/photos/p10.jpg';
import p11 from '../assets/photos/p11.jpg';
import r20 from '../assets/photos/r20.jpg';
import r29 from '../assets/photos/r29.jpg';
import r30 from '../assets/photos/r30.jpg';
import r46 from '../assets/photos/r46.jpg';
import r55 from '../assets/photos/r55.jpg';
import r74 from '../assets/photos/r74.jpg';
import r113 from '../assets/photos/r113.jpg';
import r118 from '../assets/photos/r118.jpg';
import r119 from '../assets/photos/r119.jpg';
import r123 from '../assets/photos/r123.jpg';
import r128 from '../assets/photos/r128.jpg';
import r142 from '../assets/photos/r142.jpg';
import r151 from '../assets/photos/r151.jpg';
import r161 from '../assets/photos/r161.jpg';
import r170 from '../assets/photos/r170.jpg';

export interface RoomSection {
  slug: string;
  title: string;
  text?: string;
  /** Leave out on the one section whose media is the room's little game. */
  photos?: [ImageMetadata] | [ImageMetadata, ImageMetadata];
  alt?: string;
}

export interface RoomPageContent {
  hero: ImageMetadata;
  heroAlt: string;
  sections: RoomSection[];
}

// Section copy stays example text until the final texts arrive (see the
// supplied room PDFs for the intended topics).
export const roomSectionText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris eget ante non neque pellentesque tincidunt. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae. Aliquam erat volutpat. Sed tempus, tortor sed facilisis sollicitudin, sapien purus efficitur nisl, eget finibus lacus neque sed velit.';

/** Detail pages, keyed by the slug in `rooms.ts`. */
export const roomPages = {
  'chill-lounge': {
    hero: r142,
    heroAlt: 'Die Chill-Lounge mit Sofas, Kicker und Tischtennisplatte',
    sections: [
      { slug: 'austausch', title: 'Austausch', photos: [r128], alt: 'Sitzreihe vor dem großen X-Wandbild' },
      { slug: 'tischtennis', title: 'Tischtennis & Sofas', photos: [p11], alt: 'Lounge mit Tischtennisplatte und Sofas' },
      { slug: 'zocken', title: 'Zocken' },
      { slug: 'spiele', title: 'Brettspiele', photos: [r151], alt: 'Ein Stapel Brettspiele' },
    ],
  },
  'theke-kueche': {
    hero: r161,
    heroAlt: 'Die X-Bar mit Theke und Getränkekühlschrank',
    sections: [
      { slug: 'x-bar', title: 'Die X-Bar', photos: [r118], alt: 'Die Kreidetafel mit Getränken und Preisen an der X-Bar' },
      { slug: 'verleih', title: 'Verleih', photos: [r170], alt: 'Fahrräder und Roller zum Ausleihen' },
    ],
  },
  maedchenzimmer: {
    hero: r29,
    heroAlt: 'Das Mädchenzimmer mit Sofa, Teppich und Fotowand',
    sections: [
      { slug: 'safe-space', title: 'Girls’ Safe Space', photos: [r30], alt: 'Collage aus Fotos und Postkarten an der Wand' },
      { slug: 'kreativitaet', title: 'Kreativität' },
      { slug: 'austausch', title: 'Austausch', photos: [r20], alt: 'Pinsel und Farben im Regal' },
    ],
  },
  saal: {
    hero: p10,
    heroAlt: 'Der Saal mit Bühne, Traversen und Parkettboden',
    sections: [
      { slug: 'veranstaltungen', title: 'Veranstaltungen', photos: [r119], alt: 'Die Bühne im Saal' },
      { slug: 'party', title: 'Konzerte & Partys', photos: [r123], alt: 'Discokugel an der Traverse' },
      { slug: 'technik', title: 'Technikausstattung', photos: [r113], alt: 'Aufgerollte Kabel an der Wand' },
    ],
  },
  'studio-band': {
    hero: r74,
    heroAlt: 'Der Bandproberaum mit Schlagzeug und Verstärkern',
    sections: [
      { slug: 'abmischplatz', title: 'Abmischplatz', photos: [r55], alt: 'Mischpult und Studiomonitore im Tonstudio' },
      { slug: 'jammen', title: 'Einfach mal jammen' },
      { slug: 'aufnahme', title: 'Aufnahmen', photos: [r113], alt: 'Kabel für Mikrofone und Instrumente' },
    ],
  },
  gruppenraum: {
    hero: r46,
    heroAlt: 'Der Gruppenraum mit Chesterfield-Sofas und großem Fenster',
    sections: [
      { slug: 'spieleabend', title: 'Spieleabende', photos: [r151], alt: 'Ein Stapel Brettspiele' },
      { slug: 'planen', title: 'Meetings & Planen' },
    ],
  },
} satisfies Record<string, RoomPageContent>;
