# bingo-box — Projekt-Notizen

Statische Web-App: Bingo-Karten mit frei wählbaren Begriffen und Branding.
Öffentlich unter <https://bladeage.github.io/bingo-box/>.

## Betriebsmodus

**Ship-Loop.** PR-Flow gilt trotzdem: Branch → PR → grüne CI → Merge. Nie direkt auf `main`.

## Deploy-Weg

**Merge auf `main` = Deploy.** GitHub Pages liefert direkt aus der Branch-Wurzel
(`source: main /`), es gibt **keinen** Deploy-Workflow und **keinen** Build-Schritt.
Das Repository ist die Website. Neue Dateien sind sofort live — entsprechend nichts
Halbfertiges nach `main` mergen.

Pages-Status prüfen: `gh api repos/Bladeage/bingo-box/pages --jq .status`

## Stack

Reines HTML/CSS/JS mit ES-Modulen, keine Laufzeit-Abhängigkeiten, kein Bundler.
`package.json` existiert nur für die Tests. `node_modules/` ist gitignored und wird
für den Browsertest gebraucht, nicht für die App.

## Tests

```bash
npm test              # Logik, ohne Abhängigkeiten — läuft überall
npm run test:browser  # Playwright/Chromium, startet seinen Webserver selbst
```

Beides läuft in `.github/workflows/test.yml` bei jedem PR und Push auf `main`.
Der Browsertest pinnt die Locale auf `de-DE`; ohne das erkennt die App Englisch
und die deutschen Textprüfungen schlagen fehl.

## Fallen

- **Kachelgröße** wird in `app.js` (`fitGrid`) gerechnet, die Grenzen stehen aber als
  `--cell-min`/`--cell-max` im Stylesheet. Die verfügbare Höhe kommt aus den
  **Geschwistern** von `<main>`, nie aus dessen eigener Höhe — sonst schaukelt sich
  die Rechnung auf.
- **Neue Sprache** = Block in `assets/i18n.js` **plus** ein Pool je Thema unter `pools/`.
  Fehlt eins von beidem, schlagen die Logik-Tests fehl. Das ist Absicht.
- **Mitgelieferte Pools** brauchen `language` und `topic` in `pools/index.json`; `topic`
  verbindet Übersetzungen derselben Liste beim Sprachwechsel.
- **Beispiel-Pools generisch halten** — keine Witze über namentlich genannte reale
  Personen. Deshalb wurde der Original-Pool des Vorgängers nicht übernommen.
- Ein **`fetch` auf `pools/`** heißt: lokal per Webserver öffnen, Doppelklick auf
  `index.html` reicht nicht.

## Herkunft

Nachfolger von `Bladeage/Hooked-Bingo-v3` (2018, WPF/C#) — dort archiviert und hierher
verlinkt.
