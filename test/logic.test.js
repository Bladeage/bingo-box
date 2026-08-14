// Prüft die Teile, die ohne Browser laufen: Kartenerzeugung, Bingo-Erkennung,
// Teilen-Kodierung und Theme-Aufbereitung.  Aufruf:  npm test

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  buildCard,
  findBingos,
  freeSpacePossible,
  randomSeed,
  termsNeeded,
  winningLines,
} from "../assets/card.js";
import { decodeConfig, encodeConfig } from "../assets/share.js";
import { deriveColors, normalizeTheme, readableOn } from "../assets/theme.js";

const terms = Array.from({ length: 60 }, (_, i) => `Begriff ${i + 1}`);
const texts = (cells) => cells.map((c) => c.text);

test("gleicher Seed ergibt dieselbe Karte", () => {
  const options = { terms, cols: 5, rows: 5, freeSpace: false, seed: "abc123" };
  assert.deepEqual(texts(buildCard(options)), texts(buildCard(options)));
});

test("anderer Seed ergibt eine andere Karte", () => {
  const a = texts(buildCard({ terms, cols: 5, rows: 5, freeSpace: false, seed: "abc123" }));
  const b = texts(buildCard({ terms, cols: 5, rows: 5, freeSpace: false, seed: "xyz789" }));
  assert.notDeepEqual(a, b);
});

test("Karte hat die richtige Feldzahl und keine Dubletten", () => {
  const cells = buildCard({ terms, cols: 5, rows: 6, freeSpace: false, seed: "s" });
  assert.equal(cells.length, 30);
  assert.equal(new Set(texts(cells)).size, 30);
});

test("Freifeld landet in der Mitte und zählt als Feld", () => {
  const cells = buildCard({ terms, cols: 5, rows: 5, freeSpace: true, seed: "s" });
  assert.equal(cells.length, 25);
  assert.equal(cells[12].free, true);
  assert.equal(cells.filter((c) => c.free).length, 1);
});

test("Freifeld nur bei ungeraden Kantenlängen", () => {
  assert.equal(freeSpacePossible(5, 5), true);
  assert.equal(freeSpacePossible(5, 6), false);
  assert.equal(termsNeeded(5, 5, true), 24);
  assert.equal(termsNeeded(5, 6, false), 30);
  // Bei geradem Raster wird das Freifeld ignoriert statt ein Feld zu verschlucken.
  assert.equal(buildCard({ terms, cols: 4, rows: 4, freeSpace: true, seed: "s" }).length, 16);
});

test("zu kleiner Pool wirft mit nachvollziehbaren Zahlen statt abzustürzen", () => {
  // Genau der Absturz, den der Vorgänger bei schrumpfender Begriffsliste hatte.
  assert.throws(
    () => buildCard({ terms: terms.slice(0, 10), cols: 5, rows: 5, freeSpace: false, seed: "s" }),
    (error) => error.name === "PoolTooSmallError" && error.needed === 25 && error.have === 10,
  );
});

test("doppelte und leere Begriffe werden aussortiert", () => {
  const messy = ["A", "A", "  ", "B", "B ", "C", "D", "E", "", "F", "G", "H", "I"];
  const cells = buildCard({ terms: messy, cols: 3, rows: 3, freeSpace: false, seed: "s" });
  assert.equal(new Set(texts(cells)).size, 9);
  assert.ok(texts(cells).every((t) => t.trim() === t && t));
});

test("Gewinnlinien: Diagonalen nur bei quadratischer Karte", () => {
  assert.equal(winningLines(5, 5).length, 12); // 5 Reihen + 5 Spalten + 2 Diagonalen
  assert.equal(winningLines(5, 6).length, 11); // 6 Reihen + 5 Spalten
});

test("Bingo wird für Reihe, Spalte, Diagonale und volle Karte erkannt", () => {
  assert.equal(findBingos(new Set([0, 1, 2, 3, 4]), 5, 5).lines[0].type, "Reihe");
  assert.equal(findBingos(new Set([0, 5, 10, 15, 20]), 5, 5).lines[0].type, "Spalte");
  assert.equal(findBingos(new Set([0, 6, 12, 18, 24]), 5, 5).lines[0].type, "Diagonale");
  assert.equal(findBingos(new Set([0, 1, 2]), 5, 5).lines.length, 0);

  const alles = new Set(Array.from({ length: 25 }, (_, i) => i));
  assert.equal(findBingos(alles, 5, 5).full, true);
});

