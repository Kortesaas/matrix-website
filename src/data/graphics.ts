// Decorative artwork from the design handoff, served as-is from /public/graphics.
// Sizes are the intrinsic SVG sizes so the browser can reserve space.

export const graphics = {
  "aktuelles-hero-deco": { src: "/graphics/heroes/aktuelles-hero-deco.svg", width: 1920, height: 1020 },
  "angebot-hero-deco": { src: "/graphics/heroes/angebot-hero-deco.svg", width: 1920, height: 1020 },
  "raeume-hero-deco": { src: "/graphics/heroes/raeume-hero-deco.svg", width: 1920, height: 1020 },
  "rainbow-clouds": { src: "/graphics/heroes/rainbow-clouds.svg", width: 1920, height: 1020 },
  "rechtliches-hero-deco": { src: "/graphics/heroes/rechtliches-hero-deco.svg", width: 1920, height: 1120 },
  "team-hero-deco": { src: "/graphics/heroes/team-hero-deco.svg", width: 1920, height: 1020 },
  "retro-computer": { src: "/graphics/illustrations/retro-computer.svg", width: 635, height: 509 },
  "x-mark": { src: "/graphics/logos/x-mark.svg", width: 203, height: 253 },
  "bolt-yellow": { src: "/graphics/shapes/bolt-yellow.svg", width: 59, height: 107 },
  squiggle: { src: "/graphics/shapes/squiggle.svg", width: 260, height: 290 },
  "star-green": { src: "/graphics/shapes/star-green.svg", width: 81, height: 98 },
  "star-pink": { src: "/graphics/shapes/star-pink.svg", width: 78, height: 79 },
  "triangle-cyan": { src: "/graphics/shapes/triangle-cyan.svg", width: 398, height: 367 },
  "triangle-pink": { src: "/graphics/shapes/triangle-pink.svg", width: 622, height: 552 },
  "triangle-purple": { src: "/graphics/shapes/triangle-purple.svg", width: 476, height: 478 },
  "triangle-yellow": { src: "/graphics/shapes/triangle-yellow.svg", width: 476, height: 439 },
  "zigzag-pink": { src: "/graphics/shapes/zigzag-pink.svg", width: 118, height: 106 },
  "zigzag-yellow": { src: "/graphics/shapes/zigzag-yellow.svg", width: 121, height: 110 },
  "cat-hi": { src: "/graphics/stickers/cat-hi.svg", width: 193, height: 253 },
  "daisy-face": { src: "/graphics/stickers/daisy-face.svg", width: 196, height: 198 },
  "dino-camera": { src: "/graphics/stickers/dino-camera.svg", width: 180, height: 151 },
  "dino-pez": { src: "/graphics/stickers/dino-pez.svg", width: 139, height: 265 },
  "dino-wave": { src: "/graphics/stickers/dino-wave.svg", width: 236, height: 251 },
  "egg-hi": { src: "/graphics/stickers/egg-hi.svg", width: 385, height: 331 },
  flame: { src: "/graphics/stickers/flame.svg", width: 208, height: 226 },
  "flower-face": { src: "/graphics/stickers/flower-face.svg", width: 188, height: 192 },
  flowers: { src: "/graphics/stickers/flowers.svg", width: 211, height: 192 },
  "hand-point": { src: "/graphics/stickers/hand-point.svg", width: 70, height: 74 },
  "heart-bubble": { src: "/graphics/stickers/heart-bubble.svg", width: 112, height: 136 },
  "skater-yeah": { src: "/graphics/stickers/skater-yeah.svg", width: 398, height: 339 },
  "sun-omg": { src: "/graphics/stickers/sun-omg.svg", width: 385, height: 279 },
} as const;

export type GraphicName = keyof typeof graphics;
