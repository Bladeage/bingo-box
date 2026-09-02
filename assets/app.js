// Verdrahtung: lädt Pools und Themes, baut die Karte, hält Abhak-Stand, Sprache und
// Teilen-Link zusammen. Fachlogik steckt in card.js, share.js, theme.js, data.js,
// i18n.js und export.js.

import { buildCard, findBingos, freeSpacePossible, randomSeed, termsNeeded } from "./card.js";
import { applyTheme, deriveColors, DEFAULT_THEME, normalizeTheme } from "./theme.js";
import * as store from "./data.js";
import { buildShareUrl, decodeConfig, readHash } from "./share.js";
import { downloadCanvas, renderCardCanvas } from "./export.js";
import { detectLocale, isSupported, LANGUAGES, locale, setLocale, t, translateDocument } from "./i18n.js";

const el = (id) => document.getElementById(id);
const TOOLBAR_KEY = "bingobox.toolbar";

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
const currentTheme = () => state.themes.find((entry) => entry.id === state.themeId) || state.themes[0];

// --- Start ---------------------------------------------------------------

async function init() {
  setLocale(detectLocale(), { remember: false });
  translateDocument();
  fillLanguageSelect();

  const [pools, themes] = await Promise.all([
    store.loadBundled("pools").catch(() => []),
    store.loadBundled("themes").catch(() => []),
  ]);
  state.pools = [...pools, ...store.customPools.all()];
  state.themes = [...themes, ...store.customThemes.all()];

  if (!state.pools.length) {
    showError(t("error.noPools"));
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
  return { poolId: defaultPoolId() };
}

/** Ohne Vorgeschichte: der erste mitgelieferte Pool in der Oberflächensprache. */
function defaultPoolId() {
  const match = state.pools.find((p) => p.builtin && p.language === locale());
  return (match || state.pools[0]).id;
}

/** Liest eine geteilte Konfiguration aus dem URL-Fragment und stellt Pool/Theme bereit. */
async function loadSharedConfig() {
  const raw = readHash();
  if (!raw) return null;
  const config = await decodeConfig(raw);
  if (!config) return null;

  if (config.l && isSupported(config.l)) {
    setLocale(config.l, { remember: false });
    translateDocument();
    fillLanguageSelect();
  }

  const settings = {
    cols: config.g?.[0],
    rows: config.g?.[1],
    freeSpace: Boolean(config.f),
    seed: config.s || randomSeed(),
  };

  if (config.p?.terms) {
    const pool = { id: "geteilt:pool", name: config.p.name || t("pool.shared"), terms: config.p.terms, shared: true };
    state.pools = [pool, ...state.pools.filter((p) => p.id !== pool.id)];
    settings.poolId = pool.id;
  } else if (config.p?.ref) {
    settings.poolId = config.p.ref;
  }

  if (config.t?.colors) {
    const theme = { ...config.t, id: "geteilt:theme", name: config.t.name || t("theme.shared"), shared: true };
    state.themes = [theme, ...state.themes.filter((entry) => entry.id !== theme.id)];
    settings.themeId = theme.id;
  } else if (config.t?.ref) {
    settings.themeId = config.t.ref;
  }

  return settings;
}

function applySettings(settings = {}) {
  state.poolId = settings.poolId && state.pools.some((p) => p.id === settings.poolId)
    ? settings.poolId
    : defaultPoolId();
  state.themeId = settings.themeId && state.themes.some((entry) => entry.id === settings.themeId)
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

function fillLanguageSelect() {
  const select = el("lang-select");
  select.replaceChildren(
    ...LANGUAGES.map(({ code, label }) => {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = label; // Sprachen stehen immer in ihrer eigenen Sprache
      option.selected = code === locale();
      return option;
    }),
  );
}

/** Pools nach Sprache gruppiert, die eigene Sprache zuerst. */
function poolGroups() {
  const ordered = [...LANGUAGES].sort((a, b) => (a.code === locale() ? -1 : b.code === locale() ? 1 : 0));
  return [
    ...ordered.map(({ code, label }) => [label, state.pools.filter((p) => p.builtin && p.language === code)]),
    [t("group.custom"), state.pools.filter((p) => !p.builtin && !p.shared)],
    [t("group.shared"), state.pools.filter((p) => p.shared)],
  ];
}

function fillSelectors() {
  el("pool-select").replaceChildren(
    ...poolGroups()
      .map(([label, entries]) => optionGroup(label, entries, state.poolId))
      .filter(Boolean),
  );

  const themes = state.themes.map((theme) => ({ ...normalizeTheme(theme), builtin: theme.builtin, shared: theme.shared }));
  el("theme-select").replaceChildren(
    ...[
      optionGroup(t("group.builtin"), themes.filter((entry) => entry.builtin), state.themeId),
      optionGroup(t("group.custom"), themes.filter((entry) => !entry.builtin && !entry.shared), state.themeId),
      optionGroup(t("group.shared"), themes.filter((entry) => entry.shared), state.themeId),
    ].filter(Boolean),
  );

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
      freeLabel: t("card.free"),
    });
  } catch (error) {
    if (error.name !== "PoolTooSmallError") throw error;
    state.cells = [];
    el("grid").replaceChildren();
    showError(
      t("error.poolTooSmall", {
        pool: pool.name,
        have: error.have,
        needed: error.needed,
        cols: state.cols,
        rows: state.rows,
      }),
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
  grid.replaceChildren(
    ...state.cells.map((cell, index) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = `tile${cell.free ? " tile--free" : ""}`;
      tile.textContent = cell.text;
      tile.style.setProperty("--font-scale", fontScale(cell.text));
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
  fitGrid();
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
    status.textContent = t("status.full");
  } else if (lines.length) {
    const names = lines.map((line) => `${t(`line.${line.type}`)} ${line.nr}`).join(", ");
    status.textContent = t("status.bingo", { lines: names });
  } else if (state.cells.length) {
    status.textContent = t("status.progress", {
      done: state.marked.size,
      total: state.cells.length,
      open: state.cells.length - state.marked.size,
    });
  } else {
    status.textContent = "";
  }
}

function setCardInfo() {
  const pool = currentPool();
  el("card-info").textContent = state.cells.length
    ? t("card.info", { pool: pool.name, cols: state.cols, rows: state.rows, seed: state.seed })
    : t("card.infoShort", { pool: pool.name, count: pool.terms.length });
}

function showError(message) {
  const box = el("error");
  box.textContent = message;
  box.hidden = false;
  fitGrid();
}

function hideError() {
  el("error").hidden = true;
}

// --- Kachelgröße ---------------------------------------------------------

/**
 * Höhe des Fensters abzüglich allem, was nicht die Karte ist. Bewusst aus den
 * Geschwistern von <main> gerechnet und nicht aus dessen eigener Höhe — sonst würde
 * eine größere Karte mehr Platz melden und sich selbst aufschaukeln.
 */
function availableHeight() {
  const styles = getComputedStyle(document.body);
  const gap = parseFloat(styles.rowGap) || 0;
  const padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);

  // Flaches Querformat (styles.css): Werkzeuge stehen seitlich, der Karte gehört die ganze Höhe.
  if (styles.getPropertyValue("--layout").trim() === "side") return window.innerHeight - padding;

  let used = 0;
  let boxes = 0;
  for (const node of document.body.children) {
    const nodeStyles = getComputedStyle(node);
    if (nodeStyles.display === "none" || nodeStyles.position === "absolute" || nodeStyles.position === "fixed") continue;
    boxes += 1;
    if (node.tagName !== "MAIN") used += node.offsetHeight;
  }
  return window.innerHeight - padding - used - gap * Math.max(0, boxes - 1);
}

/**
 * Kacheln so groß, dass die Karte ins Fenster passt — begrenzt durch --cell-min und
 * --cell-max aus dem Stylesheet. Passt sie bei Mindestgröße nicht, scrollt die Seite;
 * ist das Fenster sehr schmal, gewinnt die Breite, damit nie quer gescrollt wird.
 */
function fitGrid() {
  const grid = el("grid");
  if (!state.cells.length) return;

  const root = document.documentElement;
  const rootStyles = getComputedStyle(root);
  const min = parseFloat(rootStyles.getPropertyValue("--cell-min")) || 52;
  const max = parseFloat(rootStyles.getPropertyValue("--cell-max")) || 148;
  const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;

  const byWidth = (grid.parentElement.clientWidth - (state.cols - 1) * gap) / state.cols;
  const byHeight = (availableHeight() - (state.rows - 1) * gap) / state.rows;
  const cell = Math.min(byWidth, max, Math.max(min, byHeight));

  // Nur bei Änderung schreiben — der ResizeObserver unten meldet sich sonst im Kreis.
  const next = `${Math.max(1, Math.floor(cell))}px`;
  if (grid.style.getPropertyValue("--cell") !== next) grid.style.setProperty("--cell", next);
}

/**
 * Schriftskala je Kachel (Anteil an --cell): kurze Begriffe groß, lange klein und
 * mehrzeilig. Ein einzelnes Bandwurmwort muss in die Breite passen, sonst bricht es
 * mitten im Wort um.
 */
function fontScale(text) {
  const length = text.length;
  const longest = Math.max(...text.split(/\s+/).map((word) => word.length));
  const byLength = length <= 6 ? 0.17 : length <= 12 ? 0.14 : length <= 20 ? 0.12 : length <= 32 ? 0.105 : 0.09;
  return Math.max(0.075, Math.min(byLength, 1.25 / longest)).toFixed(3);
}

/**
 * Alles, was die verfügbare Fläche ändert, löst eine Neuberechnung aus: Fenster,
 * Drehung, mobile Adressleiste (visualViewport) und Höhenänderungen der Nachbarn
 * der Karte (Werkzeugleiste auf/zu, Fehlermeldung, Theme mit Logo).
 */
function watchLayout() {
  let pending = 0;
  const schedule = () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(fitGrid);
  };
  window.addEventListener("resize", schedule);
  window.addEventListener("orientationchange", schedule);
  window.visualViewport?.addEventListener("resize", schedule);

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(schedule);
    for (const node of document.body.children) observer.observe(node);
  }
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
    fitGrid();
  });

  el("lang-select").addEventListener("change", (event) => changeLanguage(event.target.value));

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
  bindGridKeys();
  watchLayout();

  // Kleine Schirme: Einstellungen auf- und zuklappen (auf breiten Schirmen ohne Wirkung).
  // Zugeklappt bleibt gemerkt — wer am Handy spielt, will die Karte, nicht die Leiste.
  const toolbar = el("btn-settings").closest(".toolbar");
  const setSettingsOpen = (open) => {
    toolbar.classList.toggle("toolbar--open", open);
    el("btn-settings").setAttribute("aria-expanded", String(open));
    try {
      localStorage.setItem(TOOLBAR_KEY, open ? "open" : "closed");
    } catch {
      // privater Modus — dann gilt die Wahl nur bis zum Neuladen
    }
  };
  try {
    if (localStorage.getItem(TOOLBAR_KEY) === "closed") setSettingsOpen(false);
  } catch {
    // ohne Speicher bleibt die Leiste offen
  }
  el("btn-settings").addEventListener("click", () => setSettingsOpen(!toolbar.classList.contains("toolbar--open")));

  // Ein eingefügter Link im selben Tab soll die Karte des Links zeigen.
  window.addEventListener("hashchange", () => location.reload());
}