test("Teilen-Link überlebt Umlaute, Emoji und eigene Pools", async () => {
  const config = {
    v: 1,
    s: "abc123",
    g: [5, 6],
    f: 0,
    p: { name: "Grüße & Späße 🎉", terms: ["Ähm…", "Straße", "„Zitat“"] },
    t: { name: "Dunkel", colors: { bg: "#101010" } },
  };
  const encoded = await encodeConfig(config);
  assert.match(encoded, /^[zp][A-Za-z0-9_-]+$/); // URL-sicher, kein Padding
  assert.deepEqual(await decodeConfig(encoded), config);
});

test("kaputter Teilen-Link liefert null statt einer Ausnahme", async () => {
  assert.equal(await decodeConfig("z***kaputt***"), null);
  assert.equal(await decodeConfig(""), null);
  assert.equal(await decodeConfig("p"), null);
});

test("Seeds sind kurz, URL-tauglich und verwechslungsarm", () => {
  const seeds = Array.from({ length: 200 }, () => randomSeed());
  assert.ok(seeds.every((s) => /^[a-z2-9]{6}$/.test(s)));
  assert.ok(new Set(seeds).size > 190); // keine nennenswerte Häufung
});

test("Theme: fehlende Felder werden ergänzt, kaputte Links fliegen raus", () => {
  const theme = normalizeTheme({ title: "Test", font: "gibtsnicht", links: [{ label: "ok", url: "https://x" }, { label: "kaputt" }] });
  assert.equal(theme.font, "system");
  assert.equal(theme.links.length, 1);
  assert.ok(theme.colors.bg);
});

test("Theme: abgeleitete Farben sind gültige Hexwerte", () => {
  const colors = deriveColors({ bg: "#ffffff", tile: "#eeeeee", tileMarked: "#c0392b", text: "#000000", accent: "#1b6b4c" });
  for (const key of ["surface", "line", "textMuted"]) {
    assert.match(colors[key], /^#[0-9a-f]{6}$/, `${key} = ${colors[key]}`);
  }
});

test("Textfarbe richtet sich nach der Helligkeit des Untergrunds", () => {
  assert.equal(readableOn("#ffffff"), "#101010");
  assert.equal(readableOn("#000000"), "#ffffff");
  assert.equal(readableOn("#63e6be"), "#101010"); // helles Mint
  assert.equal(readableOn("#1b6b4c"), "#ffffff"); // dunkles Grün
  assert.equal(readableOn("#c0392b"), "#ffffff");
});

test("mitgelieferte Pools sind gültig und groß genug für 5 × 6", async () => {
  const catalog = JSON.parse(await readFile(new URL("../pools/index.json", import.meta.url)));
  const files = (await readdir(new URL("../pools/", import.meta.url))).filter((f) => f !== "index.json");
  assert.equal(catalog.length, files.length, "Katalog und Dateien laufen auseinander");

  for (const entry of catalog) {
    const pool = JSON.parse(await readFile(new URL(`../pools/${entry.file}`, import.meta.url)));
    assert.equal(pool.id, entry.id, `${entry.file}: id passt nicht zum Katalog`);
    assert.ok(pool.terms.length >= 30, `${entry.file}: nur ${pool.terms.length} Begriffe`);
    assert.equal(new Set(pool.terms).size, pool.terms.length, `${entry.file}: doppelte Begriffe`);
    assert.ok(pool.terms.every((t) => typeof t === "string" && t.trim()), `${entry.file}: leerer Begriff`);
  }
});

test("mitgelieferte Themes sind gültig", async () => {
  const catalog = JSON.parse(await readFile(new URL("../themes/index.json", import.meta.url)));
  for (const entry of catalog) {
    const theme = normalizeTheme(JSON.parse(await readFile(new URL(`../themes/${entry.file}`, import.meta.url))));
    assert.equal(theme.id, entry.id);
    for (const [key, value] of Object.entries(theme.colors)) {
      assert.match(value, /^#[0-9a-fA-F]{6}$/, `${entry.file}: ${key} = ${value}`);
    }
  }
});
