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

export interface Room {
  slug: string;
  title: string;
  text: string;
  accent: Accent;
  /** One photo (4:3), or two for a duo (4:3 + 1:1). */
  photos: [ImageMetadata] | [ImageMetadata, ImageMetadata];
  alt: string;
  /** Detail page. */
  href: string;
}

// Räume page — rows alternate and take the accents in the design's order.
export const rooms: Room[] = [
  {
    slug: 'chill-lounge',
    href: '/chill-lounge/',
    title: 'Chill-Lounge',
    text: 'Herz der MatriX: Sofas, Kicker, Billard, Dart und das große X an der Wand. Hier triffst du deine Leute, zockst eine Runde oder machst einfach mal nichts.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Integer sit amet lectus vel enim consequat facilisis. Donec vitae justo at neque interdum consequat. Sed euismod, nibh at varius volutpat, erat lorem fermentum nibh, vitae tincidunt sapien velit sed arcu. Nulla facilisi. Praesent vel risus quis lectus tincidunt posuere. Cras sit amet tellus a libero tincidunt sodales.',
    accent: 'yellow',
    photos: [r128],
    alt: 'Die Chill-Lounge mit Sitzreihe vor dem X-Wandbild',
  },
  {
    slug: 'theke-kueche',
    href: '/theke-kueche/',
    title: 'Theke & Küche',
    text: 'An der X-Bar gibt’s Getränke und Snacks zu kleinen Preisen. In der Küche kochen wir zusammen, und manchmal wird’s richtig gut.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris eget ante non neque pellentesque tincidunt. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae. Aliquam erat volutpat. Sed tempus, tortor sed facilisis sollicitudin, sapien purus efficitur nisl, eget finibus lacus neque sed velit. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Curabitur at commodo sem, sed vulputate justo. Nam sit amet erat vel orci viverra cursus.',
    accent: 'blue',
    photos: [r161],
    alt: 'Die X-Bar mit Theke und Getränkekühlschrank',
  },
  {
    slug: 'maedchenzimmer',
    href: '/maedchenzimmer/',
    title: 'Mädchenzimmer',
    text: 'Ein eigener Raum nur für Mädchen: zum Quatschen, Basteln, Ausruhen und für Projekte, die ihr selbst plant.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean euismod, augue quis posuere interdum, risus lorem consequat nibh, vitae dapibus tellus mi sed erat. Phasellus commodo purus eu turpis varius, sit amet pellentesque augue bibendum. Nam non lacus quis elit finibus mollis. Etiam consequat lacus sed justo malesuada, at consectetur felis faucibus.',
    accent: 'purple',
    photos: [r29],
    alt: 'Das Mädchenzimmer mit Sofa und Fotowand',
  },
  {
    slug: 'werkstatt',
    href: '/werkstatt/',
    title: 'Werkstatt',
    text: 'Werkbänke, Siebdruck, Fahrradständer und jede Menge Werkzeug. Bring eine Idee mit. Wir zeigen dir, wie du sie baust.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. Fusce sollicitudin sem at orci dictum, eget placerat nisl ultrices. Proin sed augue ac ipsum dignissim volutpat. Quisque eget tellus purus. Maecenas euismod nibh at risus eleifend, et hendrerit magna varius. Sed viverra felis quis mi posuere, quis malesuada urna fringilla. Donec feugiat libero vel velit faucibus, vitae interdum risus consequat. Vestibulum id justo nisl. Vivamus sagittis nibh ut magna efficitur porttitor.',
    accent: 'coral',
    photos: [p3, r16],
    alt: 'Die Werkstatt mit Werkbänken und Akkuschrauber',
  },
  {
    slug: 'saal',
    href: '/saal/',
    title: 'Saal',
    text: 'Bühne, Licht und Platz für alle: Konzerte, Theater, Tanz und Partys. Der Saal ist unser größter Raum.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse potenti. Morbi tempus neque nec lacus porttitor, in consectetur mauris accumsan. Donec vel metus ut sem volutpat aliquam. Nunc elementum lectus a lorem fringilla feugiat. Praesent blandit massa ut magna posuere, sed fermentum leo sodales. Duis id lacus ut justo iaculis mollis. Integer dignissim libero a leo efficitur, a eleifend risus malesuada.',
    accent: 'blue',
    photos: [r119],
    alt: 'Der Saal mit Bühne',
  },
  {
    slug: 'studio-band',
    href: '/studio-band/',
    title: 'Studio & Band',
    text: 'Tonstudio und Proberaum mit Schlagzeug, Amps und Mischpult. Nimm deine Songs auf oder starte mit Freunden eine Band.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc aliquet purus in erat aliquam consequat. Pellentesque vitae leo sit amet nibh ultricies consequat. Cras pharetra erat at justo cursus, vel facilisis risus lobortis. Aenean at sapien ac enim convallis tempus. Ut feugiat consequat sem, eget porttitor tortor volutpat at. Vivamus lacinia tellus sed mi faucibus aliquam. Nullam nec dolor at risus tincidunt luctus. Sed quis turpis eget justo varius consequat. Proin vitae ligula nec arcu sodales vestibulum.',
    accent: 'pink',
    photos: [r55, r74],
    alt: 'Tonstudio mit Mischpult und Proberaum mit Schlagzeug',
  },
  {
    slug: 'gruppenraum',
    href: '/gruppenraum/',
    title: 'Gruppenraum',
    text: 'Gemütlicher Raum für Gruppen, Workshops und Besprechungen mit Chesterfield-Sofas und viel Tageslicht.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum consectetur risus ac eros hendrerit, eget malesuada nibh molestie. Nam tincidunt sapien ac ipsum elementum, sed posuere massa hendrerit. Sed sed justo quis felis dignissim aliquet. Ut laoreet sem vel nisl vulputate, quis vulputate lacus placerat. Aliquam ornare lectus sed lacus tincidunt efficitur. Aenean at purus et mauris finibus varius.',
    accent: 'green',
    photos: [r46],
    alt: 'Der Gruppenraum mit Chesterfield-Sofas',
  },
];
