# Bingo Box

> **Archiviert (Oktober 2026).** Dieses Projekt wird nicht mehr weiterentwickelt.
> Der Code bleibt als Referenz lesbar. Issues und Pull Requests sind geschlossen.

[English version](README.en.md)

Bingo Box erzeugt Bingo-Karten für jeden Anlass, etwa für ein Meeting, eine Spieleshow, einen
Fußballabend oder den Sonntagskrimi. Begriffe und Aussehen sind frei wählbar, ein Link reicht zum
gemeinsamen Spielen. Die Anwendung läuft vollständig im Browser, ohne Installation, Konto, Server oder
Tracking. Alles Eingegebene bleibt auf dem Gerät oder in dem Link, den man selbst weitergibt.

## Funktionen

- Karte spielen: Felder antippen, Bingo wird automatisch erkannt (Reihe, Spalte, Diagonale, volle Karte).
- Raster von 3 × 3 bis 5 × 6, wahlweise mit Freifeld in der Mitte.
- Kacheln passen sich dem Fenster an, zwischen einer Mindest- und einer Höchstgröße.
- Oberfläche auf Deutsch und Englisch, aus dem Browser erkannt und umschaltbar.
- Eigene Begriffe eintippen, als Datei laden und wieder exportieren.
- Eigenes Branding: Titel, Unterzeile, Logo, Schrift und Farben.
- Teilen per Link mit Begriffen, Branding und Kartennummer. Wer ihn öffnet, bekommt dieselbe Karte.
- Export als PNG für Chat, Discord oder zum Ausdrucken.
- Abgehakte Felder bleiben beim Neuladen erhalten.

## Stand

- Die Anwendung ist unter https://bladeage.github.io/bingo-box/ veröffentlicht (GitHub Pages).
- Mitgeliefert sind 36 Begriffslisten (18 Themen, jeweils Deutsch und Englisch) und 12 Themes.
- Bekannte Grenze: Ein eingebettetes Logo macht den Teilen-Link lang, deshalb ist bei 300 KB Schluss.
- Reicht eine Begriffsliste nicht für das Raster, meldet die Anwendung das mit Zahlen.
- Ein offener Pull Request (#2) bleibt unverändert als Referenz erhalten.
- Bingo Box ist der Nachfolger von [Hooked-Bingo-v3](https://github.com/Bladeage/Hooked-Bingo-v3) (2018),
  einem Windows-Programm in C#/WPF, das für eine bestimmte Community eine feste Kartenvorlage mit
  Begriffen von Pastebin bemalt hat.
- Eigene Begriffslisten, eigene Themes, weitere Oberflächensprachen und eigene Kopien per Fork:
  [Handbuch](docs/handbuch.md).

## Voraussetzungen und Start

Kein Build-Schritt, das Repository ist die Website. Die Begriffslisten werden per `fetch` geladen,
deshalb braucht es lokal einen kleinen Webserver:

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

Tests (Node.js):

```bash
npm test              # Kartenlogik, Bingo-Erkennung, Teilen-Kodierung, Übersetzungen, mitgelieferte Dateien
npm install           # nur für den Browsertest nötig
npm run test:browser  # klickt die Anwendung in Chromium durch
```

## Projektstruktur

- `index.html` Aufbau der Seite
- `assets/` Skripte: Verdrahtung, Kartenerzeugung und Bingo-Erkennung, Teilen-Kodierung, Branding,
  Oberflächentexte, Kataloge, PNG-Export
- `pools/` Begriffslisten
- `themes/` Branding-Vorlagen
- `test/` Tests
- `docs/handbuch.md` Anleitung für eigene Listen, Themes und Sprachen

## Lizenz

MIT, siehe [LICENSE](LICENSE).
