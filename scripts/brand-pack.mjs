/**
 * Builds the CI pack for designers: logo exports, colours (incl. an Adobe
 * swatch file), fonts, stickers, shapes, hero layers, photos and a style
 * guide (HTML + PDF). Everything is taken from the site's own sources, so the
 * pack always matches the live design.
 *
 *   npm run brand-pack   ->  exports/MatriX-CI-Paket/ and exports/MatriX-CI-Paket.zip
 *
 * The PDF needs Google Chrome; without it the pack is built without the PDF.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { create } from 'fontkitten';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const outRoot = join(root, 'exports');
const name = 'MatriX-CI-Paket';
const out = join(outRoot, name);
const src = (...p) => join(root, ...p);
const dest = (...p) => join(out, ...p);

const dirs = {
  logo: '01_Logo',
  colours: '02_Farben',
  fonts: '03_Schriften',
  stickers: '04_Sticker',
  shapes: '05_Formen',
  heroes: '06_Hero-Kompositionen',
  illus: '07_Illustrationen-Texturen',
  icons: '08_Icons',
  photos: '09_Fotos',
  partners: '10_Partnerlogos',
  tokens: '11_Design-Tokens',
};

rmSync(out, { recursive: true, force: true });
rmSync(`${out}.zip`, { force: true });
for (const dir of Object.values(dirs)) mkdirSync(dest(dir), { recursive: true });

/* ---------- Tokens ---------- */

