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

// The six activity sections follow the supplied Werkstatt reference.
// Descriptions intentionally remain example copy until final text is available.
export const workshopExampleText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris eget ante non neque pellentesque tincidunt. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae. Aliquam erat volutpat. Sed tempus, tortor sed facilisis sollicitudin, sapien purus efficitur nisl, eget finibus lacus neque sed velit.';

export const workshopAreas: WorkshopArea[] = [
  {
    slug: 'siebdruck',
    title: 'Siebdruck',
    text: workshopExampleText,
    photos: [r10, r20],
    alt: 'Siebdruck',
  },
  {
    slug: 'fahrrad',
    title: 'Fahrrad',
    text: workshopExampleText,
    photos: [r170],
    alt: 'Fahrradwerkstatt',
  },
  {
    slug: 'elektrotechnik',
    title: 'Elektrotechnik',
    text: workshopExampleText,
    photos: [r16],
    alt: 'Elektrotechnik',
  },
  {
    slug: 'holzbearbeitung',
    title: 'Holzbearbeitung',
    text: workshopExampleText,
    photos: [r86, r96],
    alt: 'Holzbearbeitung',
  },
  {
    slug: '3d-druck',
    title: '3D-Druck',
    text: workshopExampleText,
    photos: [r155],
    alt: '3D-Drucker',
  },
  {
    slug: 'sprayen-malen',
    title: 'Sprayen & Malen',
    text: workshopExampleText,
    photos: [r18, r90],
    alt: 'Sprayen und Malen',
  },
];