/** Pfeiltasten wandern über die Karte, Pos1/Ende springen an Zeilenanfang und -ende. */
function bindGridKeys() {
  const grid = el("grid");
  grid.addEventListener("keydown", (event) => {
    const from = Number(event.target.dataset?.index);
    if (Number.isNaN(from)) return;
    const row = Math.floor(from / state.cols) * state.cols;
    const target = {
      ArrowRight: from + 1,
      ArrowLeft: from - 1,
      ArrowDown: from + state.cols,
      ArrowUp: from - state.cols,
      Home: row,
      End: row + state.cols - 1,
    }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    // Ein gesperrtes Freifeld nimmt keinen Fokus: dahinter weitersuchen.
    const step = Math.sign(target - from) || 1;
    for (let i = target; i >= 0 && i < grid.children.length; i += step) {
      if (!grid.children[i].disabled) return grid.children[i].focus();
    }
  });
}

/** Sprachwechsel: Oberfläche, Auswahllisten und — wenn möglich — der Pool selbst. */
function changeLanguage(code) {
  setLocale(code);
  translateDocument();

  const pool = currentPool();
  const twin = pool?.builtin && pool.topic
    ? state.pools.find((p) => p.builtin && p.topic === pool.topic && p.language === locale())
    : null;
  if (twin && twin.id !== pool.id) state.poolId = twin.id;

  fillLanguageSelect();
  fillSelectors();
  applyTheme(currentTheme());

  if (twin && twin.id !== pool.id) newCard({ seed: state.seed });
  else {
    updateBingo();
    setCardInfo();
    fitGrid();
  }
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
    l: locale(),
    g: [state.cols, state.rows],
    f: state.freeSpace ? 1 : 0,
    p: pool.builtin ? { ref: pool.id } : { name: pool.name, terms: pool.terms },
    t: currentTheme().builtin
      ? { ref: currentTheme().id }
      : { name: theme.name, title: theme.title, subtitle: theme.subtitle, logo: theme.logo, font: theme.font, colors: theme.colors, links: theme.links },
  };
  if (sameCard) config.s = state.seed;
  return buildShareUrl(config);
}

