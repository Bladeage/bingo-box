# Bingo Box

Bingo cards for any occasion — a meeting, a games showcase, a football match, a Sunday
night crime drama. Your own terms, your own branding, one link for everyone.

**→ [Open the app](https://bladeage.github.io/bingo-box/)** · [Deutsche Fassung dieser Datei](README.de.md)

Runs entirely in the browser: no install, no account, no server, no tracking. Everything
you type stays on your device or inside the link you choose to pass on.

## What it does

- **Play a card:** tap the tiles, bingo is detected automatically (row, column, diagonal, full card)
- **Pick a grid:** 3 × 3 up to 5 × 6, with an optional free space in the middle
- **Tiles fit the window:** the card is sized to the space available, between a minimum and a maximum
- **Two interface languages:** German and English, detected from the browser and switchable
- **Your own terms:** type them in, load them from a file, export them again
- **Your own branding:** headline, subtitle, logo, typeface, colours — for a club, a stream or a company party
- **Share:** one link carries the terms, the branding and the card number. Whoever opens it gets **the same card** — the prerequisite for playing together
- **Save as an image:** PNG for chat, Discord or the printer
- **Progress survives:** reloading does not lose the tiles you already marked

## Your own terms

Fastest way: **“Edit terms”** in the app. To ship a list permanently, put it in `pools/`:

```json
{
  "id": "my-list.en",
  "name": "My List",
  "description": "What the list is for.",
  "language": "en",
  "terms": ["First term", "Second term", "…"]
}
```

Then add an entry to `pools/index.json`:

```json
{ "id": "my-list.en", "topic": "my-list", "language": "en", "file": "my-list.en.json" }
```

`topic` ties translations of the same list together: switching the interface language also
switches the pool to the matching one, if there is one.

Rule of thumb: at least as many terms as there are tiles — 25 for a 5 × 5 grid, ideally a
lot more so that players' cards differ. If a pool is too small, the app says so with
numbers instead of breaking.

Eight pools ship with the app: **Meeting Bingo**, **Games Showcase**, **Football
Commentary** and **Crime Drama**, each in German and English.

## Your own branding

Themes live in `themes/` and work the same way. The editor asks for five colours and
mixes the rest to match.

```json
{
  "id": "my-club",
  "name": "My Club",
  "title": "Clubhouse Bingo",
  "subtitle": "Every Friday from 8pm",
  "logo": "https://example.org/logo.png",
  "font": "system",
  "colors": { "bg": "#101820", "tile": "#1d2733", "tileMarked": "#f2a900", "text": "#ffffff", "accent": "#f2a900" },
  "links": [{ "label": "Website", "url": "https://example.org" }]
}
```

`font` accepts `system`, `serif`, `mono` and `rounded`. `logo` takes a URL or an embedded
image — the latter makes the share link long, so it is capped at 300 KB. The themes that
ship with the app use `nameKey` instead of `name` so their names follow the interface
language.

## Another interface language

Add an entry to `LANGUAGES` and a block of strings to `STRINGS` in
[`assets/i18n.js`](assets/i18n.js), then add the matching pools under `pools/`. The test
suite fails if a language is missing a string or a pool topic, so nothing can quietly
fall behind.

## Fork it for your own event

1. Fork the repository
2. Drop your files into `pools/` and `themes/` and extend the catalogues
3. Under *Settings → Pages*, set the source to the `main` branch
4. Done — your copy lives at `https://<name>.github.io/<repo>/`

There is no build step; the repository is the website.

## Run it locally

The pools are fetched over HTTP, so a small web server is needed — double-clicking
`index.html` is blocked by the browser's security rules:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Tests

```bash
npm test              # card logic, bingo detection, share encoding, translations, shipped files
npm install           # only needed for the browser test
npm run test:browser  # clicks through the app in Chromium
```

Both run on every pull request via GitHub Actions.

## Layout

```
index.html          page structure
assets/app.js       wiring: selectors, dialogs, events, tile sizing
assets/card.js      card generation (deterministic) and bingo detection
assets/share.js     encode/decode the configuration in the URL fragment
assets/theme.js     branding as CSS variables
assets/i18n.js      interface strings and language detection
assets/data.js      catalogues, custom pools, marked-tile storage
assets/export.js    PNG output via canvas
pools/              term lists
themes/             branding presets
```

## Origin

Successor to [Hooked-Bingo-v3](https://github.com/Bladeage/Hooked-Bingo-v3) (2018) — a
Windows program in C#/WPF that painted a fixed card template with terms from Pastebin for
one particular community. This version does the same for everyone: in the browser, on any
device, with freely chosen terms and a freely chosen look.

## Licence

[MIT](LICENSE)
