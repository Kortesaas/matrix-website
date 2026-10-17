# Die MatriX – Website

Website des Jugendzentrums **Die MatriX** in Königsbrunn. Gebaut mit [Astro](https://astro.build); auf dem Webspace läuft sie mit PHP 8.4, damit das Team Öffnungszeiten, Team, Hinweis-Banner und Flyer im Verwaltungsbereich unter `/admin/` selbst pflegen kann. Termine kommen live aus Google Calendar.

## Entwicklung

Voraussetzung: Node.js ≥ 22.22, für die lokale Vorschau mit Verwaltung außerdem PHP ≥ 8.3 (mit GD und cURL).

```bash
npm install
npm run dev       # Design-Entwicklung auf http://localhost:4321 (ohne PHP, mit Beispielterminen)
npm run build     # Typprüfung, Build und PHP-Umbau nach dist/
npm run serve     # dist/ mit PHP auf http://127.0.0.1:4330, inklusive /admin/
npm test          # Tests
```

`npm run dev` kann kein PHP ausführen. Gepflegte Inhalte zeigt es deshalb mit den Startdaten aus `src/data/`, Termine als Beispieltermine, Banner und Flyer gar nicht. Alles Echte prüft man mit `npm run build && npm run serve`. Die lokalen Daten der Verwaltung landen dabei in `matrix-data/` im Projektordner (nicht im Git).

## Veröffentlichen

`npm run build` erzeugt in `dist/` die fertige Website. Der **Inhalt** von `dist/` wird in das Webroot des Webspaces hochgeladen (inklusive der versteckten Dateien `.htaccess`). Der Server braucht PHP 8.4 mit GD (Bilder) und cURL (Kalender), Node.js nicht.

**Wichtig:** Beim Hochladen nie den Datenordner löschen. Die Verwaltung legt ihn beim ersten Aufruf selbst an, bevorzugt *neben* dem Webroot als `matrix-data/`, sonst als `_data/` im Webroot (per `.htaccess` gesperrt). Darin liegen Konten, Inhalte, hochgeladene Bilder und der Verlauf. Ein FTP-Programm im Modus „Spiegeln/Synchronisieren mit Löschen“ würde `_data/` mit löschen; normales Hochladen (Überschreiben) ist unproblematisch. Backups: diesen Ordner sichern.

**Erster Start:** `/admin/` aufrufen. Solange es kein Konto gibt, erscheint die Ersteinrichtung. Sie verlangt einen Schlüssel aus der Datei `setup-key.php` im Datenordner (per FTP herunterladen und im Texteditor öffnen; im Browser zeigt sie absichtlich nichts); so kann niemand Fremdes das erste Admin-Konto anlegen. Danach unter **Konten** für jede Person ein eigenes Konto anlegen und unter **Kalender** die Google-Calendar-Adresse eintragen.

## Aufbau

```
src/
  pages/        eine Datei pro Seite (index, angebot, raeume, werkstatt, team, aktuelles, mitmachen, impressum, 404)
                matrix-seed.json.ts: Startinhalte (Öffnungszeiten, Team) für die Verwaltung
  layouts/      BaseLayout: <head>, Navigation, Footer
  components/   wiederverwendbare Bausteine (Button, PageHero, PhotoFrame, FeatureRow, Campus3D …)
    php/        Dynamic + PhpTemplate: Stellen, die PHP mit gepflegten Inhalten füllt
  data/         Inhalte: Angebote, Räume, Werkstatt, Events, Team, Kontaktdaten, Social Links
    calendar/   ics.ts: liest iCal-Kalender (Google Calendar u. a.)
  styles/       tokens.css (Design-Tokens), fonts.css, global.css
  scripts/      Kalender (Laden, Monatsansicht), 3D-Modell der Startseite (campus/)
  assets/       Fotos & Bitmaps – werden beim Build optimiert (AVIF/WebP, mehrere Größen)
public/
  graphics/     Sticker, Formen, Hero-Ebenen (Design-SVGs mit interaktiven Figuren)
  fonts/        selbst gehostete Schriften (Boogaloo, Figtree – SIL OFL)
server/         PHP, wird beim Build nach dist/ kopiert
  _app/         gemeinsamer Code: Speicher, Konten, Bilder, Kalender, Render-Funktionen (gesperrt)
  admin/        Verwaltungsbereich /admin/
  api/          calendar.php: Termine aus Google Calendar, auf dem Server zwischengespeichert
  media.php     liefert hochgeladene Bilder aus dem Datenordner aus
scripts/
  postbuild.mjs macht aus dist/ die PHP-Website (siehe unten)
```

### Sicherheit

- **Im Build steckt kein Geheimnis.** `dist/` enthält nur Code, Vorlagen und öffentliche Startdaten. Passwörter (nur als Hash), die geheime Kalender-Adresse, Sitzungen und der Verlauf entstehen erst auf dem Server im Datenordner.
- **Datenordner:** bevorzugt *neben* dem Webordner. Liegt er doch im Webordner (`_data/`), sperren ihn `.htaccess`-Dateien. Zusätzlich ist jede Datendatei eine `.php`-Datei, die sofort endet; selbst ein falsch eingestellter Server gibt also nichts preis. Unterordner haben eine leere `index.html`, damit sie nie aufgelistet werden.
- **Kalender:** `/api/calendar.php` liefert nur, was die Website zeigt. Private Termine, E-Mail-Adressen von Organisator und Gästen, Erinnerungen und interne Google-Felder werden auf dem Server entfernt.
- **Verwaltung:** läuft nur über HTTPS (außer lokal), Cookies nur für angemeldete Personen (`HttpOnly`, `SameSite=Strict`, `Secure`), Schutz gegen gefälschte Formulare (CSRF), Sperre nach 5 Fehlversuchen, Bilder werden neu kodiert.
- **Selbstprüfung:** Auf der Übersicht der Verwaltung zeigt Admins der Kasten **Sicherheit**, ob HTTPS aktiv ist, wo der Datenordner liegt und ob gesperrte Adressen von außen wirklich gesperrt sind. Nach dem ersten Upload dort nachsehen.
- Den lokalen Ordner `matrix-data/` nie hochladen: Er enthält Testkonten.

### Wie Astro und PHP zusammenspielen

Das Aussehen steht weiterhin nur in den Astro-Komponenten. Stellen mit gepflegten Inhalten markiert `<Dynamic render="…">`, die Vorlage für einen Eintrag (z. B. eine Team-Karte) steht in `<PhpTemplate name="…">` mit Platzhaltern wie `%%name%%`. Nach `astro build` macht `scripts/postbuild.mjs` aus jeder Seite eine `index.php`, legt die Vorlagen nach `dist/_app/templates/` und kopiert `server/` dazu. Beim Aufruf füllt `server/_app/render.php` die Vorlagen mit den Inhalten aus dem Datenordner. Wer eine Team-Karte oder den Footer umgestaltet, ändert also nur die Astro-Komponente.

### Inhalte pflegen

- **Im Verwaltungsbereich (`/admin/`):** Öffnungszeiten, Team (inklusive FSJler und Fotos), Hinweis-Banner auf der Startseite, Flyer auf „Aktuelles“. Jede Person hat ein eigenes Konto, der **Verlauf** zeigt, wer was geändert hat. Rollen: *Redaktion* pflegt Inhalte, *Admin* zusätzlich Konten und Kalender.
- **Texte, Angebote, Räume:** in `src/data/*.ts` – die Seiten lesen von dort. `site.ts` (Öffnungszeiten) und `team.ts` sind nur noch die Startdaten, bis jemand in der Verwaltung speichert.
- **Schreibstil:** Website-Texte verwenden keine Gedankenstriche. Stattdessen passende Punkte, Kommas, Doppelpunkte oder neue Sätze setzen. Uhrzeiten mit „bis“ verbinden.
- **Termine:** kommen aus einem Online-Kalender, siehe „Kalender“ unten.
- **Fotos austauschen:** neue Datei nach `src/assets/photos/` legen und den Import in der passenden Datei in `src/data/` (bzw. der Seite) anpassen. Zuschnitt und Rahmen ergeben sich aus der Komponente.
- **Seitenfarbe:** jede Seite setzt genau eine Akzentfarbe (`accent` im `BaseLayout`). Die Startseite wählt mit `randomAccent` bei jedem Laden eine zufällige Farbe aus `homeAccents` in `src/data/site.ts`: Lila, Blau, Koralle und Grün, wie auf den Unterseiten. Sie vermeidet die vorherige Farbe, sofern Sitzungsspeicher verfügbar ist. Cursor-Ärmel, Textauswahl und 3D-Modell übernehmen die Seitenfarbe; der Handschuh bleibt weiß. Die farbigen Cursor-PNGs werden beim Build aus den vorhandenen Handgrafiken und den CSS-Farbwerten erzeugt.
- **3D-Räume (Startseite):** Raumnamen, Texte, Fotos und Links stehen in `src/data/campus.ts`.
- **3D-Grundriss:** `src/data/campus-plan.js` enthält die mit „Lageplan beschriftet.png“ abgeglichenen Raumflächen, Marker-Anker und vereinfachten Innenwände. Modellböden und Hervorhebungen verwenden dieselben Polygone. Gebäudehöhen und Möblierung bleiben schematisch; die Innenansicht zeigt niedrige Raumgrenzen statt kleinteiliger WC- und Techniktrennwände.

### Kalender

Google Calendar ist die Quelle für alle Termine („Events“, „Jede Woche“ und den Monatskalender auf „Aktuelles“). Das Team trägt Termine nur dort ein; die Website zeigt Änderungen nach spätestens zehn Minuten, ohne neuen Build.

- **Einrichten:** In Google Calendar unter *Einstellungen › Kalender wählen › Kalender integrieren* die **geheime Adresse im iCal-Format** kopieren und in der Verwaltung unter **Kalender** eintragen. Der Kalender muss dafür nicht öffentlich sein; die Adresse bleibt auf dem Server.
- **So läuft es:** Die Seite fragt `/api/calendar.php`. Das holt den Kalender auf unserem Server, hält ihn zehn Minuten vor und liefert ihn aus; ist Google nicht erreichbar, gilt die letzte Kopie. Der Browser liest ihn mit `src/data/calendar/ics.ts`. Besucherinnen und Besucher laden nichts von Google, es braucht also keinen Cookie-Hinweis.
- **Übernommen werden** Wiederholungen, verschobene oder abgesagte Einzeltermine und mehrtägige Termine, Ort und Beschreibung (Links darin werden klickbar). Als privat markierte Termine bleiben verborgen. Wöchentliche Serien landen unter „Jede Woche“, alles andere unter „Events“.

### Design-System

Alle Werte (Farben, Abstände, Radien, Schatten, Typo, Bewegung) stehen als CSS Custom Properties in `src/styles/tokens.css`. Komponenten verwenden ausschließlich diese Tokens. Die Button-Animation (Hover hebt 2px an, Klick drückt 3px ein, harter Schatten) ist in `src/components/Button.astro` zentral umgesetzt.
