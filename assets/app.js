// Verdrahtung: lädt Pools und Themes, baut die Karte, hält Abhak-Stand und Teilen-Link
// zusammen. Fachlogik steckt in card.js, share.js, theme.js, data.js und export.js.

import { buildCard, findBingos, freeSpacePossible, randomSeed, termsNeeded } from "./card.js";
import { applyTheme, deriveColors, DEFAULT_THEME, normalizeTheme } from "./theme.js";
import * as store from "./data.js";
import { buildShareUrl, decodeConfig, readHash } from "./share.js";
import { downloadCanvas, renderCardCanvas } from "./export.js";

const el = (id) => document.getElementById(id);

const state = {
  pools: [],
  themes: [],
  poolId: null,
  themeId: null,
  cols: 5,
  rows: 5,
  freeSpace: false,
  seed: randomSeed(),
  cells: [],
  marked: new Set(),
};

const currentPool = () => state.pools.find((p) => p.id === state.poolId) || state.pools[0];
const currentTheme = () => state.themes.find((t) => t.id === state.themeId) || state.themes[0];

// --- Start ---------------------------------------------------------------

async function init() {
  const [pools, themes] = await Promise.all([
    store.loadBundled("pools").catch(() => []),
    store.loadBundled("themes").catch(() => []),
  ]);
  state.pools = [...pools, ...store.customPools.all()];
  state.themes = [...themes, ...store.customThemes.all()];

  if (!state.pools.length) {
    showError(
      "Die Begriffs-Pools konnten nicht geladen werden. Beim lokalen Öffnen bitte einen kleinen " +
        "Webserver benutzen, z. B. „python3 -m http.server“.",
    );
    return;
  }
  if (!state.themes.length) state.themes = [DEFAULT_THEME];

  // Erst nach dem Laden, damit ein geteilter Pool nicht wieder überschrieben wird.
  applySettings(readSettings(await loadSharedConfig()));
  fillSelectors();
  bindEvents();
  applyTheme(currentTheme());
  newCard({ seed: state.seed, keepMarks: true });
}

/** Reihenfolge: geteilter Link schlägt zuletzt benutzte Einstellungen schlägt Standard. */
function readSettings(shared) {
  if (shared) return shared;

  // Der Seed wird mitgespeichert: Neuladen soll dieselbe Karte samt Treffern zeigen,
  // eine neue Karte gibt es nur auf Knopfdruck.
  const last = store.lastSettings.get();
  if (last && state.pools.some((p) => p.id === last.poolId)) {
    return { ...last, seed: last.seed || randomSeed() };
  }
  return {};
}

/** Liest eine geteilte Konfiguration aus dem URL-Fragment und stellt Pool/Theme bereit. */
async function loadSharedConfig() {
  const raw = readHash();
  if (!raw) return null;
  const config = await decodeConfig(raw);
  if (!config) return null;

  const settings = {
    cols: config.g?.[0],
    rows: config.g?.[1],
    freeSpace: Boolean(config.f),
    seed: config.s || randomSeed(),
  };

  if (config.p?.terms) {
    const pool = { id: "geteilt:pool", name: config.p.name || "Geteilte Begriffe", terms: config.p.terms, shared: true };
    state.pools = [pool, ...state.pools.filter((p) => p.id !== pool.id)];
    settings.poolId = pool.id;
  } else if (config.p?.ref) {
    settings.poolId = config.p.ref;
  }

  if (config.t?.colors) {
    const theme = normalizeTheme({ ...config.t, id: "geteilt:theme", name: config.t.name || "Geteiltes Branding", shared: true });
    state.themes = [theme, ...state.themes.filter((t) => t.id !== theme.id)];
    settings.themeId = theme.id;
  } else if (config.t?.ref) {
    settings.themeId = config.t.ref;
  }

  return settings;
}

function applySettings(settings = {}) {
  state.poolId = settings.poolId && state.pools.some((p) => p.id === settings.poolId)
    ? settings.poolId
    : state.pools[0].id;
  state.themeId = settings.themeId && state.themes.some((t) => t.id === settings.themeId)
    ? settings.themeId
    : state.themes[0].id;
  state.cols = Number(settings.cols) || 5;
  state.rows = Number(settings.rows) || 5;
  state.freeSpace = Boolean(settings.freeSpace) && freeSpacePossible(state.cols, state.rows);
  state.seed = settings.seed || randomSeed();
}

// --- Auswahlfelder -------------------------------------------------------

function optionGroup(label, entries, selectedId) {
  if (!entries.length) return null;
  const group = document.createElement("optgroup");
  group.label = label;
  for (const entry of entries) {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry.name;
    option.selected = entry.id === selectedId;
    group.append(option);
  }
  return group;
}

