// Karte als PNG — der einzige Teil des alten Windows-Programms, der sonst wegfiele.
// Rendert unabhängig vom DOM auf ein Canvas, damit das Bild überall gleich aussieht.

import { FONT_STACKS, normalizeTheme, readableOn } from "./theme.js";

const PADDING = 48;
const GAP = 14;
const CELL = 220; // Kachelbreite in Bildpunkten — die Bildbreite folgt daraus je Spaltenzahl
const MIN_WIDTH = 1000;
const MAX_CELL_H = 240;

/** Bildschirme mit hoher Pixeldichte bekommen ein entsprechend feineres Bild (höchstens 2×). */
export function exportScale() {
  const ratio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  return Math.min(2, Math.max(1, Math.ceil(ratio)));
}

/** Zerlegt ein einzelnes zu langes Wort — „Ressourcengründen“ passt sonst in keine Kachel. */
function breakWord(ctx, word, maxWidth) {
  const parts = [];
  let chunk = "";
  for (const char of word) {
    if (chunk && ctx.measureText(chunk + char).width > maxWidth) {
      parts.push(chunk);
      chunk = char;
    } else {
      chunk += char;
    }
  }
  if (chunk) parts.push(chunk);
  return parts;
}

function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  const push = () => {
    if (line) lines.push(line);
    line = "";
  };

  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    if (ctx.measureText(word).width > maxWidth) {
      push();
      const parts = breakWord(ctx, word, maxWidth);
      lines.push(...parts.slice(0, -1));
      line = parts.at(-1);
      continue;
    }
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
    } else {
      push();
      line = word;
    }
  }
  push();
  return lines;
}

/** Größte Schriftgröße, bei der der Begriff in Breite und Höhe in die Kachel passt. */
function fitText(ctx, text, fontFamily, maxWidth, maxHeight) {
  let last = null;
  const start = Math.min(40, Math.round(maxHeight * 0.18));
  for (let size = start; size >= 10; size -= 1) {
    ctx.font = `600 ${size}px ${fontFamily}`;
    const lines = wrap(ctx, text, maxWidth);
    const lineHeight = size * 1.25;
    last = { size, lines, lineHeight };
    const fitsWidth = lines.every((line) => ctx.measureText(line).width <= maxWidth);
    if (fitsWidth && lines.length * lineHeight <= maxHeight) return last;
  }
  return last; // sehr lange Begriffe laufen notfalls über die Kachelhöhe, nicht über den Rand
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
  ctx.closePath();
}

export function renderCardCanvas({ cells, marked, cols, rows, theme, seed, poolName, scale = exportScale() }) {
  const t = normalizeTheme(theme);
  const font = FONT_STACKS[t.font];
  // Breite wächst mit den Spalten, damit 6 × 6 dieselbe Kachelgröße bekommt wie 4 × 4.
  const width = Math.max(MIN_WIDTH, 2 * PADDING + cols * CELL + (cols - 1) * GAP);
  const cellW = (width - 2 * PADDING - (cols - 1) * GAP) / cols;
  const cellH = Math.min(cellW, MAX_CELL_H);

  const headerH = t.subtitle ? 150 : 110;
  const footerH = 74;
  const height = Math.round(headerH + rows * cellH + (rows - 1) * GAP + footerH + PADDING);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale); // ab hier in logischen Bildpunkten zeichnen

  ctx.fillStyle = t.colors.bg;
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = t.colors.text;
  ctx.font = `700 42px ${font}`;
  ctx.fillText(t.title || "Bingo", PADDING, PADDING + 42);
  if (t.subtitle) {
    ctx.fillStyle = t.colors.textMuted;
    ctx.font = `400 22px ${font}`;
    ctx.fillText(t.subtitle, PADDING, PADDING + 82);
  }

  cells.forEach((cell, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = PADDING + col * (cellW + GAP);
    const y = headerH + row * (cellH + GAP);
    const isMarked = marked.has(index);

    ctx.fillStyle = isMarked ? t.colors.tileMarked : t.colors.tile;
    roundedRect(ctx, x, y, cellW, cellH, 16);
    ctx.fill();
    ctx.strokeStyle = t.colors.line;
    ctx.lineWidth = 2;
    ctx.stroke();

    const maxWidth = cellW - 28;
    const { lines, lineHeight } = fitText(ctx, cell.text, font, maxWidth, cellH - 28);
    ctx.fillStyle = isMarked ? readableOn(t.colors.tileMarked) : t.colors.text;
    ctx.textAlign = "center";
    const startY = y + cellH / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => ctx.fillText(line, x + cellW / 2, startY + i * lineHeight));
    ctx.textAlign = "left";
  });

  ctx.fillStyle = t.colors.textMuted;
  ctx.font = `400 20px ${font}`;
  const footer = [poolName, `${cols}×${rows}`, `Karte ${seed}`].filter(Boolean).join("  ·  ");
  ctx.fillText(footer, PADDING, height - PADDING + 12);

  return canvas;
}

export function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}
