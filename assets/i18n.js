// Oberflächensprache. Die Texte stehen hier, die Auszeichnung im HTML trägt nur
// data-i18n-Schlüssel. Neue Sprache = ein weiterer Eintrag in STRINGS plus passende
// Begriffslisten unter pools/.

export const LANGUAGES = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
];

const STRINGS = {
  de: {
    "app.tagline": "Eigene Begriffe, eigenes Aussehen, ein Link für alle.",
    "app.skip": "Direkt zur Karte",

    "toolbar.section": "Karte einstellen",
    "toolbar.pool": "Begriffe",
    "toolbar.theme": "Aussehen",
    "toolbar.grid": "Raster",
    "toolbar.language": "Sprache",
    "toolbar.freeSpace": "Freifeld in der Mitte",

    "btn.new": "Neue Karte",
    "btn.share": "Teilen",
    "btn.png": "Als Bild",
    "btn.pool": "Begriffe bearbeiten",
    "btn.theme": "Branding",
    "btn.cancel": "Abbrechen",
    "btn.save": "Übernehmen",
    "btn.delete": "Löschen",
    "btn.import": "Datei laden",
    "btn.export": "Als Datei sichern",
    "btn.close": "Schließen",
    "btn.copy": "Kopieren",
    "btn.copied": "Kopiert ✓",
    "btn.copyManual": "Mit Strg+C kopieren",

    "card.label": "Bingo-Karte",
    "card.free": "Freifeld",
    "card.info": "{pool} · {cols} × {rows} · Karte {seed}",
    "card.infoShort": "{pool} · {count} Begriffe",

    "status.progress": "{done} von {total} getroffen — noch {open} offen",
    "status.bingo": "BINGO! {lines}",
    "status.full": "Volle Karte! 🎉",
    "line.row": "Reihe",
    "line.column": "Spalte",
    "line.diagonal": "Diagonale",

    "error.poolTooSmall":
      "„{pool}“ hat {have} Begriffe, für {cols} × {rows} werden {needed} gebraucht. " +
      "Wähle ein kleineres Raster oder ergänze Begriffe.",
    "error.noPools":
      "Die Begriffs-Pools konnten nicht geladen werden. Beim lokalen Öffnen bitte einen " +
      "kleinen Webserver benutzen, z. B. „python3 -m http.server“.",
    "error.start": "Die Anwendung konnte nicht starten. Details stehen in der Browser-Konsole.",
    "error.logoTooBig":
      "Bitte ein Logo unter 300 KB wählen — größere Bilder machen den Teilen-Link unbrauchbar lang.",
    "error.themeFile": "Diese Datei ließ sich nicht als Theme lesen.",

    "group.builtin": "Mitgeliefert",
    "group.custom": "Eigene",
    "group.shared": "Aus dem Link",

    "pool.heading": "Begriffe",
    "pool.name": "Name des Pools",
    "pool.terms": "Ein Begriff pro Zeile",
    "pool.count": "{count} Begriffe — für {cols} × {rows} werden {needed} gebraucht",
    "pool.default": "Eigene Begriffe",
    "pool.shared": "Geteilte Begriffe",
    "pool.copySuffix": "{name} (eigene Fassung)",

    "theme.heading": "Branding",
    "theme.name": "Name des Themes",
    "theme.title": "Überschrift",
    "theme.subtitle": "Unterzeile",
    "theme.logo": "Logo (URL)",
    "theme.logoFile": "…oder Bilddatei",
    "theme.font": "Schrift",
    "theme.colors": "Farben",
    "theme.color.bg": "Hintergrund",
    "theme.color.tile": "Kachel",
    "theme.color.tileMarked": "Treffer",
    "theme.color.text": "Text",
    "theme.color.accent": "Akzent",
    "theme.links": "Fußzeilen-Links — je Zeile <code>Beschriftung | https://…</code>",
    "theme.default": "Eigenes Branding",
    "theme.shared": "Geteiltes Branding",
    "theme.midnight": "Mitternacht",
    "theme.paper": "Papier",
    "theme.neon": "Neon",

    "font.system": "Serifenlos",
    "font.serif": "Serif",
    "font.mono": "Monospace",
    "font.rounded": "Rund",

    "share.heading": "Teilen",
    "share.hint":
      "Der Link enthält Begriffe, Branding und die Kartennummer. Wer ihn öffnet, bekommt " +
      "<strong>genau dieselbe Karte</strong>. Nichts davon wird an einen Server geschickt.",
    "share.url": "Link",
    "share.sameCard": "Alle bekommen dieselbe Karte (sonst würfelt jeder neu)",

    "footer.links": "Links",
    "footer.colophon": "Läuft ohne Server, ohne Konto, ohne Tracking — ",
    "footer.source": "Quellcode & eigene Pools",
  },

  en: {
    "app.tagline": "Your own terms, your own look, one link for everyone.",
    "app.skip": "Skip to the card",

    "toolbar.section": "Card settings",
    "toolbar.pool": "Terms",
    "toolbar.theme": "Look",
    "toolbar.grid": "Grid",
    "toolbar.language": "Language",
    "toolbar.freeSpace": "Free space in the middle",

    "btn.new": "New card",
    "btn.share": "Share",
    "btn.png": "As image",
    "btn.pool": "Edit terms",
    "btn.theme": "Branding",
    "btn.cancel": "Cancel",
    "btn.save": "Apply",
    "btn.delete": "Delete",
    "btn.import": "Load file",
    "btn.export": "Save as file",
    "btn.close": "Close",
    "btn.copy": "Copy",
    "btn.copied": "Copied ✓",
    "btn.copyManual": "Press Ctrl+C to copy",

    "card.label": "Bingo card",
    "card.free": "Free space",
    "card.info": "{pool} · {cols} × {rows} · Card {seed}",
    "card.infoShort": "{pool} · {count} terms",

    "status.progress": "{done} of {total} marked — {open} to go",
    "status.bingo": "BINGO! {lines}",
    "status.full": "Full card! 🎉",
    "line.row": "Row",
    "line.column": "Column",
    "line.diagonal": "Diagonal",

    "error.poolTooSmall":
      "“{pool}” has {have} terms, but {cols} × {rows} needs {needed}. " +
      "Pick a smaller grid or add more terms.",
    "error.noPools":
      "The term pools could not be loaded. When opening the files locally, please use a " +
      "small web server, e.g. “python3 -m http.server”.",
    "error.start": "The app failed to start. See the browser console for details.",
    "error.logoTooBig":
      "Please pick a logo below 300 KB — larger images make the share link unusably long.",
    "error.themeFile": "This file could not be read as a theme.",

    "group.builtin": "Included",
    "group.custom": "Custom",
    "group.shared": "From the link",

    "pool.heading": "Terms",
    "pool.name": "Pool name",
    "pool.terms": "One term per line",
    "pool.count": "{count} terms — {cols} × {rows} needs {needed}",
    "pool.default": "Custom terms",
    "pool.shared": "Shared terms",
    "pool.copySuffix": "{name} (copy)",

    "theme.heading": "Branding",
    "theme.name": "Theme name",
    "theme.title": "Headline",
    "theme.subtitle": "Subtitle",
    "theme.logo": "Logo (URL)",
    "theme.logoFile": "…or image file",
    "theme.font": "Typeface",
    "theme.colors": "Colours",
    "theme.color.bg": "Background",
    "theme.color.tile": "Tile",
    "theme.color.tileMarked": "Marked",
    "theme.color.text": "Text",
    "theme.color.accent": "Accent",
    "theme.links": "Footer links — one per line: <code>Label | https://…</code>",
    "theme.default": "Custom branding",
    "theme.shared": "Shared branding",
    "theme.midnight": "Midnight",
    "theme.paper": "Paper",
    "theme.neon": "Neon",

    "font.system": "Sans serif",
    "font.serif": "Serif",
    "font.mono": "Monospace",
    "font.rounded": "Rounded",

    "share.heading": "Share",
    "share.hint":
      "The link carries the terms, the branding and the card number. Whoever opens it gets " +
      "<strong>exactly the same card</strong>. None of it is sent to a server.",
    "share.url": "Link",
    "share.sameCard": "Everyone gets the same card (otherwise each player rolls their own)",

    "footer.links": "Links",
    "footer.colophon": "No server, no account, no tracking — ",
    "footer.source": "Source code & custom pools",
  },
};

