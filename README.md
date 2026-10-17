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
  components/   wiederverwendbare Bausteine (Button, PageHero, PhotoFrame, FeatureRow, Campus3D …)
  data/         Inhalte: Angebote, Räume, Werkstatt, Events, Team, Kontaktdaten, Social Links
  styles/       tokens.css (Design-Tokens), fonts.css, global.css
  scripts/campus/  3D-Modell der MatriX für die Startseite (Three.js, wird erst bei Bedarf geladen)
  assets/       Fotos & Bitmaps – werden beim Build optimiert (AVIF/WebP, mehrere Größen)
public/
  graphics/     Sticker, Formen, Hero-Ebenen (Design-SVGs mit interaktiven Figuren)
  fonts/        selbst gehostete Schriften (Boogaloo, Figtree – SIL OFL)
```

### Inhalte pflegen

- **Texte, Termine, Team, Angebote:** in `src/data/*.ts` – die Seiten lesen von dort.
- **Schreibstil:** Website-Texte verwenden keine Gedankenstriche. Stattdessen passende Punkte, Kommas, Doppelpunkte oder neue Sätze setzen. Uhrzeiten mit „bis“ verbinden.
- **Termine:** kommen aus einem Online-Kalender, siehe „Kalender“ unten.
- **Fotos austauschen:** neue Datei nach `src/assets/photos/` legen und den Import in der passenden Datei in `src/data/` (bzw. der Seite) anpassen. Zuschnitt und Rahmen ergeben sich aus der Komponente.
- **Seitenfarbe:** jede Seite setzt genau eine Akzentfarbe (`accent` im `BaseLayout`). Die Startseite wählt mit `randomAccent` bei jedem Laden eine zufällige Farbe aus `homeAccents` in `src/data/site.ts`: Lila, Blau, Koralle und Grün, wie auf den Unterseiten. Sie vermeidet die vorherige Farbe, sofern Sitzungsspeicher verfügbar ist. Cursor-Ärmel, Textauswahl und 3D-Modell übernehmen die Seitenfarbe; der Handschuh bleibt weiß. Die farbigen Cursor-PNGs werden beim Build aus den vorhandenen Handgrafiken und den CSS-Farbwerten erzeugt.
- **3D-Räume (Startseite):** Raumnamen, Texte, Fotos und Links stehen in `src/data/campus.ts`.
- **3D-Grundriss:** `src/data/campus-plan.js` enthält die mit „Lageplan beschriftet.png“ abgeglichenen Raumflächen, Marker-Anker und vereinfachten Innenwände. Modellböden und Hervorhebungen verwenden dieselben Polygone. Gebäudehöhen und Möblierung bleiben schematisch; die Innenansicht zeigt niedrige Raumgrenzen statt kleinteiliger WC- und Techniktrennwände.

### Kalender

Die Termine auf „Aktuelles“ (Monatskalender) und der Startseite (Listen „Events“ und „Jede Woche“) kommen aus einem iCalendar-Feed, zum Beispiel einem Google Kalender:

1. In Google Calendar unter *Einstellungen > Kalender > Zugriffsberechtigungen* den Kalender öffentlich freigeben und unter *Kalender integrieren* die **öffentliche Adresse im iCal-Format** kopieren. Nextcloud, Outlook und andere Kalender liefern ebenfalls eine `.ics`-Adresse.
2. `.env.example` nach `.env` kopieren und die Adresse bei `CALENDAR_ICS_URL` eintragen.
3. `npm run build` und `dist/` hochladen wie gewohnt.

Der Kalender wird **beim Build** gelesen: Besucherinnen und Besucher laden nichts von Google, es braucht also keinen Cookie-Hinweis. Neue Termine erscheinen erst nach dem nächsten Build und Upload. Wiederholungen (z. B. „jede Woche“), verschobene oder abgesagte Einzeltermine und mehrtägige Termine werden übernommen; als privat markierte Termine nicht. Wöchentliche Serien landen automatisch in „Jede Woche“, alles andere in „Events“. Ort und Beschreibung des Termins werden mit angezeigt, ein Link im Feld URL als „Mehr dazu“.

Ist `CALENDAR_ICS_URL` nicht gesetzt, zeigt die Seite Beispieltermine. Ist sie gesetzt, aber der Kalender nicht erreichbar, bricht der Build ab, damit keine veralteten Termine hochgeladen werden.

### Design-System

Alle Werte (Farben, Abstände, Radien, Schatten, Typo, Bewegung) stehen als CSS Custom Properties in `src/styles/tokens.css`. Komponenten verwenden ausschließlich diese Tokens. Die Button-Animation (Hover hebt 2px an, Klick drückt 3px ein, harter Schatten) ist in `src/components/Button.astro` zentral umgesetzt.