const tokensCss = readFileSync(src('src/styles/tokens.css'), 'utf8');
const rootBlock = tokensCss.slice(tokensCss.indexOf(':root {'), tokensCss.indexOf('@media'));
const hex = Object.fromEntries([...rootBlock.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2].toUpperCase()]));
const tokenValue = (key) => rootBlock.match(new RegExp(`--${key}:\\s*([^;]+);`))?.[1].trim();

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const luminance = (h) => {
  const [r, g, b] = rgb(h).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const accents = [
  { key: 'purple', name: 'Lila', pages: 'Startseite, Räume, Impressum', pair: 'pink' },
  { key: 'blue', name: 'Himmelblau', pages: 'Angebot, Mitmachen', pair: 'yellow' },
  { key: 'coral', name: 'Koralle', pages: 'Team, Werkstatt, FSJ', pair: 'cyan' },
  { key: 'green', name: 'Grün', file: 'Gruen', pages: 'Aktuelles', pair: 'purple' },
  { key: 'yellow', name: 'Gelb', pages: 'Sticker & Akzente', pair: null },
  { key: 'pink', name: 'Pink', pages: 'Sticker & Akzente', pair: null },
];
const stickerColours = [
  { key: 'cyan-500', name: 'Cyan' },
  { key: 'orange-500', name: 'Orange' },
  { key: 'mint-500', name: 'Mint' },
];
const neutrals = [
  { key: 'ink', name: 'Tinte', usage: 'Text, Konturen, harte Schatten, Footer' },
  { key: 'ink-muted', name: 'Tinte gedämpft', usage: 'Meta-Texte, Bildunterschriften' },
  { key: 'line', name: 'Linie', usage: 'Trennlinien, ruhige Rahmen' },
  { key: 'white', name: 'Weiß', usage: 'Karten, Navigation, Text auf Lila/Tinte' },
];
const toneUsage = {
  500: 'Flächen: Hero, Fotorahmen, Sticker',
  600: 'Buttons, farbige Überschriften (ab 24 px)',
  700: 'Links und kleiner farbiger Text',
  100: 'Ruhige Flächen, Hover',
  50: 'Seitenhintergrund',
};

const swatches = [];
for (const a of accents) {
  for (const tone of [500, 600, 700, 100, 50]) {
    const key = `${a.key}-${tone}`;
    if (hex[key]) swatches.push({ group: `Akzent ${a.name}`, key, name: `${a.name} ${tone}`, hex: hex[key], usage: toneUsage[tone] });
  }
}
for (const s of stickerColours) swatches.push({ group: 'Sticker-Farben', key: s.key, name: s.name, hex: hex[s.key], usage: 'Nur Formen, Konfetti, Rahmen' });
for (const n of neutrals) swatches.push({ group: 'Neutral', key: n.key, name: n.name, hex: hex[n.key], usage: n.usage });

/* ---------- 02 Farben ---------- */

// Adobe Swatch Exchange (Illustrator, InDesign, Photoshop, Affinity).
function ase(list) {
  const blocks = [];
  const str = (s) => {
    const b = Buffer.alloc(2 + (s.length + 1) * 2);
    b.writeUInt16BE(s.length + 1, 0);
    for (let i = 0; i < s.length; i++) b.writeUInt16BE(s.charCodeAt(i), 2 + i * 2);
    return b;
  };
  const block = (type, body) => {
    const head = Buffer.alloc(6);
    head.writeUInt16BE(type, 0);
    head.writeUInt32BE(body.length, 2);
    blocks.push(Buffer.concat([head, body]));
  };
  for (const group of [...new Set(list.map((s) => s.group))]) {
    block(0xc001, str(`MatriX – ${group}`));
    for (const s of list.filter((x) => x.group === group)) {
      const colour = Buffer.alloc(4 + 12 + 2);
      colour.write('RGB ', 0, 'ascii');
      rgb(s.hex).forEach((v, i) => colour.writeFloatBE(v / 255, 4 + i * 4));
      colour.writeUInt16BE(0, 16); // global colour
      block(0x0001, Buffer.concat([str(`MatriX ${s.name}`), colour]));
    }
    block(0xc002, Buffer.alloc(0));
  }
  const head = Buffer.alloc(12);
  head.write('ASEF', 0, 'ascii');
  head.writeUInt16BE(1, 4);
  head.writeUInt16BE(0, 6);
  head.writeUInt32BE(blocks.length, 8);
  return Buffer.concat([head, ...blocks]);
}
writeFileSync(dest(dirs.colours, 'MatriX-Farben.ase'), ase(swatches));
writeFileSync(dest(dirs.colours, 'MatriX-Farben.json'), JSON.stringify(swatches.map(({ group, key, name: n, hex: h, usage }) => ({ group, token: key, name: n, hex: h, rgb: rgb(h), usage })), null, 2));
writeFileSync(
  dest(dirs.colours, 'MatriX-Farben.txt'),
  [
    'MatriX Farbpalette (RGB / Bildschirm)',
    'Für Druck bitte mit dem Profil der Druckerei nach CMYK umrechnen (z. B. PSO Coated v3)',
    'und die 500er-Töne vorher proofen: Lila, Himmelblau und Cyan liegen teils außerhalb von CMYK.',
    '',
    ...[...new Set(swatches.map((s) => s.group))].flatMap((group) => [
      group,
      ...swatches.filter((s) => s.group === group).map((s) => `  ${s.name.padEnd(18)} ${s.hex}   RGB ${rgb(s.hex).join(', ').padEnd(13)}  ${s.usage}`),
      '',
    ]),
  ].join('\n'),
);

/* ---------- 01 Logo ---------- */

const iconsTs = readFileSync(src('src/data/icons.ts'), 'utf8');
const icons = Object.fromEntries(
  [...iconsTs.matchAll(/^\s*([a-z]+): \{ viewBox: "([^"]+)", paths: \[(.+)\] \},?$/gm)].map((m) => [
    m[1],
    { viewBox: m[2], paths: [...m[3].matchAll(/d: "([^"]+)"(, evenodd: true)?/g)].map((p) => ({ d: p[1], evenodd: !!p[2] })) },
  ]),
);
const iconPaths = (icon, fill) => icon.paths.map((p) => `<path fill="${fill}"${p.evenodd ? ' fill-rule="evenodd"' : ''} d="${p.d}"/>`).join('');

const xmark = icons.xmark;
const [xMinX, xMinY, xW, xH] = xmark.viewBox.split(' ').map(Number);
const markSvg = (fill) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${xmark.viewBox}" width="${xW}" height="${xH}">${iconPaths(xmark, fill)}</svg>\n`;

// Wordmark "Die MatriX" as outlines (Boogaloo), so the logo works without the font.
const boogaloo = create(readFileSync(src('public/fonts/boogaloo-latin-400.woff2')));
function textPath(text, size, x, baseline) {
  const s = size / boogaloo.unitsPerEm;
  let pen = 0;
  const parts = [];
  for (const ch of text) {
    const glyph = boogaloo.glyphForCodePoint(ch.codePointAt(0));
    const d = glyph.path.toSVG();
    if (d) parts.push(`<path transform="translate(${(x + pen * s).toFixed(2)} ${baseline}) scale(${s} ${-s})" d="${d}"/>`);
    pen += glyph.advanceWidth;
  }
  return { svg: parts.join(''), width: pen * s };
}

// Same proportions as the site header: X 30×37, 10 px gap, wordmark 28 px.
function lockup(markFill, textFill, pad = 0) {
  const markH = 37.3;
  const markW = (markH * xW) / xH;
  const size = 28;
  const lineBox = size;
  const content = ((boogaloo.ascent - boogaloo.descent) / boogaloo.unitsPerEm) * size;
  const baseline = (markH - lineBox) / 2 + (lineBox - content) / 2 + (boogaloo.ascent / boogaloo.unitsPerEm) * size;
  const text = textPath('Die MatriX', size, pad + markW + 10, (pad + baseline).toFixed(2));
  const w = pad * 2 + markW + 10 + text.width;
  const h = pad * 2 + markH;
  const s = markH / xH;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}">`
    + `<g transform="translate(${pad} ${pad}) scale(${s}) translate(${-xMinX} ${-xMinY})">${iconPaths(xmark, markFill)}</g>`
    + `<g fill="${textFill}">${text.svg}</g></svg>\n`;
}

const logoFiles = [];
const writeLogo = async (file, svg, pngWidth, background) => {
  writeFileSync(dest(dirs.logo, `${file}.svg`), svg);
  let img = sharp(Buffer.from(svg), { density: 600 }).resize({ width: pngWidth });
  if (background) img = img.flatten({ background });
  await img.png().toFile(dest(dirs.logo, `${file}.png`));
  logoFiles.push(file);
};
await writeLogo('MatriX-Logo_Tinte', lockup(hex.ink, hex.ink), 2400);
await writeLogo('MatriX-Logo_Weiss', lockup(hex.white, hex.white), 2400);
await writeLogo('MatriX-Logo_Lila-Tinte', lockup(hex['purple-500'], hex.ink), 2400);
await writeLogo('MatriX-X_Tinte', markSvg(hex.ink), 1200);
await writeLogo('MatriX-X_Weiss', markSvg(hex.white), 1200);
for (const a of accents.slice(0, 4)) await writeLogo(`MatriX-X_${a.file ?? a.name}`, markSvg(hex[`${a.key}-500`]), 1200);