function fillSelectors() {
  const fill = (select, entries, selectedId) => {
    select.replaceChildren(
      ...[
        optionGroup("Mitgeliefert", entries.filter((e) => e.builtin), selectedId),
        optionGroup("Eigene", entries.filter((e) => !e.builtin && !e.shared), selectedId),
        optionGroup("Aus dem Link", entries.filter((e) => e.shared), selectedId),
      ].filter(Boolean),
    );
  };
  fill(el("pool-select"), state.pools, state.poolId);
  fill(el("theme-select"), state.themes, state.themeId);

  el("grid-select").value = `${state.cols}x${state.rows}`;
  el("free-space").checked = state.freeSpace;
  el("free-space").disabled = !freeSpacePossible(state.cols, state.rows);
}

// --- Karte ---------------------------------------------------------------

function newCard({ seed = randomSeed(), keepMarks = false } = {}) {
  const pool = currentPool();
  state.seed = seed;
  hideError();

  try {
    state.cells = buildCard({
      terms: pool.terms,
      cols: state.cols,
      rows: state.rows,
      freeSpace: state.freeSpace,
      seed: state.seed,
    });
  } catch (error) {
    if (error.name !== "PoolTooSmallError") throw error;
    state.cells = [];
    el("grid").replaceChildren();
    showError(
      `„${pool.name}“ hat ${error.have} Begriffe, für ${state.cols} × ${state.rows} werden ` +
        `${error.needed} gebraucht. Wähle ein kleineres Raster oder ergänze Begriffe.`,
    );
    setCardInfo();
    return;
  }

  const key = store.cardKey(state);
  state.marked = keepMarks ? store.loadMarks(key) : new Set();
  state.cells.forEach((cell, index) => cell.free && state.marked.add(index));
  store.saveMarks(key, state.marked);

  store.lastSettings.set({
    poolId: state.poolId,
    themeId: state.themeId,
    cols: state.cols,
    rows: state.rows,
    freeSpace: state.freeSpace,
    seed: state.seed,
  });

  renderGrid();
  updateBingo();
  setCardInfo();
}

function renderGrid() {
  const grid = el("grid");
  grid.style.setProperty("--cols", state.cols);
  grid.setAttribute("aria-rowcount", state.rows);
  grid.replaceChildren(
    ...state.cells.map((cell, index) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = `tile${cell.free ? " tile--free" : ""}`;
      tile.textContent = cell.text;
      tile.dataset.index = String(index);
      tile.setAttribute("aria-pressed", String(state.marked.has(index)));
      if (cell.free) {
        tile.disabled = true;
      } else {
        tile.addEventListener("click", () => toggle(index));
      }
      return tile;
    }),
  );
}

function toggle(index) {
  if (state.marked.has(index)) state.marked.delete(index);
  else state.marked.add(index);

  const tile = el("grid").querySelector(`[data-index="${index}"]`);
  if (tile) tile.setAttribute("aria-pressed", String(state.marked.has(index)));

  store.saveMarks(store.cardKey(state), state.marked);
  updateBingo();
}

function updateBingo() {
  const { lines, full } = findBingos(state.marked, state.cols, state.rows);
  const winning = new Set(lines.flatMap((line) => line.cells));

  for (const tile of el("grid").children) {
    tile.classList.toggle("tile--winning", winning.has(Number(tile.dataset.index)));
  }

  const status = el("status");
  if (full) {
    status.textContent = "Volle Karte! 🎉";
  } else if (lines.length) {
    const names = lines.map((line) => `${line.type} ${line.nr}`).join(", ");
    status.textContent = `BINGO! ${names}`;
  } else {
    const open = state.cells.length - state.marked.size;
    status.textContent = state.cells.length ? `${state.marked.size} von ${state.cells.length} getroffen — noch ${open} offen` : "";
  }
}

function setCardInfo() {
  const pool = currentPool();
  el("card-info").textContent = state.cells.length
    ? `${pool.name} · ${state.cols} × ${state.rows} · Karte ${state.seed}`
    : `${pool.name} · ${pool.terms.length} Begriffe`;
}

function showError(message) {
  const box = el("error");
  box.textContent = message;
  box.hidden = false;
}

function hideError() {
  el("error").hidden = true;
}

// --- Bedienung -----------------------------------------------------------

