// Branding: Farben, Schrift, Titel, Logo und Fußzeilen-Links kommen aus einem
// einfachen Objekt und landen als CSS-Variablen im Dokument.

import { t } from "./i18n.js";

export const APP_NAME = "Bingo Box";

export const FONT_STACKS = {
  system: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  serif: "'Iowan Old Style', Georgia, 'Times New Roman', serif",
  mono: "'SF Mono', 'JetBrains Mono', Consolas, 'Liberation Mono', monospace",
  rounded: "'Nunito', 'Trebuchet MS', system-ui, sans-serif",
};

// Titel, Unterzeile und Name werden erst beim Normalisieren gesetzt — sie hängen
// an der Oberflächensprache, die sich zur Laufzeit ändern kann.
export const DEFAULT_THEME = {
  id: "standard",
  name: "",
  title: APP_NAME,
  subtitle: "",
  logo: "",
  font: "system",
  colors: {
    bg: "#12141c",
    surface: "#1c1f2b",
    tile: "#252a39",
    tileMarked: "#3b5bdb",
    text: "#f1f3f7",
    textMuted: "#9aa3b8",
    accent: "#63e6be",
    line: "#333a4d",
  },
  links: [],
};

function hexToRgb(hex) {
  const value = String(hex).replace("#", "");
  const full = value.length === 3 ? [...value].map((c) => c + c).join("") : value.padEnd(6, "0");
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

function mix(from, to, ratio) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const channel = (i) => Math.round(a[i] + (b[i] - a[i]) * ratio).toString(16).padStart(2, "0");
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

/**
 * Schwarz oder Weiß — je nachdem, was auf der Fläche lesbar ist. Ohne das steht bei
 * einem hellen Akzent dunkler Text auf dunklem Grund (oder umgekehrt).
 */
export function readableOn(background) {
  const [r, g, b] = hexToRgb(background).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.42 ? "#101010" : "#ffffff";
}

/**
 * Im Editor wählt man fünf Farben, der Rest wird daraus gemischt — so bleibt jedes
 * selbstgebaute Theme in sich stimmig, egal ob hell oder dunkel.
 */
export function deriveColors(colors) {
  const base = { ...DEFAULT_THEME.colors, ...colors };
  return {
    ...base,
    surface: colors.surface || mix(base.bg, base.text, 0.07),
    line: colors.line || mix(base.bg, base.text, 0.2),
    textMuted: colors.textMuted || mix(base.text, base.bg, 0.45),
  };
}

/** Ergänzt fehlende Felder, damit auch ein halb ausgefülltes Theme nie die Seite zerlegt. */
export function normalizeTheme(theme) {
  const merged = { ...DEFAULT_THEME, ...(theme || {}) };
  merged.colors = { ...DEFAULT_THEME.colors, ...(theme?.colors || {}) };
  merged.links = Array.isArray(theme?.links) ? theme.links.filter((l) => l && l.url && l.label) : [];
  if (!FONT_STACKS[merged.font]) merged.font = "system";

  // Mitgelieferte Themes tragen nur einen Schlüssel und heißen in jeder Sprache anders.
  merged.name = theme?.nameKey ? t(theme.nameKey) : theme?.name || t("theme.default");
  merged.title = theme?.title ?? APP_NAME;
  merged.subtitle = theme?.subtitle ?? t("app.tagline");
  return merged;
}

export function applyTheme(theme, { root = document.documentElement } = {}) {
  const brand = normalizeTheme(theme);
  for (const [key, value] of Object.entries(brand.colors)) {
    root.style.setProperty(`--c-${key}`, value);
  }
  root.style.setProperty("--c-accentText", readableOn(brand.colors.accent));
  root.style.setProperty("--c-markedText", readableOn(brand.colors.tileMarked));
  // Warnrot muss auf hellem wie dunklem Grund lesbar bleiben.
  root.style.setProperty("--c-danger", readableOn(brand.colors.bg) === "#101010" ? "#c92a2a" : "#ff8787");
  root.style.setProperty("--font-body", FONT_STACKS[brand.font]);

  document.title = brand.title && brand.title !== APP_NAME ? `${brand.title} — ${APP_NAME}` : APP_NAME;

  const titleEl = document.getElementById("brand-title");
  const subtitleEl = document.getElementById("brand-subtitle");
  const logoEl = document.getElementById("brand-logo");
  const linksEl = document.getElementById("brand-links");

  if (titleEl) titleEl.textContent = brand.title;
  if (subtitleEl) {
    subtitleEl.textContent = brand.subtitle;
    subtitleEl.hidden = !brand.subtitle;
  }
  if (logoEl) {
    logoEl.hidden = !brand.logo;
    if (brand.logo) {
      logoEl.src = brand.logo;
      logoEl.alt = brand.title ? `Logo ${brand.title}` : "Logo";
    } else {
      logoEl.removeAttribute("src");
    }
  }
  if (linksEl) {
    linksEl.replaceChildren(
      ...brand.links.map(({ label, url }) => {
        const a = document.createElement("a");
        a.href = url;
        a.textContent = label;
        a.rel = "noopener noreferrer";
        a.target = "_blank";
        return a;
      }),
    );
  }
  return brand;
}
