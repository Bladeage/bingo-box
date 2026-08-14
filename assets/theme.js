// Branding: Farben, Schrift, Titel, Logo und Fußzeilen-Links kommen aus einem
// einfachen Objekt und landen als CSS-Variablen im Dokument.

export const FONT_STACKS = {
  system: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  serif: "'Iowan Old Style', Georgia, 'Times New Roman', serif",
  mono: "'SF Mono', 'JetBrains Mono', Consolas, 'Liberation Mono', monospace",
  rounded: "'Nunito', 'Trebuchet MS', system-ui, sans-serif",
};

export const DEFAULT_THEME = {
  id: "standard",
  name: "Standard",
  title: "Bingo Box",
  subtitle: "Eigene Begriffe, eigenes Aussehen, ein Link für alle.",
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
  return merged;
}

export function applyTheme(theme, { root = document.documentElement } = {}) {
  const t = normalizeTheme(theme);
  for (const [key, value] of Object.entries(t.colors)) {
    root.style.setProperty(`--c-${key}`, value);
  }
  root.style.setProperty("--c-accentText", readableOn(t.colors.accent));
  root.style.setProperty("--c-markedText", readableOn(t.colors.tileMarked));
  // Warnrot muss auf hellem wie dunklem Grund lesbar bleiben.
  root.style.setProperty("--c-danger", readableOn(t.colors.bg) === "#101010" ? "#c92a2a" : "#ff8787");
  root.style.setProperty("--font-body", FONT_STACKS[t.font]);

  document.title = t.title ? `${t.title} — Bingo` : "Bingo Box";

  const titleEl = document.getElementById("brand-title");
  const subtitleEl = document.getElementById("brand-subtitle");
  const logoEl = document.getElementById("brand-logo");
  const linksEl = document.getElementById("brand-links");

  if (titleEl) titleEl.textContent = t.title;
  if (subtitleEl) {
    subtitleEl.textContent = t.subtitle;
    subtitleEl.hidden = !t.subtitle;
  }
  if (logoEl) {
    logoEl.hidden = !t.logo;
    if (t.logo) {
      logoEl.src = t.logo;
      logoEl.alt = t.title ? `Logo ${t.title}` : "Logo";
    } else {
      logoEl.removeAttribute("src");
    }
  }
  if (linksEl) {
    linksEl.replaceChildren(
      ...t.links.map(({ label, url }) => {
        const a = document.createElement("a");
        a.href = url;
        a.textContent = label;
        a.rel = "noopener noreferrer";
        a.target = "_blank";
        return a;
      }),
    );
  }
  return t;
}
