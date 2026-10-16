# Die MatriX – Website

Website des Jugendzentrums **Die MatriX** in Königsbrunn. Gebaut mit [Astro](https://astro.build) als rein statische Seite.

## Entwicklung

Voraussetzung: Node.js ≥ 22.22

```bash
npm install
npm run dev       # Entwicklungsserver auf http://localhost:4321
npm run build     # Typprüfung + statischer Build nach dist/
npm run preview   # den fertigen Build lokal ansehen
```

## Veröffentlichen

`npm run build` erzeugt in `dist/` eine vollständige statische Website. Der **Inhalt** von `dist/` wird 1:1 in das Webroot des Webspaces hochgeladen (inklusive der versteckten Datei `.htaccess`). Auf dem Server wird weder Node.js noch PHP benötigt.

## Aufbau

```
src/
  pages/        eine Datei pro Seite (index, angebot, raeume, werkstatt, team, aktuelles, mitmachen, impressum, 404)
  layouts/      BaseLayout: <head>, Navigation, Footer
  components/   wiederverwendbare Bausteine (Button, PageHero, PhotoFrame, FeatureRow, CampusMap …)
  data/         Inhalte: Angebote, Räume, Werkstatt, Events, Team, Kontaktdaten, Social Links
  styles/       tokens.css (Design-Tokens), fonts.css, global.css
  assets/       Fotos & Bitmaps – werden beim Build optimiert (AVIF/WebP, mehrere Größen)
public/
  graphics/     Sticker, Formen, Hero-Ebenen (SVG, unverändert aus dem Design)
  fonts/        selbst gehostete Schriften (Boogaloo, Figtree – SIL OFL)
```

### Inhalte pflegen

- **Texte, Termine, Team, Angebote:** in `src/data/*.ts` – die Seiten lesen von dort.
- **Fotos austauschen:** neue Datei nach `src/assets/photos/` legen und den Import in der passenden Datei in `src/data/` (bzw. der Seite) anpassen. Zuschnitt und Rahmen ergeben sich aus der Komponente.
- **Seitenfarbe:** jede Seite setzt genau eine Akzentfarbe (`accent` im `BaseLayout`).

### Design-System

Alle Werte (Farben, Abstände, Radien, Schatten, Typo, Bewegung) stehen als CSS Custom Properties in `src/styles/tokens.css`. Komponenten verwenden ausschließlich diese Tokens. Die Button-Animation (Hover hebt 2px an, Klick drückt 3px ein, harter Schatten) ist in `src/components/Button.astro` zentral umgesetzt.