function bindEvents() {
  el("pool-select").addEventListener("change", (event) => {
    state.poolId = event.target.value;
    newCard();
  });

  el("theme-select").addEventListener("change", (event) => {
    state.themeId = event.target.value;
    applyTheme(currentTheme());
    store.lastSettings.set({ ...(store.lastSettings.get() || {}), themeId: state.themeId });
  });

  el("grid-select").addEventListener("change", (event) => {
    const [cols, rows] = event.target.value.split("x").map(Number);
    state.cols = cols;
    state.rows = rows;
    const possible = freeSpacePossible(cols, rows);
    el("free-space").disabled = !possible;
    if (!possible) {
      el("free-space").checked = false;
      state.freeSpace = false;
    }
    newCard();
  });

  el("free-space").addEventListener("change", (event) => {
    state.freeSpace = event.target.checked;
    newCard();
  });

  el("btn-new").addEventListener("click", () => newCard());
  el("btn-png").addEventListener("click", exportPng);
  el("btn-share").addEventListener("click", openShare);
  el("btn-pool").addEventListener("click", openPoolDialog);
  el("btn-theme").addEventListener("click", openThemeDialog);

  bindPoolDialog();
  bindThemeDialog();
  bindShareDialog();

  // Ein eingefügter Link im selben Tab soll die Karte des Links zeigen.
  window.addEventListener("hashchange", () => location.reload());
}

function exportPng() {
  if (!state.cells.length) return;
  const canvas = renderCardCanvas({
    cells: state.cells,
    marked: state.marked,
    cols: state.cols,
    rows: state.rows,
    theme: currentTheme(),
    seed: state.seed,
    poolName: currentPool().name,
  });
  downloadCanvas(canvas, `bingo-${state.seed}.png`);
}

// --- Teilen --------------------------------------------------------------

async function shareUrl(sameCard) {
  const pool = currentPool();
  const theme = normalizeTheme(currentTheme());
  const config = {
    v: 1,
    g: [state.cols, state.rows],
    f: state.freeSpace ? 1 : 0,
    p: pool.builtin ? { ref: pool.id } : { name: pool.name, terms: pool.terms },
    t: theme.builtin ? { ref: theme.id } : { ...theme, id: undefined, builtin: undefined, shared: undefined },
  };
  if (sameCard) config.s = state.seed;
  return buildShareUrl(config);
}

function openShare() {
  const dialog = el("share-dialog");
  refreshShareUrl();
  dialog.showModal();
}

async function refreshShareUrl() {
  el("share-url").value = await shareUrl(el("share-same-card").checked);
}

function bindShareDialog() {
  el("share-same-card").addEventListener("change", refreshShareUrl);
  el("share-close").addEventListener("click", () => el("share-dialog").close());
  el("share-copy").addEventListener("click", async () => {
    const input = el("share-url");
    try {
      await navigator.clipboard.writeText(input.value);
      el("share-copy").textContent = "Kopiert ✓";
    } catch {
      input.select(); // z. B. ohne HTTPS — dann kopiert man von Hand
      el("share-copy").textContent = "Mit Strg+C kopieren";
    }
    setTimeout(() => (el("share-copy").textContent = "Kopieren"), 2500);
  });
}

// --- Begriffe bearbeiten -------------------------------------------------

function openPoolDialog() {
  const pool = currentPool();
  el("pool-name").value = pool.builtin ? `${pool.name} (eigene Fassung)` : pool.name;
  el("pool-terms").value = pool.terms.join("\n");
  el("pool-delete").hidden = Boolean(pool.builtin);
  updatePoolCount();
  el("pool-dialog").showModal();
}

function updatePoolCount() {
  const count = el("pool-terms").value.split("\n").map((t) => t.trim()).filter(Boolean).length;
  const needed = termsNeeded(state.cols, state.rows, state.freeSpace);
  el("pool-count").textContent =
    `${count} Begriffe — für ${state.cols} × ${state.rows} werden ${needed} gebraucht` +
    (count < needed ? " ⚠" : "");
}

function readPoolForm() {
  return {
    name: el("pool-name").value.trim() || "Eigene Begriffe",
    terms: [...new Set(el("pool-terms").value.split("\n").map((t) => t.trim()).filter(Boolean))],
  };
}

function bindPoolDialog() {
  el("pool-terms").addEventListener("input", updatePoolCount);
  el("pool-cancel").addEventListener("click", () => el("pool-dialog").close());

  el("pool-save").addEventListener("click", () => {
    const form = readPoolForm();
    if (!form.terms.length) return;
    const current = currentPool();
    const pool = current.builtin || current.shared
      ? { ...form, id: store.newId("eigen", form.name) }
      : { ...form, id: current.id };

    store.customPools.save(pool);
    state.pools = [...state.pools.filter((p) => p.id !== pool.id), pool];
    state.poolId = pool.id;
    fillSelectors();
    el("pool-dialog").close();
    newCard();
  });

  el("pool-delete").addEventListener("click", () => {
    const pool = currentPool();
    if (pool.builtin) return;
    store.customPools.remove(pool.id);
    state.pools = state.pools.filter((p) => p.id !== pool.id);
    state.poolId = state.pools[0].id;
    fillSelectors();
    el("pool-dialog").close();
    newCard();
  });

  el("pool-export").addEventListener("click", () => {
    const form = readPoolForm();
    downloadJson(`${slugFilename(form.name)}.json`, { ...form, language: "de" });
  });

  el("pool-import").addEventListener("click", () => el("pool-file").click());
  el("pool-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      const terms = Array.isArray(parsed) ? parsed : parsed.terms;
      if (!Array.isArray(terms)) throw new Error("keine Begriffsliste");
      el("pool-name").value = parsed.name || file.name.replace(/\.\w+$/, "");
      el("pool-terms").value = terms.join("\n");
    } catch {
      // Keine JSON-Datei? Dann als einfache Zeilenliste lesen.
      el("pool-name").value = file.name.replace(/\.\w+$/, "");
      el("pool-terms").value = text;
    }
    updatePoolCount();
    event.target.value = "";
  });
}

