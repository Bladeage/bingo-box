// Laden der mitgelieferten Pools/Themes und Verwaltung der selbst angelegten.
// Eigene Pools liegen nur im Browser des Nutzers — geteilt wird über den Link.

const STORE = {
  pools: "bingobox.pools",
  themes: "bingobox.themes",
  marks: "bingobox.marks",
  last: "bingobox.last",
};

const MAX_STORED_CARDS = 40; // ältere Abhak-Stände fallen hinten raus

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback; // privater Modus oder beschädigter Eintrag
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-cache" });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

/** Mitgelieferte Pools inklusive Begriffen. Ein defekter Eintrag kippt nicht den Rest. */
export async function loadBundled(kind) {
  const catalog = await fetchJson(`${kind}/index.json`);
  const entries = await Promise.all(
    catalog.map(async (entry) => {
      try {
        const loaded = await fetchJson(`${kind}/${entry.file}`);
        // Der Katalog ist die Wahrheit für id, Sprache und Thema — die Datei liefert den Inhalt.
        return { ...loaded, id: entry.id, language: entry.language ?? loaded.language, topic: entry.topic, builtin: true };
      } catch (error) {
        console.warn(`${kind}/${entry.file} konnte nicht geladen werden`, error);
        return null;
      }
    }),
  );
  return entries.filter(Boolean);
}

export const customPools = {
  all: () => read(STORE.pools, []),
  save(pool) {
    const pools = read(STORE.pools, []).filter((p) => p.id !== pool.id);
    pools.push(pool);
    return write(STORE.pools, pools);
  },
  remove(id) {
    return write(STORE.pools, read(STORE.pools, []).filter((p) => p.id !== id));
  },
};

export const customThemes = {
  all: () => read(STORE.themes, []),
  save(theme) {
    const themes = read(STORE.themes, []).filter((t) => t.id !== theme.id);
    themes.push(theme);
    return write(STORE.themes, themes);
  },
  remove(id) {
    return write(STORE.themes, read(STORE.themes, []).filter((t) => t.id !== id));
  },
};

export function newId(prefix, name) {
  const slug = String(name || "eigen")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return `${prefix}:${slug || "eigen"}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Abhak-Stand hängt an Seed, Pool und Raster — eine neue Karte startet leer. */
export function cardKey({ seed, poolId, cols, rows, freeSpace }) {
  return `${seed}|${poolId}|${cols}x${rows}|${freeSpace ? 1 : 0}`;
}

export function loadMarks(key) {
  const all = read(STORE.marks, {});
  return new Set(all[key] || []);
}

export function saveMarks(key, marks) {
  const all = read(STORE.marks, {});
  all[key] = [...marks];
  const keys = Object.keys(all);
  for (const old of keys.slice(0, Math.max(0, keys.length - MAX_STORED_CARDS))) delete all[old];
  write(STORE.marks, all);
}

export const lastSettings = {
  get: () => read(STORE.last, null),
  set: (settings) => write(STORE.last, settings),
};
