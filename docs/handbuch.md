# Bingo Box: Handbuch

Aus der früheren README übernommen. Kurzfassung und Start stehen in der [README](../README.md).

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

In [`assets/i18n.js`](../assets/i18n.js) einen Eintrag in `LANGUAGES` und einen Textblock in
`STRINGS` ergänzen, dann die passenden Pools unter `pools/` anlegen. Die Tests schlagen
fehl, sobald einer Sprache ein Textbaustein oder ein Pool-Thema fehlt — so bleibt nichts
still zurück.

## Für den eigenen Anlass forken

1. Repository forken
2. Eigene Dateien unter `pools/` und `themes/` ablegen, Kataloge ergänzen
3. Unter *Settings → Pages* die Quelle auf den `main`-Branch stellen
4. Fertig — die Seite liegt unter `https://<name>.github.io/<repo>/`

Ein Build-Schritt ist nicht nötig; das Repository ist die Website.
