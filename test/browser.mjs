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
const context = await browser.newContext({ acceptDownloads: true });
const page = await context.newPage();

const consoleErrors = [];
page.on("console", (message) => message.type() === "error" && consoleErrors.push(message.text()));
page.on("pageerror", (error) => consoleErrors.push(String(error)));

await page.goto(BASE, { waitUntil: "networkidle" });
const tiles = page.locator(".tile");

// Grundzustand
check("Karte rendert 25 Felder (5×5)", (await tiles.count()) === 25, `${await tiles.count()} Felder`);
check("Titel kommt aus dem Theme", (await page.locator("#brand-title").textContent()) === "Bingo Box");
check("Alle mitgelieferten Pools stehen zur Wahl", (await page.locator("#pool-select option").count()) === 4);

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

check("Keine Fehler in der Browser-Konsole", consoleErrors.length === 0, consoleErrors.join(" | "));

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} Prüfungen grün`);
process.exit(failed ? 1 : 0);
