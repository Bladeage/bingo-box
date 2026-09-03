// Rauchtest im echten Browser: startet einen Mini-Webserver auf das Repo und klickt
// die Anwendung durch.  Aufruf:  npm run test:browser   (braucht `npm install`)

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

const server = createServer(async (request, response) => {
  const path = decodeURIComponent(request.url.split("?")[0]);
  const file = join(ROOT, normalize(path === "/" ? "/index.html" : path).replace(/^(\.\.[/\\])+/, ""));
  try {
    const body = await readFile(file);
    response.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404).end("not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const BASE = `http://127.0.0.1:${server.address().port}`;

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "OK  " : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({ acceptDownloads: true, locale: "de-DE", viewport: { width: 1600, height: 1000 } });
const page = await context.newPage();

const consoleErrors = [];
page.on("console", (message) => message.type() === "error" && consoleErrors.push(message.text()));
page.on("pageerror", (error) => consoleErrors.push(String(error)));

await page.goto(BASE, { waitUntil: "networkidle" });
const tiles = page.locator(".tile");

// Grundzustand
check("Karte rendert 25 Felder (5×5)", (await tiles.count()) === 25, `${await tiles.count()} Felder`);
check("Titel kommt aus dem Theme", (await page.locator("#brand-title").textContent()) === "Bingo Box");
check("Alle mitgelieferten Pools stehen zur Wahl", (await page.locator("#pool-select option").count()) === 36);
check(
  "Pools sind nach Sprache gruppiert, Deutsch zuerst",
  (await page.locator("#pool-select optgroup").first().getAttribute("label")) === "Deutsch" &&
    (await page.locator('#pool-select optgroup[label="Deutsch"] option').count()) === 18 &&
    (await page.locator('#pool-select optgroup[label="English"] option').count()) === 18,
);

// Kachelgröße passt sich dem Fenster an
const metrics = async () =>
  page.evaluate(() => {
    const grid = document.getElementById("grid");
    const tile = grid.querySelector(".tile").getBoundingClientRect();
    const root = getComputedStyle(document.documentElement);
    return {
      cell: parseFloat(getComputedStyle(grid).getPropertyValue("--cell")),
      width: tile.width,
      height: tile.height,
      min: parseFloat(root.getPropertyValue("--cell-min")),
      max: parseFloat(root.getPropertyValue("--cell-max")),
      docHeight: document.documentElement.scrollHeight,
      winHeight: window.innerHeight,
    };
  });

let m = await metrics();
check("Kacheln sind quadratisch und so groß wie berechnet",
  Math.abs(m.width - m.height) < 1.5 && Math.abs(m.width - m.cell) < 1.5, `${m.width}×${m.height}, --cell=${m.cell}`);
check("Kachelgröße bleibt innerhalb der Grenzen", m.cell <= m.max && m.cell >= m.min, `${m.cell} in [${m.min}, ${m.max}]`);
check("Karte passt ohne Scrollen ins Fenster", m.docHeight <= m.winHeight + 1, `${m.docHeight} > ${m.winHeight}`);

const roomy = m.cell;
await page.setViewportSize({ width: 1600, height: 800 });
await page.waitForTimeout(200);
m = await metrics();
check("Niedrigeres Fenster verkleinert die Kacheln und bleibt scrollfrei",
  m.cell < roomy && m.cell > m.min && m.docHeight <= m.winHeight + 1, `--cell=${m.cell} (vorher ${roomy})`);

// Reicht die Höhe selbst bei Mindestgröße nicht, gewinnt die Lesbarkeit und die Seite scrollt.
await page.setViewportSize({ width: 1600, height: 620 });
await page.waitForTimeout(200);
m = await metrics();
check("Sehr flaches Fenster hält die Mindestgröße", Math.abs(m.cell - m.min) < 1.5, `--cell=${m.cell}, min=${m.min}`);

await page.setViewportSize({ width: 3000, height: 1800 });
await page.waitForTimeout(200);
m = await metrics();
check("Sehr großes Fenster stößt an die Maximalgröße", Math.abs(m.cell - m.max) < 1.5, `--cell=${m.cell}, max=${m.max}`);
await page.setViewportSize({ width: 1600, height: 1000 });
await page.waitForTimeout(200);

// Abhaken und Bingo
for (let i = 0; i < 5; i++) await tiles.nth(i).click();
const status = await page.locator("#status").textContent();
check("BINGO nach voller erster Reihe", status.includes("BINGO") && status.includes("Reihe 1"), status);
check("Gewinnlinie wird hervorgehoben", (await page.locator(".tile--winning").count()) === 5);

// Stand übersteht das Neuladen
const before = await tiles.allTextContents();
await page.reload({ waitUntil: "networkidle" });
check("Karte ist nach dem Neuladen dieselbe", JSON.stringify(await tiles.allTextContents()) === JSON.stringify(before));
check("Treffer überstehen das Neuladen", (await page.locator('.tile[aria-pressed="true"]').count()) === 5);

await page.click("#btn-new");
await page.waitForTimeout(120);
check("„Neue Karte“ würfelt trotzdem neu", JSON.stringify(await tiles.allTextContents()) !== JSON.stringify(before));
check("Neue Karte startet ohne Treffer", (await page.locator('.tile[aria-pressed="true"]').count()) === 0);

// Raster und Freifeld
await page.selectOption("#grid-select", "5x6");
await page.waitForTimeout(120);
check("5 × 6 ergibt 30 Felder", (await tiles.count()) === 30, `${await tiles.count()} Felder`);
check("Freifeld ist bei geradem Raster gesperrt", await page.locator("#free-space").isDisabled());

await page.selectOption("#grid-select", "5x5");
await page.check("#free-space");
await page.waitForTimeout(120);
const center = tiles.nth(12);
check(
  "Freifeld sitzt in der Mitte und gilt als getroffen",
  (await center.getAttribute("aria-pressed")) === "true" && (await center.isDisabled()),
);
await page.uncheck("#free-space");
await page.waitForTimeout(120);

// Zu kleiner Pool: Klartext statt Absturz
await page.click("#btn-pool");
await page.fill("#pool-terms", "Eins\nZwei\nDrei");
await page.click("#pool-save");
await page.waitForTimeout(150);
const error = await page.locator("#error").textContent();
check("Zu kleiner Pool meldet sich mit Zahlen", (await page.locator("#error").isVisible()) && error.includes("25"), error.trim());

// Eigener Pool
await page.click("#btn-pool");
await page.fill("#pool-name", "Testpool Ümläute");
await page.fill("#pool-terms", Array.from({ length: 30 }, (_, i) => `Begriff ${i + 1}`).join("\n"));
await page.click("#pool-save");
await page.waitForTimeout(150);
check("Eigener Pool erzeugt eine Karte", (await tiles.count()) === 25 && !(await page.locator("#error").isVisible()));
check(
  "Eigener Pool wird aktualisiert statt dupliziert",
  (await page.locator('#pool-select optgroup[label="Eigene"] option').count()) === 1,
);

// Teilen
await page.click("#btn-share");
await page.waitForTimeout(200);
const shareUrl = await page.inputValue("#share-url");
check("Teilen-Link trägt die Konfiguration", shareUrl.includes("#c="));
await page.click("#share-close");

const shared = await context.newPage();
await shared.goto(shareUrl, { waitUntil: "networkidle" });
check(
  "Geteilter Link zeigt exakt dieselbe Karte",
  JSON.stringify(await shared.locator(".tile").allTextContents()) === JSON.stringify(await tiles.allTextContents()),
);
check(
  "Geteilter Pool erscheint als „Aus dem Link“",
  (await shared.locator('#pool-select optgroup[label="Aus dem Link"] option').count()) === 1,
);
await shared.close();

// Branding
await page.click("#btn-theme");
await page.fill("#theme-name", "Testmarke");
await page.fill("#theme-title", "Vereinsheim-Bingo");
await page.fill("#color-bg", "#ffffff");
await page.fill("#color-text", "#000000");
await page.click("#theme-save");
await page.waitForTimeout(150);
const vars = await page.evaluate(() => {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    ["--c-bg", "--c-textMuted", "--c-accentText", "--c-danger"].map((key) => [key, style.getPropertyValue(key).trim()]),
  );
});
check(
  "Eigenes Branding schlägt durch",
  vars["--c-bg"] === "#ffffff" && (await page.locator("#brand-title").textContent()) === "Vereinsheim-Bingo",
  JSON.stringify(vars),
);
check("Abgeleitete Farben sind gültige Hexwerte", /^#[0-9a-f]{6}$/.test(vars["--c-textMuted"]));

await page.selectOption("#theme-select", "papier");
await page.waitForTimeout(150);
const light = await page.evaluate(() => {
  const style = getComputedStyle(document.documentElement);
  return {
    accentText: style.getPropertyValue("--c-accentText").trim(),
    danger: style.getPropertyValue("--c-danger").trim(),
  };
});
check("Helles Theme dreht die Kontrastfarben um", light.accentText === "#ffffff" && light.danger === "#c92a2a", JSON.stringify(light));

// PNG
const download = page.waitForEvent("download", { timeout: 10000 });
await page.click("#btn-png");
const file = await download;
check("PNG wird heruntergeladen", /^bingo-[a-z2-9]{6}\.png$/.test(file.suggestedFilename()), file.suggestedFilename());

// Mobil
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(150);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("Kein horizontales Scrollen auf dem Handy", overflow <= 0, `${overflow}px Überhang`);

// Auf dem Handy kann die Werkzeugleiste zugeklappt sein — erst öffnen, dann bedienen.
if ((await page.getAttribute("#btn-settings", "aria-expanded")) === "false") {
  await page.click("#btn-settings");
  await page.waitForTimeout(150);
}

// Sprachumschaltung
await page.selectOption("#pool-select", "krimi.de");
await page.waitForTimeout(150);
await page.selectOption("#lang-select", "en");
await page.waitForTimeout(200);
check("Oberfläche wechselt auf Englisch",
  (await page.locator("#btn-new").textContent()) === "New card" &&
    (await page.locator("#btn-pool").textContent()) === "Edit terms",
  await page.locator("#btn-new").textContent());
check("Der Pool wechselt zum selben Thema in der neuen Sprache",
  (await page.locator("#pool-select").inputValue()) === "crime-drama.en",
  await page.locator("#pool-select").inputValue());
check("Kartenzeile ist übersetzt", (await page.locator("#card-info").textContent()).includes("Card"),
  await page.locator("#card-info").textContent());
check("html-lang-Attribut folgt der Sprache", (await page.getAttribute("html", "lang")) === "en");

await page.locator(".tile").nth(0).click();
check("Statuszeile ist übersetzt", (await page.locator("#status").textContent()).includes("to go"),
  await page.locator("#status").textContent());

await page.reload({ waitUntil: "networkidle" });
check("Sprachwahl übersteht das Neuladen", (await page.locator("#lang-select").inputValue()) === "en");

check("Keine Fehler in der Browser-Konsole", consoleErrors.length === 0, consoleErrors.join(" | "));

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} Prüfungen grün`);
process.exit(failed ? 1 : 0);
