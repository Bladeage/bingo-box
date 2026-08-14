// Kartenerzeugung und Bingo-Erkennung.
// Alles hier ist rein und deterministisch: gleicher Seed + gleicher Pool + gleiches
// Raster ergibt auf jedem Gerät dieselbe Karte. Genau das macht den Teilen-Link nützlich.

// xmur3: String -> 32-Bit-Startwert
function seedValue(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

// mulberry32: kleiner, schneller PRNG mit ausreichender Streuung für Kartenmischen
export function rngFrom(seed) {
  let a = seedValue(String(seed));
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789"; // ohne l/1/0/o

export function randomSeed(length = 6) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => SEED_ALPHABET[b % SEED_ALPHABET.length]).join("");
}

// Ein Freifeld braucht eine echte Mitte, die gibt es nur bei ungeraden Kantenlängen.
export function freeSpacePossible(cols, rows) {
  return cols % 2 === 1 && rows % 2 === 1;
}

export function termsNeeded(cols, rows, freeSpace) {
  return cols * rows - (freeSpace ? 1 : 0);
}

/**
 * Baut die Kartenfelder. Wirft einen Fehler mit `needed`/`have`, wenn der Pool zu
 * klein ist — das war im Vorgänger ein stiller Absturz.
 */
export function buildCard({ terms, cols, rows, freeSpace, seed, freeLabel = "Freifeld" }) {
  const useFree = freeSpace && freeSpacePossible(cols, rows);
  const needed = termsNeeded(cols, rows, useFree);
  const unique = [...new Set(terms.map((t) => String(t).trim()).filter(Boolean))];

  if (unique.length < needed) {
    const error = new Error(`Zu wenige Begriffe: ${unique.length} von ${needed}.`);
    error.name = "PoolTooSmallError";
    error.needed = needed;
    error.have = unique.length;
    throw error;
  }

  const rng = rngFrom(`${seed}|${cols}x${rows}|${useFree ? 1 : 0}|${unique.length}`);
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }

  const cells = unique.slice(0, needed).map((text) => ({ text, free: false }));
  if (useFree) {
    cells.splice(Math.floor((cols * rows) / 2), 0, { text: freeLabel, free: true });
  }
  return cells;
}

/** Alle Gewinnlinien des Rasters — Zeilen, Spalten und bei quadratischen Karten die Diagonalen.
 *  `type` ist ein Schlüssel für i18n, kein anzeigbarer Text. */
export function winningLines(cols, rows) {
  const lines = [];
  for (let r = 0; r < rows; r++) {
    lines.push({ type: "row", nr: r + 1, cells: Array.from({ length: cols }, (_, c) => r * cols + c) });
  }
  for (let c = 0; c < cols; c++) {
    lines.push({ type: "column", nr: c + 1, cells: Array.from({ length: rows }, (_, r) => r * cols + c) });
  }
  if (cols === rows) {
    lines.push({ type: "diagonal", nr: 1, cells: Array.from({ length: cols }, (_, i) => i * cols + i) });
    lines.push({ type: "diagonal", nr: 2, cells: Array.from({ length: cols }, (_, i) => i * cols + (cols - 1 - i)) });
  }
  return lines;
}

/** Liefert die vollständigen Linien und ob die ganze Karte voll ist. */
export function findBingos(marked, cols, rows) {
  const lines = winningLines(cols, rows).filter((line) => line.cells.every((i) => marked.has(i)));
  const full = marked.size >= cols * rows;
  return { lines, full };
}