function openShare() {
  refreshShareUrl();
  el("share-dialog").showModal();
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
      el("share-copy").textContent = t("btn.copied");
    } catch {
      input.select(); // z. B. ohne HTTPS — dann kopiert man von Hand
      el("share-copy").textContent = t("btn.copyManual");
    }
    setTimeout(() => (el("share-copy").textContent = t("btn.copy")), 2500);
  });
}

// --- Begriffe bearbeiten -------------------------------------------------

function openPoolDialog() {
  const pool = currentPool();
  el("pool-name").value = pool.builtin ? t("pool.copySuffix", { name: pool.name }) : pool.name;
  el("pool-terms").value = pool.terms.join("\n");
  el("pool-delete").hidden = Boolean(pool.builtin);
  updatePoolCount();
  el("pool-dialog").showModal();
}

function updatePoolCount() {
  const count = el("pool-terms").value.split("\n").map((term) => term.trim()).filter(Boolean).length;
  const needed = termsNeeded(state.cols, state.rows, state.freeSpace);
  el("pool-count").textContent =
    t("pool.count", { count, needed, cols: state.cols, rows: state.rows }) + (count < needed ? " ⚠" : "");
}

function readPoolForm() {
  return {
    name: el("pool-name").value.trim() || t("pool.default"),
    terms: [...new Set(el("pool-terms").value.split("\n").map((term) => term.trim()).filter(Boolean))],
    language: locale(),
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
    state.poolId = defaultPoolId();
    fillSelectors();
    el("pool-dialog").close();
    newCard();
  });

  el("pool-export").addEventListener("click", () => {
    const form = readPoolForm();
    downloadJson(`${slugFilename(form.name)}.json`, form);
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
  const raw = currentTheme();
  const theme = normalizeTheme(raw);
  el("theme-name").value = raw.builtin ? t("pool.copySuffix", { name: theme.name }) : theme.name;
  el("theme-title").value = theme.title;
  el("theme-subtitle").value = theme.subtitle;
  el("theme-logo").value = theme.logo?.startsWith("data:") ? "" : theme.logo;
  el("theme-font").value = theme.font;
  el("theme-links").value = theme.links.map((link) => `${link.label} | ${link.url}`).join("\n");
  for (const key of COLOR_FIELDS) el(`color-${key}`).value = theme.colors[key];
  el("theme-delete").hidden = Boolean(raw.builtin);
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
    name: el("theme-name").value.trim() || t("theme.default"),
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
      alert(t("error.logoTooBig"));
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
    state.themes = [...state.themes.filter((entry) => entry.id !== theme.id), theme];
    state.themeId = theme.id;
    fillSelectors();
    applyTheme(theme);
    el("theme-dialog").close();
    fitGrid();
  });

  el("theme-delete").addEventListener("click", () => {
    const theme = currentTheme();
    if (theme.builtin) return;
    store.customThemes.remove(theme.id);
    state.themes = state.themes.filter((entry) => entry.id !== theme.id);
    state.themeId = state.themes[0].id;
    fillSelectors();
    applyTheme(currentTheme());
    el("theme-dialog").close();
    fitGrid();
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
      el("theme-links").value = theme.links.map((link) => `${link.label} | ${link.url}`).join("\n");
      el("theme-dialog").dataset.logo = theme.logo || "";
      el("theme-logo").value = theme.logo?.startsWith("data:") ? "" : theme.logo;
      for (const key of COLOR_FIELDS) el(`color-${key}`).value = theme.colors[key];
    } catch {
      alert(t("error.themeFile"));
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
  showError(t("error.start"));
});