// Square profile picture / app icon: white X on purple.
const appIcon = (bg, fill) => {
  const size = 1024;
  const markH = size * 0.62;
  const s = markH / xH;
  const markW = xW * s;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${bg}"/>`
    + `<g transform="translate(${((size - markW) / 2).toFixed(1)} ${((size - markH) / 2).toFixed(1)}) scale(${s}) translate(${-xMinX} ${-xMinY})">${iconPaths(xmark, fill)}</g></svg>\n`;
};
await writeLogo('MatriX-Profilbild_Lila', appIcon(hex['purple-500'], hex.white), 1024);
await writeLogo('MatriX-Profilbild_Tinte', appIcon(hex.ink, hex.white), 1024);

/* ---------- 03 Schriften ---------- */

// Desktop TTFs (brand/fonts, see SOURCES.md there) for design apps; the
// site's woff2 subsets only work in browsers.
mkdirSync(dest(dirs.fonts, 'Desktop'), { recursive: true });
mkdirSync(dest(dirs.fonts, 'Web'), { recursive: true });
for (const file of readdirSync(src('brand/fonts')).filter((f) => f.endsWith('.ttf'))) cpSync(src('brand/fonts', file), dest(dirs.fonts, 'Desktop', file));
for (const file of readdirSync(src('public/fonts'))) {
  cpSync(src('public/fonts', file), dest(dirs.fonts, file.endsWith('.woff2') ? 'Web' : '', file));
}
writeFileSync(
  dest(dirs.fonts, 'LIES-MICH.txt'),
  `MatriX Schriften – beide frei (SIL Open Font License, Lizenztexte liegen bei)

Boogaloo  – Display: Überschriften, Buttons, Navigation, Daten, Sticker-Texte
            https://fonts.google.com/specimen/Boogaloo
Figtree   – Text: Fließtext, Leads, Meta (auf der Website 400 / 500 / 600 / 700)
            https://fonts.google.com/specimen/Figtree

Desktop/  Zum Installieren (Doppelklick → "Installieren"): Boogaloo und alle
          Figtree-Schnitte von Light bis Black, jeweils auch kursiv.
          Für Illustrator, InDesign, Photoshop, Affinity, Canva-Upload usw.
Web/      Die Webfonts der Website (.woff2, nur für Browser).

Figma: beide sind als Google Fonts schon eingebaut, nichts installieren.
`,
);

/* ---------- 04–08 Grafiken ---------- */

const copyDir = (from, to, filter = () => true) => {
  for (const file of readdirSync(src(from)).filter(filter)) cpSync(src(from, file), dest(to, file));
};
copyDir('public/graphics/stickers', dirs.stickers);
copyDir('public/graphics/shapes', dirs.shapes);
copyDir('public/graphics/heroes', dirs.heroes);
copyDir('public/graphics/illustrations', dirs.illus);
copyDir('public/graphics/textures', dirs.illus);
mkdirSync(dest(dirs.illus, 'Mauszeiger-Hand'), { recursive: true });
copyDir('public/graphics/cursors', `${dirs.illus}/Mauszeiger-Hand`, (f) => f.includes('@2x'));