// --- Branding ------------------------------------------------------------

const COLOR_FIELDS = ["bg", "tile", "tileMarked", "text", "accent"];

function openThemeDialog() {
  const theme = normalizeTheme(currentTheme());
  el("theme-name").value = theme.builtin ? `${theme.name} (eigene Fassung)` : theme.name;
  el("theme-title").value = theme.title;
  el("theme-subtitle").value = theme.subtitle;
  el("theme-logo").value = theme.logo?.startsWith("data:") ? "" : theme.logo;
  el("theme-font").value = theme.font;
  el("theme-links").value = theme.links.map((l) => `${l.label} | ${l.url}`).join("\n");
  for (const key of COLOR_FIELDS) el(`color-${key}`).value = theme.colors[key];
  el("theme-delete").hidden = Boolean(theme.builtin);
  el("theme-dialog").dataset.logo = theme.logo || "";
  el("theme-dialog").showModal();
}

function readThemeForm() {
  const colors = deriveColors(Object.fromEntries(COLOR_FIELDS.map((key) => [key, el(`color-${key}`).value])));
  const links = el("theme-links").value
    .split("\n")
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter(([label, url]) => label && url)
    .map(([label, url]) => ({ label, url }));

  return {
    name: el("theme-name").value.trim() || "Eigenes Branding",
    title: el("theme-title").value.trim(),
    subtitle: el("theme-subtitle").value.trim(),
    logo: el("theme-logo").value.trim() || el("theme-dialog").dataset.logo || "",
    font: el("theme-font").value,
    colors,
    links,
  };
}

function bindThemeDialog() {
  el("theme-cancel").addEventListener("click", () => el("theme-dialog").close());

  el("theme-logo-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 300 * 1024) {
      alert("Bitte ein Logo unter 300 KB wählen — größere Bilder machen den Teilen-Link unbrauchbar lang.");
      event.target.value = "";
      return;
    }
    el("theme-dialog").dataset.logo = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    el("theme-logo").value = "";
  });

  el("theme-save").addEventListener("click", () => {
    const form = readThemeForm();
    const current = currentTheme();
    const theme = current.builtin || current.shared
      ? { ...form, id: store.newId("eigen", form.name) }
      : { ...form, id: current.id };

    store.customThemes.save(theme);
    state.themes = [...state.themes.filter((t) => t.id !== theme.id), theme];
    state.themeId = theme.id;
    fillSelectors();
    applyTheme(theme);
    el("theme-dialog").close();
  });

  el("theme-delete").addEventListener("click", () => {
    const theme = currentTheme();
    if (theme.builtin) return;
    store.customThemes.remove(theme.id);
    state.themes = state.themes.filter((t) => t.id !== theme.id);
    state.themeId = state.themes[0].id;
    fillSelectors();
    applyTheme(currentTheme());
    el("theme-dialog").close();
  });

  el("theme-export").addEventListener("click", () => {
    const form = readThemeForm();
    downloadJson(`${slugFilename(form.name)}.theme.json`, form);
  });

  el("theme-import").addEventListener("click", () => el("theme-file").click());
  el("theme-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const theme = normalizeTheme(JSON.parse(await file.text()));
      el("theme-name").value = theme.name;
      el("theme-title").value = theme.title;
      el("theme-subtitle").value = theme.subtitle;
      el("theme-font").value = theme.font;
      el("theme-links").value = theme.links.map((l) => `${l.label} | ${l.url}`).join("\n");
      el("theme-dialog").dataset.logo = theme.logo || "";
      el("theme-logo").value = theme.logo?.startsWith("data:") ? "" : theme.logo;
      for (const key of COLOR_FIELDS) el(`color-${key}`).value = theme.colors[key];
    } catch {
      alert("Diese Datei ließ sich nicht als Theme lesen.");
    }
    event.target.value = "";
  });
}

// --- Kleinkram -----------------------------------------------------------

function slugFilename(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "bingo";
}

function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

init().catch((error) => {
  console.error(error);
  showError("Die Anwendung konnte nicht starten. Details stehen in der Browser-Konsole.");
});