const STORAGE_KEY = "bingobox.lang";
const FALLBACK = "de";

let current = FALLBACK;

export const locale = () => current;

export function isSupported(code) {
  return Object.hasOwn(STRINGS, code);
}

/** Gespeicherte Wahl schlägt Browsersprache schlägt Deutsch. */
export function detectLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isSupported(stored)) return stored;
  } catch {
    // privater Modus — dann eben die Browsersprache
  }
  const tags = typeof navigator === "undefined" ? [] : navigator.languages || [navigator.language || ""];
  for (const tag of tags) {
    const code = String(tag).slice(0, 2).toLowerCase();
    if (isSupported(code)) return code;
  }
  return FALLBACK;
}

export function setLocale(code, { remember = true } = {}) {
  current = isSupported(code) ? code : FALLBACK;
  if (typeof document !== "undefined") document.documentElement.lang = current;
  if (remember) {
    try {
      localStorage.setItem(STORAGE_KEY, current);
    } catch {
      // nicht schlimm: die Wahl gilt dann nur für diese Sitzung
    }
  }
  return current;
}

/** Alle Schlüssel einer Sprache — für Werkzeuge und Tests, die auf Vollständigkeit prüfen. */
export function translationKeys(code = current) {
  return Object.keys(STRINGS[code] ?? {});
}

export function t(key, values = {}) {
  const template = STRINGS[current][key] ?? STRINGS[FALLBACK][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(values, name) ? String(values[name]) : match,
  );
}

/**
 * Übersetzt alles im Dokument, was einen Schlüssel trägt:
 * data-i18n (Textinhalt), data-i18n-html (erlaubt Auszeichnung), data-i18n-placeholder.
 */
export function translateDocument(root = document) {
  for (const node of root.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of root.querySelectorAll("[data-i18n-html]")) {
    node.innerHTML = t(node.dataset.i18nHtml);
  }
  for (const node of root.querySelectorAll("[data-i18n-placeholder]")) {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  }
  for (const node of root.querySelectorAll("[data-i18n-label]")) {
    node.setAttribute("aria-label", t(node.dataset.i18nLabel));
  }
}