for (const icon of ['instagram', 'tiktok', 'youtube', 'twitch', 'discord', 'facebook']) {
  if (!icons[icon]) continue;
  writeFileSync(dest(dirs.icons, `${icon}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icons[icon].viewBox}" width="26" height="26">${iconPaths(icons[icon], hex.ink)}</svg>\n`);
}

// PNG previews of the stickers for tools without SVG import.
mkdirSync(dest(dirs.stickers, 'PNG'), { recursive: true });
const stickers = readdirSync(dest(dirs.stickers)).filter((f) => f.endsWith('.svg'));
for (const file of stickers) {
  await sharp(dest(dirs.stickers, file), { density: 300 }).resize({ width: 1200, height: 1200, fit: 'inside' }).png().toFile(dest(dirs.stickers, 'PNG', file.replace('.svg', '.png')));
}

/* ---------- 09 Fotos ---------- */

const photoSets = [
  ['src/assets/campus', 'Raeume'],
  ['src/assets/photos', 'Alltag-Events'],
  ['src/assets/youth', 'Gruppen'],
  ['src/assets/team', 'Team'],
];
for (const [from, to] of photoSets) {
  mkdirSync(dest(dirs.photos, to), { recursive: true });
  copyDir(from, `${dirs.photos}/${to}`, (f) => /\.(jpe?g|png|webp)$/i.test(f) && !/rickroll|video-still/.test(f));
}
writeFileSync(
  dest(dirs.photos, 'LIES-MICH.txt'),
  `Fotos aus der MatriX – nur für Materialien der MatriX verwenden, nicht weitergeben.
Auf den Bildern sind Jugendliche und das Team zu sehen; die Einwilligungen gelten
für die Kanäle der MatriX (Website, Social Media, Flyer).

Raeume/         die Räume des Hauses
Alltag-Events/  Offener Betrieb, Events, Werkstatt (Web-Größe)
Gruppen/        Gruppenfotos
Team/           Porträts, heads/ = freigestellte Köpfe

Die Bilder sind für das Web verkleinert. Für großformatigen Druck bitte
die Originale beim Team anfragen.
`,
);

/* ---------- 10 Partnerlogos ---------- */

cpSync(src('src/assets/logos/kjr-logo-white.png'), dest(dirs.partners, 'Kreisjugendring-Augsburg-Land_weiss.png'));
await sharp(src('src/assets/logos/stadt-koenigsbrunn.webp')).png().toFile(dest(dirs.partners, 'Stadt-Koenigsbrunn.png'));
writeFileSync(
  dest(dirs.partners, 'LIES-MICH.txt'),
  `Träger und Förderer – nur unverändert verwenden (nicht umfärben, verzerren, freistellen).
Kreisjugendring: weiße Version für dunkle Flächen (Footer in Tinte).
Stadt Königsbrunn: von koenigsbrunn.de; für Druck bitte die offizielle Druckdatei bei der Stadt anfragen.
`,
);

/* ---------- 11 Design-Tokens ---------- */

cpSync(src('src/styles/tokens.css'), dest(dirs.tokens, 'tokens.css'));
const tokenJson = {
  colour: Object.fromEntries(Object.entries(hex)),
  font: { display: 'Boogaloo', text: 'Figtree' },
  spacing: Object.fromEntries([...rootBlock.matchAll(/--(space-\d+):\s*([^;]+);/g)].map((m) => [m[1], m[2]])),
  radius: Object.fromEntries([...rootBlock.matchAll(/--(radius-[a-z]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]])),
  shadow: Object.fromEntries([...rootBlock.matchAll(/--(shadow-[a-z-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].replace('var(--ink)', hex.ink)])),
  layout: { 'container-max': tokenValue('container-max'), 'grid-gutter': tokenValue('grid-gutter'), 'page-margin': tokenValue('page-margin') },
  accents: Object.fromEntries(accents.map((a) => [a.key, { fill: hex[`${a.key}-500`], strong: hex[`${a.key}-600`], tint: hex[`${a.key}-50`] }])),
};
writeFileSync(dest(dirs.tokens, 'tokens.json'), JSON.stringify(tokenJson, null, 2));

/* ---------- Styleguide ---------- */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const chip = (h) => (contrast(h, hex.ink) >= contrast(h, hex.white) ? hex.ink : hex.white);
const swatchHtml = (s, big = false) => `<figure class="sw${big ? ' sw--big' : ''}"><div class="sw__c" style="background:${s.hex};color:${chip(s.hex)}">${big ? 'Aa' : ''}</div><figcaption><b>${esc(s.name)}</b><code>${s.hex}</code><span>RGB ${rgb(s.hex).join(' ')}</span><small>${esc(s.usage)}</small></figcaption></figure>`;
const typeScale = [
  ['Hero-Titel', 'Boogaloo', '76–168 px', '0.9', 'Ein Titel pro Seite, weiß mit Tinte-Versatzschatten'],
  ['H1', 'Boogaloo', '44–80 px', '1.0', 'Seitenüberschrift'],
  ['H2', 'Boogaloo', '36–56 px', '1.05', 'Abschnittstitel'],
  ['H3', 'Boogaloo', '32–48 px', '1.1', 'Kartentitel, Unterabschnitte'],
  ['H4 / Label', 'Boogaloo', '22–28 px', '1.1', 'Buttons, Navigation, Daten'],
  ['Lead', 'Figtree 400', '18–21 px', '1.5', 'Einleitung unter Überschriften, max. 60 Zeichen breit'],
  ['Text', 'Figtree 400', '17 px', '27 px', 'Fließtext, wichtige Wörter 600'],
  ['Klein', 'Figtree 400–600', '14 px', '20 px', 'Meta, Bildunterschriften'],
];
const fileTree = Object.values(dirs).map((d) => `<li><code>${d}/</code></li>`).join('');

const guide = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MatriX Styleguide</title>
<style>
@font-face { font-family: "Boogaloo"; src: url("${dirs.fonts}/Web/boogaloo-latin-400.woff2") format("woff2"); }
@font-face { font-family: "Figtree"; font-weight: 300 900; src: url("${dirs.fonts}/Web/figtree-latin-wght.woff2") format("woff2"); }
@font-face { font-family: "Figtree"; font-weight: 300 900; src: url("${dirs.fonts}/Web/figtree-latin-ext-wght.woff2") format("woff2"); unicode-range: U+0100-02BA, U+1E00-1E9F; }
:root { --ink: ${hex.ink}; --muted: ${hex['ink-muted']}; --line: ${hex.line}; --purple: ${hex['purple-500']}; --purple-strong: ${hex['purple-600']}; --tint: ${hex['purple-50']}; color-scheme: light; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; background: var(--tint); color: var(--ink); font: 400 16px/1.55 "Figtree", system-ui, sans-serif; }
main { max-width: 1120px; margin: 0 auto; padding: 0 32px 96px; }
h1, h2, h3, .display { font-family: "Boogaloo", sans-serif; font-weight: 400; line-height: 1; margin: 0; }
h2 { font-size: 56px; margin: 0 0 8px; }
h3 { font-size: 30px; margin: 32px 0 12px; }
p { max-width: 68ch; margin: 0 0 12px; }
code { font: 500 13px/1.3 ui-monospace, Menlo, monospace; }
section { padding: 72px 0 0; break-inside: avoid-page; }
section + section { border-top: 2px dashed var(--line); margin-top: 72px; }
.lead { font-size: 20px; color: var(--muted); margin-bottom: 28px; }
.cover { position: relative; overflow: hidden; background: var(--purple); color: #fff; padding: 64px 32px 72px; }
.cover__in { max-width: 1120px; margin: 0 auto; position: relative; z-index: 1; }
.cover h1 { font-size: 136px; text-shadow: 6px 6px 0 var(--ink); margin: 32px 0 16px; }
.cover p { font-size: 21px; max-width: 46ch; color: rgba(255,255,255,.92); }
.cover__tri { position: absolute; right: -60px; top: -40px; width: 560px; opacity: .95; }
.cover__cat { position: absolute; right: 80px; bottom: -36px; width: 230px; z-index: 2; }
.cover img.logo { height: 48px; }
.grid { display: grid; gap: 20px; }
.g2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.g3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.g4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.g5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.g6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.card { background: #fff; border: 2px solid var(--ink); border-radius: 14px; padding: 20px; box-shadow: 0 4px 0 var(--ink); }
.tile { display: grid; place-items: center; min-height: 180px; border-radius: 14px; padding: 28px; border: 2px solid var(--ink); }
.tile img { max-height: 120px; max-width: 100%; }
.caption { font-size: 13px; color: var(--muted); margin-top: 8px; }
.do, .dont { font-size: 14px; padding-left: 26px; position: relative; margin: 4px 0; }
.do::before { content: "✓"; position: absolute; left: 0; font-weight: 800; color: ${hex['green-600']}; }
.dont::before { content: "✕"; position: absolute; left: 0; font-weight: 800; color: ${hex['coral-600']}; }
.sw { margin: 0; background: #fff; border: 2px solid var(--ink); border-radius: 14px; overflow: hidden; }
.sw__c { height: 72px; display: grid; place-items: center; font: 40px "Boogaloo"; border-bottom: 2px solid var(--ink); }
.sw--big .sw__c { height: 120px; }
.sw figcaption { display: grid; gap: 2px; padding: 10px 12px 12px; font-size: 13px; line-height: 1.35; }
.sw figcaption span, .sw figcaption small { color: var(--muted); }
.accent-row { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 14px; align-items: stretch; margin-bottom: 18px; }
.accent-row__info { padding: 4px 0; }
.accent-row__info .display { font-size: 34px; }
table { width: 100%; border-collapse: collapse; background: #fff; border: 2px solid var(--ink); border-radius: 14px; overflow: hidden; }
th, td { text-align: left; padding: 12px 14px; border-bottom: 1px solid var(--line); vertical-align: middle; font-size: 14px; }
th { background: var(--ink); color: #fff; font-weight: 600; }
.specimen { background: #fff; border: 2px solid var(--ink); border-radius: 14px; padding: 28px; }
.specimen .big { font-size: 96px; line-height: .95; }
.chars { font-size: 26px; letter-spacing: .02em; color: var(--muted); margin-top: 12px; word-break: break-all; }
.btns { display: flex; flex-wrap: wrap; gap: 20px; align-items: center; }
.btn { display: inline-flex; align-items: center; min-height: 52px; padding: 6px 26px; border: 2px solid var(--ink); border-radius: 8px; font: 24px/1 "Boogaloo"; box-shadow: 0 4px 0 var(--ink); text-decoration: none; }
.btn--primary { background: var(--purple-strong); color: #fff; }
.btn--outline { background: #fff; color: var(--ink); }
.btn--ink { background: var(--ink); color: #fff; box-shadow: 0 4px 0 ${hex['purple-500']}; }
.photo { position: relative; margin: 0 12px 12px 0; }
.photo::before { content: ""; position: absolute; inset: 12px -12px -12px 12px; background: var(--c); }
.photo img { position: relative; display: block; width: 100%; aspect-ratio: 4/3; object-fit: cover; }
.photo--tilt { rotate: -1.6deg; }
.hero-demo { position: relative; aspect-ratio: 1920/1020; border: 2px solid var(--ink); border-radius: 14px; overflow: hidden; }
.hero-demo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hero-demo span { position: absolute; left: 50%; top: 46%; translate: -50% -50%; font: 64px/1 "Boogaloo"; color: #fff; text-shadow: .045em .045em 0 var(--ink); white-space: nowrap; }
.voice { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.voice .card p { margin: 6px 0; }
ul.files { columns: 2; padding-left: 18px; margin: 0; }
.clear { display: inline-block; padding: 26px; background: repeating-linear-gradient(45deg, ${hex['purple-100']} 0 6px, #fff 6px 12px); border: 2px dashed var(--purple-strong); border-radius: 8px; }
.clear img { display: block; height: 64px; background: var(--tint); }
@media screen and (max-width: 760px) {
  main { padding: 0 16px 64px; }
  .cover { padding: 40px 16px 56px; }
  .cover h1 { font-size: 76px; }
  .cover__tri { width: 320px; }
  .cover__cat { width: 130px; right: 16px; }
  .g3, .g4, .g5, .g6 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .g2, .voice { grid-template-columns: 1fr; }
  .accent-row { grid-template-columns: 1fr 1fr; }
  .accent-row__info { grid-column: 1 / -1; }
  h2 { font-size: 40px; }
  table { display: block; overflow-x: auto; }
  ul.files { columns: 1; }
}
@page { size: A4 landscape; margin: 10mm 12mm; }
@media print {
  body { font-size: 12px; background: #fff; }
  main { padding: 0; max-width: none; }
  .cover { min-height: 186mm; display: flex; align-items: center; padding: 40px 48px; break-after: page; border-radius: 14px; }
  .cover h1 { font-size: 150px; }
  .cover__tri { width: 640px; }
  .cover__cat { width: 260px; }
  section { padding-top: 0; break-before: page; border: 0 !important; margin-top: 0 !important; }
  h2 { font-size: 44px; }
  h3 { font-size: 24px; margin: 18px 0 8px; }
  .lead { font-size: 16px; margin-bottom: 16px; }
  .grid { gap: 14px; }
  .tile { min-height: 110px; padding: 18px; }
  .tile img { max-height: 84px; }
  .g5 { grid-template-columns: repeat(7, minmax(0, 1fr)); }
  .accent-row { grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 10px; }
  .sw--big .sw__c { height: 64px; }
  .sw__c { height: 48px; font-size: 30px; }
  .sw figcaption { padding: 6px 10px 8px; font-size: 11px; }
  .accent-row, .sw, .tile, .card, tr, .photo, .hero-demo { break-inside: avoid; }
  .specimen .big { font-size: 80px; }
  th, td { padding: 7px 12px; font-size: 12px; }
  .hero-demo span { font-size: 54px; }
  .photo img { aspect-ratio: 3/2; }
}
</style>
</head>
<body>
<header class="cover">
  <img class="cover__tri" src="${dirs.shapes}/triangle-pink.svg" alt="">
  <img class="cover__cat" src="${dirs.stickers}/cat-hi.svg" alt="">
  <div class="cover__in">
    <img class="logo" src="${dirs.logo}/MatriX-Logo_Weiss.svg" alt="Die MatriX">
    <h1>Styleguide</h1>
    <p>Das Corporate Design der MatriX, dem Jugendhaus in Königsbrunn: Logo, Farben, Schriften, Sticker und Regeln, damit neue Flyer, Plakate und Posts aussehen wie die Website.</p>
  </div>
</header>
<main>

<section>
  <h2>Die Idee</h2>
  <p class="lead">Ein buntes Stickerheft auf sauberem Papier. Laut, warm, ein bisschen chaotisch, aber immer lesbar.</p>
  <div class="grid g4">
    <div class="card"><h3 style="margin-top:0">Eine Seite, eine Farbe</h3><p>Jede Seite, jeder Flyer hat <b>eine</b> Akzentfarbe. Nie zwei Akzente in einem Abschnitt.</p></div>
    <div class="card"><h3 style="margin-top:0">Ruhiges Papier, laute Sticker</h3><p>Text steht auf hellen Flächen mit viel Luft. Der Krach passiert in Heros, Stickern und Rahmen, nie im Fließtext.</p></div>
    <div class="card"><h3 style="margin-top:0">Handgemacht, nicht unordentlich</h3><p>Neigungen ±1,5°, Versatz 12 px, Sticker ragen ca. 40 % über die Kante. Immer gleich, immer gewollt.</p></div>
    <div class="card"><h3 style="margin-top:0">Wie ein Freund reden</h3><p>Kurz, direkt, „du“. Ausrufezeichen erlaubt, Emojis nicht: dafür sind die Figuren da.</p></div>
  </div>
</section>

<section>
  <h2>Logo</h2>
  <p class="lead">Das X-Zeichen plus „Die MatriX“ in Boogaloo. Das X darf auch allein stehen (Profilbild, Stempel, Hero der Startseite).</p>
  <div class="grid g3">
    <div><div class="tile" style="background:#fff"><img src="${dirs.logo}/MatriX-Logo_Tinte.svg" alt="Logo in Tinte"></div><p class="caption">Standard auf hellen Flächen</p></div>
    <div><div class="tile" style="background:${hex.ink}"><img src="${dirs.logo}/MatriX-Logo_Weiss.svg" alt="Logo in Weiß"></div><p class="caption">Auf Tinte, Lila und Fotos</p></div>
    <div><div class="tile" style="background:${hex['purple-50']}"><img src="${dirs.logo}/MatriX-Logo_Lila-Tinte.svg" alt="Logo mit lila X"></div><p class="caption">Mit farbigem X, z. B. Merch</p></div>
  </div>
  <div class="grid g6" style="margin-top:20px">
    ${['Tinte', 'Weiss', ...accents.slice(0, 4).map((a) => a.file ?? a.name)].map((n) => `<div class="tile" style="min-height:130px;background:${n === 'Weiss' ? hex.ink : '#fff'}"><img src="${dirs.logo}/MatriX-X_${n}.svg" alt="X ${n}" style="max-height:80px"></div>`).join('')}
  </div>
  <div class="grid g2" style="margin-top:28px; align-items:start">
    <div>
      <h3>Schutzraum &amp; Größe</h3>
      <div class="clear"><img src="${dirs.logo}/MatriX-Logo_Tinte.svg" alt=""></div>
      <p class="caption">Rundum mindestens die halbe Höhe des X frei lassen. Mindestgröße: X 8 mm (Druck) bzw. 24 px (Bildschirm) hoch.</p>
    </div>
    <div>
      <h3>Bitte so</h3>
      <p class="do">Nur Tinte, Weiß oder ein 500er-Akzent fürs X</p>
      <p class="do">Immer „MatriX“ mit großem X schreiben</p>
      <p class="do">Auf ruhigen Flächen oder ruhigen Fotostellen</p>
      <h3>Bitte nicht</h3>
      <p class="dont">Verzerren, drehen, Schatten oder Kontur hinzufügen</p>
      <p class="dont">Das Wort in einer anderen Schrift setzen</p>
      <p class="dont">Auf unruhigem Hintergrund oder auf Stickern</p>
    </div>
  </div>
</section>

<section>
  <h2>Farben</h2>
  <p class="lead">Vier Seiten-Akzente, jeweils mit Flächen-, Text- und Hintergrundton. Dazu Sticker-Farben und Tinte statt Schwarz.</p>
  ${accents.slice(0, 4).map((a) => `<div class="accent-row">
    <div class="accent-row__info"><div class="display" style="color:${hex[`${a.key}-600`]}">${a.name}</div><p class="caption">${a.pages}<br>Dreieck im Hero: ${{ pink: 'Pink', yellow: 'Gelb', cyan: 'Cyan', purple: 'Lila' }[a.pair]}</p></div>
    ${swatchHtml(swatches.find((s) => s.key === `${a.key}-500`), true)}
    ${swatchHtml(swatches.find((s) => s.key === `${a.key}-600`), true)}
    ${swatchHtml(swatches.find((s) => s.key === `${a.key}-50`), true)}
  </div>`).join('')}
  <h3>Sticker- &amp; Zusatzfarben</h3>
  <div class="grid g5">${['yellow-500', 'yellow-600', 'pink-500', 'pink-600', 'purple-700', 'purple-100', 'cyan-500', 'orange-500', 'mint-500'].map((k) => swatchHtml(swatches.find((s) => s.key === k))).join('')}</div>
  <h3>Neutral</h3>
  <div class="grid g4">${neutrals.map((n) => swatchHtml(swatches.find((s) => s.key === n.key))).join('')}</div>
  <h3>Lesbarkeit</h3>
  <p class="do">Text ist Tinte (${hex.ink}) auf hellen Flächen. Farbiger Text nur im 600er-Ton und erst ab 24 px.</p>
  <p class="do">Weißer Text nur auf Lila 500, Tinte und Fotos. Weiße Titel auf Blau, Koralle oder Grün bekommen den harten Tinte-Schatten.</p>
  <p class="dont">Gelb, Pink, Cyan, Orange, Mint sind keine Textflächen: nur für Formen, Konfetti und Rahmen.</p>
  <p class="caption">Kontrast Tinte auf Lila 50: ${contrast(hex.ink, hex['purple-50']).toFixed(1)}:1 · Weiß auf Lila 500: ${contrast(hex.white, hex['purple-500']).toFixed(1)}:1 (nur große Schrift) · Lila 700 auf Weiß: ${contrast(hex['purple-700'], hex.white).toFixed(1)}:1</p>
</section>

<section>
  <h2>Schriften</h2>
  <p class="lead">Zwei Familien, beide kostenlos (Google Fonts, SIL Open Font License).</p>
  <div class="grid g2">
    <div class="specimen"><div class="caption">Display · Boogaloo</div><div class="display big">Was geht?</div><div class="chars display">ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz ÄÖÜäöüß 0123456789 !?&amp;</div><p class="caption" style="margin-top:14px">Überschriften, Buttons, Navigation, Daten, Plakat-Titel. Immer Satzschreibung, Großbuchstaben nur in Stickern und auf Plakaten.</p></div>
    <div class="specimen"><div class="caption">Text · Figtree</div><div style="font-size:44px;line-height:1.1;font-weight:600">Komm rein und mach mit.</div><div class="chars" style="font-size:20px">ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz ÄÖÜäöüß 0123456789</div><p style="margin-top:14px"><span style="font-weight:400">Regular 400</span> · <span style="font-weight:500">Medium 500</span> · <span style="font-weight:600">Semibold 600</span> · <span style="font-weight:700">Bold 700</span></p><p class="caption">Fließtext, Leads, Infos. Linksbündig; zentriert nur Überschriften, Leads und Aufrufe.</p></div>
  </div>
  <h3>Hierarchie (Website)</h3>
  <table><tr><th>Stufe</th><th>Schrift</th><th>Größe</th><th>Zeilenhöhe</th><th>Wofür</th></tr>
  ${typeScale.map((r) => `<tr><td><span style="font-family:${r[1].startsWith('Boogaloo') ? 'Boogaloo' : 'Figtree'};font-size:${r[1].startsWith('Boogaloo') ? 26 : 16}px">${r[0]}</span></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join('')}</table>
  <p class="caption">Print-Faustregel: Titel in Boogaloo groß und kurz, darunter ein Satz Lead in Figtree, dann die Infos. Hero-Titel immer weiß mit Tinte-Versatz (ca. 4,5 % der Schriftgröße nach rechts unten).</p>
</section>

<section>
  <h2>Formen &amp; Konfetti</h2>
  <p class="lead">Das körnige Dreieck ist die Signatur-Form: eins pro Hero, hinter dem Titel, gedreht, in Kontrastfarbe. Dazu 6–10 Konfetti-Teile.</p>
  <div class="grid g5">${readdirSync(dest(dirs.shapes)).filter((f) => f.endsWith('.svg')).map((f) => `<div><div class="tile" style="background:${f === 'squiggle.svg' ? hex['purple-500'] : '#fff'}"><img src="${dirs.shapes}/${f}" alt=""></div><p class="caption">${basename(f, '.svg')}</p></div>`).join('')}</div>
  <p class="dont" style="margin-top:16px">Dreiecke und Figuren nicht nachzeichnen, die Dateien verwenden. Squiggles (weiß, 70 %) nur im Hintergrund, nie hinter Text.</p>
</section>

<section>
  <h2>Figuren &amp; Sticker</h2>
  <p class="lead">Die Figuren sagen „Hi!“ statt Emojis. Eine Figur pro Hero (ragt über die Unterkante), eine „Spähfigur“ pro Seite, die über eine Kante guckt.</p>
  <div class="grid g5">${stickers.map((f) => `<div><div class="tile" style="background:#fff"><img src="${dirs.stickers}/${f}" alt=""></div><p class="caption">${basename(f, '.svg')}</p></div>`).join('')}</div>
  <p class="dont" style="margin-top:16px">Keine neuen Wörter in die Sprechblasen, Figuren nicht auf Fotos oder in Fließtext setzen, nicht umfärben.</p>
</section>

<section>
  <h2>Hero-Kompositionen</h2>
  <p class="lead">Fertige Ebenen (1920 × 1020) aus Dreieck, Konfetti und Figur. Auf die Akzentfläche legen, Titel in die Mitte.</p>
  <div class="grid g3">
    ${[['angebot-hero-deco', 'blue-500', 'Angebot'], ['raeume-hero-deco', 'purple-500', 'Räume'], ['team-hero-deco', 'coral-500', 'Team'], ['aktuelles-hero-deco', 'green-500', 'Aktuelles'], ['rechtliches-hero-deco', 'purple-500', 'Impressum'], ['rainbow-clouds', 'blue-500', 'Mitmachen']].map(([f, c, t]) => `<div><div class="hero-demo" style="background:${hex[c]}"><img src="${dirs.heroes}/${f}.svg" alt=""><span>${t}</span></div><p class="caption">${f}.svg auf ${c}</p></div>`).join('')}
  </div>
</section>

<section>
  <h2>Fotos</h2>
  <p class="lead">Echte Leute, echte Räume, warm und satt. Kein Stock. Fotos haben eckige Kanten und liegen auf einem um 12 px versetzten Farbblock in der Akzentfarbe.</p>
  <div class="grid g3">
    <div class="photo" style="--c:${hex['blue-500']}"><img src="${dirs.photos}/Raeume/room-werkstatt.jpg" alt=""></div>
    <div class="photo photo--tilt" style="--c:${hex['coral-500']}"><img src="${dirs.photos}/Gruppen/group-stage.png" alt=""></div>
    <div class="photo" style="--c:${hex['green-500']}"><img src="${dirs.photos}/Raeume/room-bar.jpg" alt=""></div>
  </div>
  <p class="do" style="margin-top:24px">Versatz nach rechts unten oder links oben, im Wechsel. Gruppenfotos dürfen −1,6° geneigt sein.</p>
  <p class="dont">Keine abgerundeten Ecken, keine weichen Schatten, keine Filter.</p>
</section>

<section>
  <h2>UI-Elemente</h2>
  <p class="lead">Alles, was man drücken kann, fühlt sich an wie ein Sticker: 2 px Tinte-Kontur, harter Schatten 4 px nach unten.</p>
  <div class="btns">
    <span class="btn btn--primary">Mitmachen!</span>
    <span class="btn btn--outline">Lern’ uns kennen</span>
    <span class="btn btn--ink">Kontakt</span>
  </div>
  <div class="grid g3" style="margin-top:28px">
    <div class="card"><b>Ecken</b><p>Buttons 8 px · Karten 14 px · Panels 22 px · Fotos eckig</p></div>
    <div class="card"><b>Schatten</b><p>Hart: 0 4 px 0 Tinte. Weich (0 18 px 40 px, 18 %) nur für schwebende Popups.</p></div>
    <div class="card"><b>Abstände</b><p>4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 px. Inhalt max. 1280 px breit.</p></div>
  </div>
</section>

<section>
  <h2>Tonalität</h2>
  <p class="lead">Wir reden wie die Jugendlichen mit uns: per du, kurz, freundlich.</p>
  <div class="voice">
    <div class="card"><p class="do">„Komm rein, mach mit!“</p><p class="do">„Was geht zur Zeit?“</p><p class="do">„Weißt du, wer da noch fehlt? Du!“</p><p class="do">Buttons: 1–3 Wörter, Verb vorne</p></div>
    <div class="card"><p class="dont">„Treten Sie ein …“</p><p class="dont">ALLES IN GROSSBUCHSTABEN (außer Sticker/Plakat)</p><p class="dont">Emojis im Text</p><p class="dont">„Matrix“ oder „MATRIX“: immer „MatriX“</p></div>
  </div>
  <p class="caption" style="margin-top:16px">Daten: 12.02.2026 · Zeiten: 15:00 – 20:00 Uhr (Halbgeviertstrich mit Leerzeichen) · „Die MatriX“ im Logo, „die MatriX“ im Satz.</p>
</section>

<section>
  <h2>Im Paket</h2>
  <ul class="files">${fileTree}</ul>
  <p class="caption" style="margin-top:16px">Logos als SVG (Vektor, Schrift in Pfade umgewandelt) und PNG (transparent). Farben als .ase für Adobe/Affinity, dazu JSON und TXT. Stand: ${new Date().toLocaleDateString('de-DE')}.</p>
</section>

</main>
</body>
</html>
`;
writeFileSync(dest('00_Styleguide.html'), guide);

/* ---------- PDF + Zip ---------- */

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (existsSync(chrome)) {
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--allow-file-access-from-files', `--print-to-pdf=${dest('00_Styleguide.pdf')}`, `file://${dest('00_Styleguide.html')}`], { stdio: 'ignore' });
} else {
  console.warn('Google Chrome not found: skipping the PDF.');
}

writeFileSync(
  dest('LIES-MICH.txt'),
  `MatriX CI-Paket – Jugendhaus MatriX Königsbrunn

Start: 00_Styleguide.pdf (oder .html im Browser öffnen).
Schriften: 03_Schriften/LIES-MICH.txt
Farben in Adobe/Affinity: 02_Farben/MatriX-Farben.ase importieren.

Die Fotos (09_Fotos) und Partnerlogos (10_Partnerlogos) nur für
Materialien der MatriX verwenden und nicht weitergeben.
`,
);

execFileSync('zip', ['-rqX', `${name}.zip`, name, '-x', '*.DS_Store'], { cwd: outRoot });
console.log(`Built ${join('exports', `${name}.zip`)}`);
