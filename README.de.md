# Bingo Box

Bingo-Karten für jeden Anlass — Meeting, Spieleshow, Fußballabend, Sonntagskrimi.
Eigene Begriffe, eigenes Branding, ein Link für alle.

**→ [Zur Anwendung](https://bladeage.github.io/bingo-box/)** · [English version of this file](README.md)

Läuft vollständig im Browser: keine Installation, kein Konto, kein Server, kein Tracking.
Alles, was du eingibst, bleibt auf deinem Gerät oder in dem Link, den du selbst weitergibst.

## Was es kann

- **Karte spielen:** Felder antippen, Bingo wird automatisch erkannt (Reihe, Spalte, Diagonale, volle Karte)
- **Raster wählen:** 3 × 3 bis 5 × 6, wahlweise mit Freifeld in der Mitte
- **Kacheln passen sich dem Fenster an:** die Karte wird auf den verfügbaren Platz bemessen, zwischen einer Mindest- und einer Höchstgröße
- **Zwei Oberflächensprachen:** Deutsch und Englisch, aus dem Browser erkannt und umschaltbar
- **Eigene Begriffe:** eintippen oder als Datei laden, wieder exportieren
- **Eigenes Branding:** Titel, Unterzeile, Logo, Schrift, Farben — für Verein, Stream oder Firmenfeier
- **Teilen:** ein Link enthält Begriffe, Branding und Kartennummer. Wer ihn öffnet, bekommt **dieselbe** Karte — Voraussetzung dafür, gemeinsam zu spielen
- **Als Bild sichern:** PNG für Chat, Discord oder zum Ausdrucken
- **Stand bleibt erhalten:** Neuladen verliert die abgehakten Felder nicht

## Eigene Begriffe

Am schnellsten über **„Begriffe bearbeiten"** in der Anwendung. Wer eine Liste dauerhaft
mitliefern will, legt sie unter `pools/` ab:

```json
{
  "id": "meine-liste.de",
  "name": "Meine Liste",
  "description": "Wofür die Liste gedacht ist.",
  "language": "de",
  "terms": ["Erster Begriff", "Zweiter Begriff", "…"]
}
```

Danach einen Eintrag in `pools/index.json` ergänzen:

```json
{ "id": "meine-liste.de", "topic": "meine-liste", "language": "de", "file": "meine-liste.de.json" }
```

`topic` verbindet Übersetzungen derselben Liste: beim Sprachwechsel springt die Auswahl
auf den passenden Pool, sofern es ihn gibt.

Faustregel: mindestens so viele Begriffe wie Felder — für 5 × 5 also 25, besser deutlich
mehr, damit sich die Karten der Mitspielenden unterscheiden. Reicht der Pool nicht, sagt
die Anwendung das mit Zahlen statt abzustürzen.

Mitgeliefert sind 36 Pools, achtzehn Themen jeweils auf Deutsch und Englisch:
**Meeting-Bingo**, **Games-Showcase**, **Fußball-Kommentar**, **Krimi-Sonntag**,
**Homeoffice**, **Bahnfahrt**, **Weihnachten**, **Silvester**, **Autofahrt**,
**Fitnessstudio**, **Elternabend**, **Serienabend**, **Heimwerken**, **Festival**,
**Hochzeit**, **Wetterbericht**, **Supermarkt** und **Code-Review**.

## Eigenes Branding

Themes liegen unter `themes/` und funktionieren genauso. Im Editor wählt man fünf Farben,
die übrigen werden passend dazu gemischt.

```json
{
  "id": "mein-verein",
  "name": "Mein Verein",
  "title": "Vereinsheim-Bingo",
  "subtitle": "Jeden Freitag ab 20 Uhr",
  "logo": "https://example.org/logo.png",
  "font": "system",
  "colors": { "bg": "#101820", "tile": "#1d2733", "tileMarked": "#f2a900", "text": "#ffffff", "accent": "#f2a900" },
  "links": [{ "label": "Website", "url": "https://example.org" }]
}
```

`font` kennt `system`, `serif`, `mono` und `rounded`. Als `logo` geht eine URL oder ein
eingebettetes Bild — Letzteres macht den Teilen-Link lang, deshalb ist bei 300 KB Schluss.
Die mitgelieferten Themes tragen statt `name` einen `nameKey`, damit ihr Name der
Oberflächensprache folgt. Zwölf sind dabei: **Mitternacht**, **Papier**, **Neon**,
**Wald**, **Ozean**, **Sonnenuntergang**, **Bibliothek**, **Kreidetafel**, **Retro**,
**Bonbon**, **Schiefer** und **Hoher Kontrast** — hell wie dunkel, mit allen vier
Schriftarten.

## Weitere Oberflächensprache

In [`assets/i18n.js`](assets/i18n.js) einen Eintrag in `LANGUAGES` und einen Textblock in
`STRINGS` ergänzen, dann die passenden Pools unter `pools/` anlegen. Die Tests schlagen
fehl, sobald einer Sprache ein Textbaustein oder ein Pool-Thema fehlt — so bleibt nichts
still zurück.

## Für den eigenen Anlass forken

1. Repository forken
2. Eigene Dateien unter `pools/` und `themes/` ablegen, Kataloge ergänzen
3. Unter *Settings → Pages* die Quelle auf den `main`-Branch stellen
4. Fertig — die Seite liegt unter `https://<name>.github.io/<repo>/`

Ein Build-Schritt ist nicht nötig; das Repository ist die Website.

## Lokal ausprobieren

Die Pools werden per `fetch` geladen, deshalb braucht es einen kleinen Webserver —
ein Doppelklick auf `index.html` reicht wegen der Browser-Sicherheitsrichtlinien nicht:

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

## Tests

```bash
npm test              # Kartenlogik, Bingo-Erkennung, Teilen-Kodierung, Übersetzungen, mitgelieferte Dateien
npm install           # nur für den Browsertest nötig
npm run test:browser  # klickt die Anwendung in Chromium durch
```

Beides läuft auch bei jedem Pull Request über GitHub Actions.

## Aufbau

```
index.html          Aufbau der Seite
assets/app.js       Verdrahtung: Auswahl, Dialoge, Ereignisse, Kachelgröße
assets/card.js      Kartenerzeugung (deterministisch) und Bingo-Erkennung
assets/share.js     Konfiguration im URL-Fragment kodieren/dekodieren
assets/theme.js     Branding als CSS-Variablen
assets/i18n.js      Oberflächentexte und Spracherkennung
assets/data.js      Kataloge, eigene Pools, Abhak-Stand
assets/export.js    PNG-Ausgabe über Canvas
pools/              Begriffslisten
themes/             Branding-Vorlagen
```

## Herkunft

Nachfolger von [Hooked-Bingo-v3](https://github.com/Bladeage/Hooked-Bingo-v3) (2018) —
einem Windows-Programm in C#/WPF, das für eine bestimmte Community eine feste Kartenvorlage
mit Begriffen von Pastebin bemalt hat. Diese Fassung tut dasselbe für alle: im Browser,
auf jedem Gerät, mit frei wählbaren Begriffen und frei wählbarem Aussehen.

## Lizenz

[MIT](LICENSE)
