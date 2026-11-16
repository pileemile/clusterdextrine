/* Ciel. Relevés météo. */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const debounce = (fn, ms) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

function svg(inner) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

const icon = {
  cloudSun: svg(
    '<path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>'
  ),
  sun: svg(
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'
  ),
  cloud: svg('<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>'),
  snow: svg(
    '<path d="M2 12h20"/><path d="M12 2v20"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/>'
  ),
  search: svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
  plus: svg('<path d="M5 12h14"/><path d="M12 5v14"/>'),
  x: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
  thermo: svg('<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>'),
  gauge: svg('<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>'),
  wind: svg('<path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/>'),
  drop: svg('<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>'),
  eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
  mountain: svg('<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>'),
  pencil: svg('<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>'),
  trash: svg('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
  chevronL: svg('<path d="m15 18-6-6 6-6"/>'),
  chevronR: svg('<path d="m9 18 6-6-6-6"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  alert: svg('<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>'),
  copy: svg('<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'),
  calendar: svg('<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>'),
  pin: svg('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
  refresh: svg('<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>'),
  code: svg('<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>'),
};

const nfCache = new Map();
const nf = (digits) => {
  if (!nfCache.has(digits)) {
    nfCache.set(
      digits,
      new Intl.NumberFormat("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits })
    );
  }
  return nfCache.get(digits);
};
const fmtNum = (v, digits = 1) => nf(digits).format(v);
const fmtInt = (v) => new Intl.NumberFormat("fr-FR").format(v);
const fmtTemp = (v) => `${fmtNum(v, 1)}°`;
const dfLong = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });
const dfShort = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" });
const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());
const fmtDate = (d, short = false) => {
  if (!isValidDate(d)) return "Date inconnue";
  return short ? dfShort.format(d) : dfLong.format(d);
};
const fmtCoords = (lat, lng) => {
  if (lat == null || lng == null) return "Position inconnue";
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "O";
  return `${nf(1).format(Math.abs(lat))}° ${ns}  ${nf(1).format(Math.abs(lng))}° ${ew}`;
};

const CARDINALS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
const cardinal = (a) => CARDINALS[Math.round((((a % 360) + 360) % 360) / 22.5) % 16];

const MISSING = {
  temp: 999.9,
  pressure: 9999.9,
  rate: 999.9,
  angle: 999,
  elevation: 9999,
  visibility: 999999,
  ceiling: 99999,
};
const measured = (v, missing) => (typeof v === "number" && Number.isFinite(v) && v < missing ? v : null);

const TYPE_LABELS = {
  "FM-12": "SYNOP terrestre",
  "FM-13": "Navire en mer",
  "FM-14": "SYNOP mobile",
  "FM-15": "METAR aéroport",
  "FM-16": "SPECI aéroport",
  SAO: "Station SAO",
  "SY-MT": "SYNOP et METAR",
};

function summarize(d) {
  const coords = Array.isArray(d.position?.coordinates) ? d.position.coordinates : [];
  const [lng, lat] = coords;
  const call = d.callLetters || "";
  return {
    id: String(d._id),
    st: d.st ?? "",
    call,
    callLabel: call || "Sans indicatif",
    type: d.type || "",
    ts: d.ts ? new Date(d.ts) : null,
    lat: typeof lat === "number" ? lat : null,
    lng: typeof lng === "number" ? lng : null,
    elevation: measured(d.elevation, MISSING.elevation),
    temp: measured(d.airTemperature?.value, MISSING.temp),
    dew: measured(d.dewPoint?.value, MISSING.temp),
    pressure: measured(d.pressure?.value, MISSING.pressure),
    windAngle: measured(d.wind?.direction?.angle, MISSING.angle),
    windSpeed: measured(d.wind?.speed?.rate, MISSING.rate),
    visibility: measured(d.visibility?.distance?.value, MISSING.visibility),
    ceiling: measured(d.skyCondition?.ceilingHeight?.value, MISSING.ceiling),
  };
}

function mood(t) {
  if (t == null) return "Température non mesurée";
  if (t >= 30) return "Chaud";
  if (t >= 20) return "Doux";
  if (t >= 10) return "Tempéré";
  if (t >= 0) return "Frais";
  return "Gel";
}

function moodIcon(t) {
  if (t == null) return icon.thermo;
  if (t >= 20) return icon.sun;
  if (t >= 8) return icon.cloudSun;
  if (t >= 0) return icon.cloud;
  return icon.snow;
}

function relativeHumidity(t, dew) {
  if (t == null || dew == null) return null;
  const f = (x) => Math.exp((17.625 * x) / (243.04 + x));
  return clamp((100 * f(dew)) / f(t), 0, 100);
}

async function request(url, { method = "GET", body, keepalive, signal, measure } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (measure) headers["X-AB-Measure"] = "1";
  const res = await fetch(url, {
    method,
    keepalive,
    signal,
    credentials: "same-origin",
    headers: Object.keys(headers).length ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

const api = {
  list(params = {}, { signal } = {}) {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));
    return request(`/api/weather?${qs}`, { signal });
  },
  get: (id) => request(`/api/weather/${encodeURIComponent(id)}`),
  create: (body, opts) => request("/api/weather", { method: "POST", body, measure: Boolean(opts?.measure) }),
  update: (id, body) => request(`/api/weather/${encodeURIComponent(id)}`, { method: "PUT", body }),
  remove: (id, opts) => request(`/api/weather/${encodeURIComponent(id)}`, { method: "DELETE", ...opts }),
};

const OUTBOX_KEY = "ciel-outbox";
let outboxFlushing = false;

function readOutbox() {
  try {
    const raw = JSON.parse(localStorage.getItem(OUTBOX_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((item) => item && item.id && item.payload) : [];
  } catch {
    return [];
  }
}

function writeOutbox(items) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
  renderOutbox();
}

function isNetworkFailure(err) {
  if (!navigator.onLine) return true;
  if (err instanceof TypeError) return true;
  const msg = String(err?.message || "");
  return /failed to fetch|networkerror|load failed|connexion réseau/i.test(msg);
}

function queueReading(payload) {
  const items = readOutbox();
  items.push({
    id: crypto.randomUUID(),
    payload,
    measure: ab.counted,
    createdAt: new Date().toISOString(),
  });
  writeOutbox(items);
}

function removeOutbox(id) {
  writeOutbox(readOutbox().filter((item) => item.id !== id));
}

function outboxCard(item) {
  const payload = item.payload;
  const temp = measured(payload.airTemperature?.value, MISSING.temp);
  const call = payload.callLetters || "Sans indicatif";
  const ts = payload.ts ? new Date(payload.ts) : null;
  return `<article class="card card--wait">
    <span class="card__top">
      <span class="tag tag--wait">En attente</span>
      <span class="card__date">${esc(fmtDate(ts, true))}</span>
    </span>
    <span class="card__call">${esc(call)}</span>
    <span class="card__temp${temp == null ? " card__temp--na" : ""}">${temp == null ? "Non mesuré" : esc(fmtTemp(temp))}</span>
    <span class="card__meta"><span>${esc(payload.st || "Station inconnue")}</span></span>
    <button class="btn" type="button" data-outbox-remove="${esc(item.id)}">Retirer</button>
  </article>`;
}

function renderOutbox() {
  const root = $("#outbox");
  if (!root) return;
  const items = readOutbox();
  const offline = !navigator.onLine;
  if (!items.length && !offline) {
    root.hidden = true;
    root.innerHTML = "";
    return;
  }
  const title = offline
    ? items.length
      ? `Hors ligne. ${fmtInt(items.length)} relevé${items.length > 1 ? "s" : ""} gardé${items.length > 1 ? "s" : ""} sur cet appareil.`
      : "Hors ligne. Un nouveau relevé sera gardé ici, puis envoyé au retour du réseau."
    : `${fmtInt(items.length)} relevé${items.length > 1 ? "s" : ""} en attente d'envoi.`;
  root.hidden = false;
  root.innerHTML = `<p class="outbox__status" role="status">${esc(title)}</p>${
    items.length ? `<div class="grid">${items.map(outboxCard).join("")}</div>` : ""
  }`;
}

async function flushOutbox() {
  if (outboxFlushing || !navigator.onLine || !readOutbox().length) return;
  outboxFlushing = true;
  let sent = 0;
  try {
    for (const item of readOutbox()) {
      if (!readOutbox().some((row) => row.id === item.id)) continue;
      try {
        await api.create(item.payload, { measure: item.measure });
        removeOutbox(item.id);
        sent += 1;
      } catch (err) {
        if (isNetworkFailure(err)) break;
        removeOutbox(item.id);
        toast({ msg: err.message || "Un relevé en attente a été refusé.", type: "error" });
      }
    }
  } finally {
    outboxFlushing = false;
    renderOutbox();
  }
  if (sent) {
    toast({ msg: sent > 1 ? `${fmtInt(sent)} relevés envoyés.` : "Relevé envoyé." });
    loadList();
  }
}

const cache = new Map();
const pending = new Set();
const state = {
  page: 1,
  limit: 12,
  sort: "-ts",
  q: "",
  total: 0,
  pages: 1,
  featuredId: null,
  docs: [],
  /** idle | waiting | loading | results | empty | error | short */
  searchUi: "idle",
  error: "",
  displayedQuery: "",
};
/** Identifiant de génération : incrémenté à chaque nouvelle saisie / programmation. */
let listGen = 0;
/** AbortController de la requête liste active. */
let listAbort = null;
/** Minuteur de debounce (300 ms). */
let debounceTimer = 0;
let featureToken = 0;
const DEBOUNCE_MS = 300;
const Q_MIN = 2;
const Q_MAX = 60;

/** Seul le libellé change. A est la référence, B la modification. */
const AB_LABELS = { A: "Nouveau relevé", B: "Ajouter un relevé" };
const ab = { variant: null, counted: false };
let exposureSent = false;

function abLabelText() {
  if (ab.variant === "B") return AB_LABELS.B;
  if (ab.variant === "A") return AB_LABELS.A;
  return "";
}

function applyAbLabel() {
  const text = abLabelText();
  document.querySelectorAll("[data-ab-label]").forEach((el) => {
    el.textContent = text;
  });
  const btn = document.querySelector("[data-ab]");
  if (!btn) return;
  const ready = ab.variant === "A" || ab.variant === "B";
  btn.dataset.ready = ready ? "true" : "false";
  btn.setAttribute("aria-busy", ready ? "false" : "true");
  if (ready) btn.removeAttribute("aria-label");
  else btn.setAttribute("aria-label", "Chargement de l'action");
}

function exposeIfAvailable() {
  if (!ab.counted || exposureSent) return;
  if (!document.querySelector("[data-new]")) return;
  requestAnimationFrame(() => {
    if (!ab.counted || exposureSent) return;
    if (!document.querySelector("[data-new]")) return;
    exposureSent = true;
    fetch("/api/ab/exposure", { method: "POST", credentials: "same-origin" }).catch(() => {});
  });
}

async function loadAssignment() {
  try {
    const res = await fetch("/api/ab/assignment", {
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(800),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    if (body.enabled === false) {
      ab.variant = "A";
      ab.counted = false;
    } else {
      ab.variant = body.variant === "B" ? "B" : "A";
      ab.counted = true;
    }
  } catch {
    ab.variant = "A";
    ab.counted = false;
  }
  applyAbLabel();
  exposeIfAvailable();
}

const modal = { mode: null, docId: null, dirty: false, opener: null, timer: 0, closeArmed: 0 };

function remember(docs) {
  docs.forEach((d) => cache.set(String(d._id), d));
}

function visibleDocs() {
  return state.docs.filter((d) => !pending.has(String(d._id)));
}

/* Rendu */

function valueHTML(value, unit, digits) {
  if (value == null) return '<span class="na">Non mesuré</span>';
  return `${esc(fmtNum(value, digits))}<small>${esc(unit)}</small>`;
}

function stat(label, ico, value, unit, digits, sub = "") {
  return `<div class="stat">
    <div class="stat__label">${ico}<span>${esc(label)}</span></div>
    <div class="stat__value">${valueHTML(value, unit, digits)}</div>
    ${sub ? `<div class="stat__sub">${esc(sub)}</div>` : ""}
  </div>`;
}

function placeButton(s) {
  if (s.lat == null || s.lng == null) return "";
  if (CielPlaces.find({ name: s.callLabel, st: s.st, lat: s.lat, lng: s.lng })) {
    return `<a class="btn" href="/lieux.html">${icon.pin}<span>Dans Mes lieux</span></a>`;
  }
  return `<button class="btn" type="button" data-save-place="${esc(s.id)}">${icon.pin}<span>Enregistrer le lieu</span></button>`;
}

function renderFeatured(doc) {
  const s = summarize(doc);
  state.featuredId = s.id;
  const root = $("#une");
  root.removeAttribute("aria-busy");
  const rh = relativeHumidity(s.temp, s.dew);
  const windDir = s.windAngle == null ? "" : `${Math.round(s.windAngle)}° ${cardinal(s.windAngle)}`;
  root.innerHTML = `
    <div class="une__top">
      <div class="une__copy">
        <p class="kicker">${icon.cloudSun} Relevé à la une</p>
        <h1 class="une__call">${esc(s.callLabel)}</h1>
        <ul class="meta">
          <li>${icon.cloud}<span>${esc(TYPE_LABELS[s.type] || "Relevé")}</span></li>
          <li>${icon.calendar}<span>${esc(fmtDate(s.ts))}</span></li>
          <li>${icon.pin}<span>${esc(fmtCoords(s.lat, s.lng))}</span></li>
        </ul>
        <div class="une__actions">
          <button class="btn btn--primary" type="button" data-open="${esc(s.id)}">${icon.eye}<span>Voir le relevé</span></button>
          <button class="btn" type="button" data-edit="${esc(s.id)}">${icon.pencil}<span>Modifier</span></button>
          ${placeButton(s)}
          <button class="btn" type="button" data-shuffle>${icon.refresh}<span>Autre relevé</span></button>
        </div>
      </div>
      <div class="une__side">
        <p class="une__temp${s.temp == null ? " une__temp--na" : ""}">${s.temp == null ? "Non mesuré" : esc(fmtTemp(s.temp))}</p>
        <p class="une__mood">${moodIcon(s.temp)}<span>${esc(mood(s.temp))}</span></p>
      </div>
    </div>
    <div class="une__stats">
      ${stat("Point de rosée", icon.thermo, s.dew, "°C", 1)}
      ${stat("Pression", icon.gauge, s.pressure, "hPa", 0)}
      ${stat("Vent", icon.wind, s.windSpeed, "m/s", 1, windDir)}
      ${stat("Humidité", icon.drop, rh, "%", 0)}
    </div>`;
}

function renderFeaturedMessage(title, text) {
  const root = $("#une");
  root.removeAttribute("aria-busy");
  root.innerHTML = `
    <div class="une__top">
      <div class="une__copy">
        <p class="kicker">${icon.cloudSun} Relevé à la une</p>
        <h1 class="une__call">${esc(title)}</h1>
        <p class="section__sub">${esc(text)}</p>
        <div class="une__actions">
          <button class="btn" type="button" data-retry="une">${icon.refresh}<span>Réessayer</span></button>
        </div>
      </div>
    </div>`;
}

function cardHTML(doc) {
  const s = summarize(doc);
  const bits = [];
  if (s.windSpeed != null) bits.push(`<span>${icon.wind}<span>${esc(fmtNum(s.windSpeed, 1))} m/s</span></span>`);
  if (s.pressure != null) bits.push(`<span>${icon.gauge}<span>${esc(fmtNum(s.pressure, 0))} hPa</span></span>`);
  const label = `${s.callLabel}, ${s.temp == null ? "température non mesurée" : `${fmtNum(s.temp, 1)} degrés`}, ${fmtDate(s.ts, true)}`;
  return `<button class="card" type="button" data-id="${esc(s.id)}" aria-label="${esc(label)}">
    <span class="card__top">
      <span class="tag">${esc(s.type || "Relevé")}</span>
      <span class="card__date">${esc(fmtDate(s.ts, true))}</span>
    </span>
    <span class="card__call">${esc(s.callLabel)}</span>
    <span class="card__temp${s.temp == null ? " card__temp--na" : ""}">${s.temp == null ? "Non mesuré" : esc(fmtTemp(s.temp))}</span>
    ${bits.length ? `<span class="card__meta">${bits.join("")}</span>` : ""}
  </button>`;
}

function skeletons(n = 6) {
  return Array.from(
    { length: n },
    () => `<div class="card card--ph" aria-hidden="true"><div class="ph ph--sm"></div><div class="ph ph--md"></div><div class="ph ph--lg"></div></div>`
  ).join("");
}

function emptyBlock({ title, text, ico, action = "", alert = false }) {
  return `<div class="empty" role="${alert ? "alert" : "status"}">
    <div class="empty__icon">${ico}</div>
    <h3>${esc(title)}</h3>
    <p>${esc(text)}</p>
    ${action}
  </div>`;
}

function renderGrid() {
  const docs = visibleDocs();
  const grid = $("#grid");
  if (!docs.length) {
    grid.innerHTML = state.q
      ? emptyBlock({
          title: "Aucun résultat",
          text: "Essayez un autre indicatif ou une partie de l'identifiant de station.",
          ico: icon.search,
          action: `<button class="btn" type="button" data-clear>Effacer la recherche</button>`,
        })
      : emptyBlock({
          title: "Aucun relevé",
          text: "La collection est vide.",
          ico: icon.cloud,
          action: `<button class="btn btn--primary" type="button" data-new>${icon.plus}<span data-ab-label>${esc(abLabelText())}</span></button>`,
        });
    applyAbLabel();
    return;
  }
  grid.innerHTML = docs.map(cardHTML).join("");
  applyAbLabel();
}

function statusText() {
  switch (state.searchUi) {
    case "short":
      return "Saisissez au moins deux caractères pour lancer la recherche.";
    case "waiting":
      return "Recherche en attente…";
    case "loading":
      return state.displayedQuery
        ? `Recherche de « ${state.displayedQuery} » en cours…`
        : "Chargement des relevés…";
    case "empty":
      return `Aucun résultat pour « ${state.displayedQuery} ».`;
    case "error":
      return state.error || "Une erreur est survenue.";
    case "results":
      return state.displayedQuery
        ? `${fmtInt(Math.max(0, state.total - pending.size))} ${state.total - pending.size === 1 ? "résultat" : "résultats"} pour « ${state.displayedQuery} »`
        : `Page ${fmtInt(state.page)} sur ${fmtInt(state.pages)}`;
    default:
      return `Page ${fmtInt(state.page)} sur ${fmtInt(state.pages)}`;
  }
}

function renderMeta() {
  const shown = Math.max(0, state.total - pending.size);
  $("#browseCount").textContent = state.searchUi === "results" || state.searchUi === "idle" ? fmtInt(shown) : "";
  $("#browseSub").textContent = statusText();
  $("#clearSearch").hidden = !state.q && !state.displayedQuery && state.searchUi !== "short" && state.searchUi !== "error";
}

function renderPager() {
  const { page, pages } = state;
  const pager = $("#pager");
  if (pages <= 1) {
    pager.innerHTML = "";
    return;
  }
  const list = [...new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages))].sort((a, b) => a - b);
  let html = `<button class="btn btn--icon" type="button" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""} aria-label="Page précédente">${icon.chevronL}</button>`;
  let prev = 0;
  for (const p of list) {
    if (p - prev > 1) html += `<span class="pager__gap" aria-hidden="true"></span>`;
    html += `<button class="btn" type="button" data-page="${p}" ${p === page ? 'aria-current="page"' : ""} aria-label="Page ${p}">${fmtInt(p)}</button>`;
    prev = p;
  }
  html += `<button class="btn btn--icon" type="button" data-page="${page + 1}" ${page >= pages ? "disabled" : ""} aria-label="Page suivante">${icon.chevronR}</button>`;
  pager.innerHTML = html;
}

function syncFilters() {
  $$("#filters [data-sort]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.sort === state.sort)));
}

function bumpListGen() {
  return ++listGen;
}

function abortActiveList() {
  if (listAbort) {
    listAbort.abort();
    listAbort = null;
  }
}

function cancelDebounce() {
  clearTimeout(debounceTimer);
  debounceTimer = 0;
}

function applySearchUi(ui, { query = state.displayedQuery, error = "" } = {}) {
  state.searchUi = ui;
  state.displayedQuery = query;
  state.error = error;
}

async function loadList({ gen = bumpListGen() } = {}) {
  abortActiveList();
  const controller = new AbortController();
  listAbort = controller;

  const grid = $("#grid");
  grid.setAttribute("aria-busy", "true");
  applySearchUi("loading", { query: state.q });
  grid.innerHTML = skeletons();
  renderMeta();
  $("#pager").innerHTML = "";

  try {
    const res = await api.list(
      { page: state.page, limit: state.limit, sort: state.sort, q: state.q },
      { signal: controller.signal }
    );
    // Protection logique : une ancienne réponse ne modifie plus l'écran.
    if (gen !== listGen) return;
    remember(res.data);
    state.docs = res.data;
    state.total = res.total;
    state.pages = Math.max(1, res.pages);
    applySearchUi(res.data.length ? "results" : state.q ? "empty" : "idle", {
      query: state.q,
    });
    renderGrid();
    renderMeta();
    renderPager();
  } catch (err) {
    // Annulation volontaire : pas de message d'échec.
    if (err.name === "AbortError") return;
    if (gen !== listGen) return;
    applySearchUi("error", { query: state.q, error: err.message });
    grid.innerHTML = emptyBlock({
      title: "Impossible de charger les relevés",
      text: err.message,
      ico: icon.alert,
      alert: true,
      action: `<button class="btn" type="button" data-retry="list">${icon.refresh}<span>Réessayer</span></button>`,
    });
    $("#pager").innerHTML = "";
    renderMeta();
  } finally {
    if (gen === listGen) {
      if (listAbort === controller) listAbort = null;
      grid.removeAttribute("aria-busy");
    }
  }
}

async function loadFeatured() {
  try {
    const { data } = await api.list({ sort: "-ts", limit: 12 });
    remember(data);
    const doc = data.find((d) => !pending.has(String(d._id)) && summarize(d).temp != null) || data.find((d) => !pending.has(String(d._id)));
    if (!doc) {
      renderFeaturedMessage("Aucun relevé", "La collection est vide.");
      return;
    }
    renderFeatured(doc);
  } catch (err) {
    renderFeaturedMessage("Impossible de charger le relevé", err.message);
  }
}

function randomBelow(max) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

async function shuffleFeatured() {
  const token = ++featureToken;
  let pool = [...cache.values()].filter((d) => String(d._id) !== state.featuredId && !pending.has(String(d._id)));
  if (!pool.length) {
    try {
      const { data } = await api.list({ sort: "-ts", limit: 24, page: 1 + randomBelow(4) });
      if (token !== featureToken) return;
      remember(data);
      pool = data.filter((d) => String(d._id) !== state.featuredId && !pending.has(String(d._id)));
    } catch (err) {
      if (token !== featureToken) return;
      toast({ msg: err.message, type: "error" });
      return;
    }
  }
  if (token !== featureToken) return;
  if (!pool.length) {
    toast({ msg: "Pas d'autre relevé à afficher." });
    return;
  }
  renderFeatured(pool[randomBelow(pool.length)]);
}

function setSort(sort) {
  if (state.sort === sort) return;
  state.sort = sort;
  state.page = 1;
  syncFilters();
  cancelDebounce();
  loadList();
}

function goPage(page) {
  state.page = clamp(page, 1, state.pages);
  cancelDebounce();
  loadList();
  $("#releves").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}

/**
 * Planifie une recherche réactive :
 * - invalide la génération précédente dès la saisie
 * - annule minuteur + requête actifs
 * - debounce 300 ms (sauf immediate = bouton Rechercher / Réessayer)
 */
function scheduleSearch(raw, { immediate = false } = {}) {
  const gen = bumpListGen();
  abortActiveList();
  cancelDebounce();

  const next = String(raw ?? "").trim();
  state.page = 1;

  if (!next) {
    state.q = "";
    applySearchUi("idle", { query: "" });
    loadList({ gen });
    return;
  }

  if (next.length < Q_MIN || next.length > Q_MAX) {
    state.q = "";
    state.docs = [];
    state.total = 0;
    state.pages = 1;
    applySearchUi("short", { query: next });
    $("#grid").innerHTML = emptyBlock({
      title: "Saisie trop courte",
      text: "Saisissez au moins deux caractères (60 maximum) pour lancer la recherche.",
      ico: icon.search,
    });
    $("#pager").innerHTML = "";
    renderMeta();
    return;
  }

  applySearchUi("waiting", { query: next });
  $("#grid").innerHTML = skeletons(6);
  $("#pager").innerHTML = "";
  renderMeta();

  const run = () => {
    debounceTimer = 0;
    if (gen !== listGen) return;
    state.q = next;
    loadList({ gen });
  };

  if (immediate) run();
  else debounceTimer = setTimeout(run, DEBOUNCE_MS);

  const rect = $("#releves").getBoundingClientRect();
  if (rect.top > innerHeight * 0.4 || rect.bottom < 80) {
    $("#releves").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }
}

function clearSearch() {
  $("#searchInput").value = "";
  scheduleSearch("");
}

function cleanupReactiveSearch() {
  cancelDebounce();
  abortActiveList();
  bumpListGen();
}

/* Fenêtre */

function lockScroll(on) {
  const gap = innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.overflow = on ? "hidden" : "";
  document.body.style.paddingRight = on && gap > 0 ? `${gap}px` : "";
  $("main").inert = on;
  $(".header").inert = on;
  $(".footer").inert = on;
}

function openModal(mount) {
  const root = $("#modal");
  const panel = $(".modal__panel", root);
  const content = $("#modalContent");
  clearTimeout(modal.timer);
  modal.dirty = false;
  modal.closeArmed = 0;
  if (root.hidden) modal.opener = document.activeElement;
  mount(content);
  root.hidden = false;
  lockScroll(true);
  requestAnimationFrame(() => root.classList.add("is-open"));
  panel.focus({ preventScroll: true });
  if (modal.mode === "form") {
    setTimeout(() => $("#modalContent input")?.focus({ preventScroll: true }), reduceMotion ? 0 : 40);
  }
}

function closeModal() {
  const root = $("#modal");
  if (root.hidden) return;
  root.classList.remove("is-open");
  const finish = () => {
    root.hidden = true;
    modal.mode = null;
    modal.docId = null;
    modal.dirty = false;
    $("#modalContent").innerHTML = "";
    lockScroll(false);
    if (modal.opener?.isConnected) modal.opener.focus({ preventScroll: true });
  };
  if (reduceMotion) finish();
  else modal.timer = setTimeout(finish, 150);
}

function requestClose() {
  if (modal.mode === "form" && modal.dirty && Date.now() > modal.closeArmed) {
    modal.closeArmed = Date.now() + 3500;
    toast({ msg: "Modifications non enregistrées. Fermez encore une fois pour les abandonner.", type: "error", duration: 3500 });
    return;
  }
  closeModal();
}

function trapFocus(e) {
  const panel = $(".modal__panel");
  const items = $$("button:not([disabled]), [href], input:not([disabled]), select, textarea, summary", panel).filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  );
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

async function ensureDoc(id) {
  if (cache.has(id)) return cache.get(id);
  const doc = await api.get(id);
  cache.set(id, doc);
  return doc;
}

function replaceDoc(saved) {
  const id = String(saved._id);
  cache.set(id, saved);
  state.docs = state.docs.map((d) => (String(d._id) === id ? saved : d));
  renderGrid();
  if (state.featuredId === id) renderFeatured(saved);
}

/* Détail */

function highlightJSON(obj) {
  const json = JSON.stringify(obj, null, 2).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return json.replace(
    /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (m) => {
      let cls = "num";
      if (m.startsWith('"')) cls = m.trimEnd().endsWith(":") ? "key" : "str";
      else if (m === "true" || m === "false") cls = "bool";
      else if (m === "null") cls = "null";
      return `<span class="j-${cls}">${m}</span>`;
    }
  );
}

function measure({ label, ico, value, unit, digits = 1, sub = "", wind = false, compass = "" }) {
  return `<div class="measure${wind ? " measure--wind" : ""}">
    <div class="measure__label">${ico}<span>${esc(label)}</span></div>
    <div class="measure__value">${valueHTML(value, unit, digits)}</div>
    ${sub ? `<div class="measure__sub">${esc(sub)}</div>` : ""}
    ${compass}
  </div>`;
}

function renderDetail(doc) {
  const s = summarize(doc);
  const rh = relativeHumidity(s.temp, s.dew);
  const windSub = s.windAngle == null ? "" : `${Math.round(s.windAngle)}° ${cardinal(s.windAngle)}`;
  const compass =
    s.windAngle == null
      ? ""
      : `<div class="compass" style="--a:${Number(s.windAngle)}deg" aria-hidden="true"><span class="compass__n">N</span><span class="compass__needle"></span></div>`;

  const cancelled = doc.status === "CANCELLED";
  return (root) => {
    modal.mode = "detail";
    modal.docId = s.id;
    root.innerHTML = `
      <article class="detail">
        <p class="detail__kicker">${esc(TYPE_LABELS[s.type] || "Relevé météo")}</p>
        <h2 class="detail__title" id="modalTitle">${esc(s.callLabel)}</h2>
        <p class="detail__st">${esc(s.st || "Station inconnue")}</p>
        <ul class="meta">
          <li>${icon.calendar}<span>${esc(fmtDate(s.ts))}</span></li>
          <li>${icon.pin}<span>${esc(fmtCoords(s.lat, s.lng))}</span></li>
        </ul>
        <div class="detail__actions">
          <button class="btn" type="button" data-edit="${esc(s.id)}">${icon.pencil}<span>Modifier</span></button>
          ${placeButton(s)}
          <button class="btn" type="button" data-delete="${esc(s.id)}">${icon.trash}<span>Supprimer</span></button>
          ${
            cancelled
              ? ""
              : `<button class="btn" type="button" data-releve-open data-releve="${esc(s.id)}"><span data-releve-label>Fiche (PDF)</span></button>
          <button class="btn" type="button" data-releve-save data-releve="${esc(s.id)}"><span>Enregistrer</span></button>`
          }
        </div>
        <p class="detail__alert" data-releve-error role="alert"${cancelled ? "" : " hidden"}>${cancelled ? esc(CielReleve.MESSAGES[409]) : ""}</p>
        <div class="measures">
          ${measure({ label: "Température", ico: icon.thermo, value: s.temp, unit: "°C" })}
          ${measure({ label: "Point de rosée", ico: icon.thermo, value: s.dew, unit: "°C" })}
          ${measure({ label: "Humidité", ico: icon.drop, value: rh, unit: "%", digits: 0 })}
          ${measure({ label: "Pression", ico: icon.gauge, value: s.pressure, unit: "hPa", digits: 0 })}
          ${measure({ label: "Vent", ico: icon.wind, value: s.windSpeed, unit: "m/s", sub: windSub, wind: s.windAngle != null, compass })}
          ${measure({ label: "Visibilité", ico: icon.eye, value: s.visibility == null ? null : s.visibility / 1000, unit: "km" })}
          ${measure({ label: "Plafond nuageux", ico: icon.cloud, value: s.ceiling, unit: "m", digits: 0 })}
          ${measure({ label: "Altitude", ico: icon.mountain, value: s.elevation, unit: "m", digits: 0 })}
        </div>
        <details class="raw">
          <summary>${icon.code}<span>Document</span><span class="raw__chev">${icon.chevronR}</span></summary>
          <div class="raw__body">
            <div class="raw__bar">
              <button class="btn" type="button" data-copy="${esc(s.id)}">${icon.copy}<span>Copier</span></button>
            </div>
            <pre><code>${highlightJSON(doc)}</code></pre>
          </div>
        </details>
      </article>`;
  };
}

/* Formulaire */

function field({ name, label, type = "text", value = "", required = false, hint = "", min, max, step, list, maxlength }) {
  const id = `f-${name}`;
  const attrs = [
    required ? "required" : "",
    min != null ? `min="${min}"` : "",
    max != null ? `max="${max}"` : "",
    step != null ? `step="${step}"` : "",
    list ? `list="${list}"` : "",
    maxlength ? `maxlength="${maxlength}"` : "",
    type === "number" ? 'inputmode="decimal"' : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `<div class="field" data-hint="${esc(hint)}">
    <label for="${id}">${esc(label)}${required ? ' <span class="req" aria-hidden="true">*</span>' : ""}</label>
    <input id="${id}" name="${name}" type="${type}" value="${esc(value ?? "")}" autocomplete="off" aria-describedby="${id}-msg" ${attrs} />
    <p class="field__msg" id="${id}-msg">${esc(hint)}</p>
  </div>`;
}

const numRule = (min, max, required = false) => (v, input) => {
  if (input.validity.badInput) return "Nombre invalide.";
  if (v === "") return required ? "Champ obligatoire." : "";
  const n = Number(v);
  if (!Number.isFinite(n)) return "Nombre invalide.";
  if (n < min || n > max) return `Doit être entre ${fmtInt(min)} et ${fmtInt(max)}.`;
  return "";
};

const parseUTCInput = (v) => new Date(v.length === 16 ? `${v}:00Z` : `${v}Z`);

const RULES = {
  st: (v) => (v.trim() ? "" : "L'identifiant station est obligatoire."),
  ts: (v) => (v && isValidDate(parseUTCInput(v)) ? "" : "Date et heure obligatoires."),
  lat: numRule(-90, 90, true),
  lng: numRule(-180, 180, true),
  elevation: numRule(-500, 9000),
  temp: numRule(-90, 60),
  dew: numRule(-90, 60),
  pressure: numRule(850, 1090),
  windAngle: numRule(0, 360),
  windSpeed: numRule(0, 120),
};

function validateField(input) {
  const rule = RULES[input.name];
  const wrap = input.closest(".field");
  const msg = rule ? rule(input.value, input) : "";
  wrap.classList.toggle("has-error", !!msg);
  input.setAttribute("aria-invalid", String(!!msg));
  $(".field__msg", wrap).textContent = msg || wrap.dataset.hint;
  return !msg;
}

const inputValue = (v) => (v == null ? "" : String(v));
const toInputDate = (d) => (isValidDate(d) ? d.toISOString().slice(0, 16) : "");

function readForm(form) {
  const get = (name) => form.elements[name].value.trim();
  const num = (name) => (get(name) === "" ? null : Number(get(name)));
  return {
    callLetters: get("callLetters"),
    st: get("st"),
    type: get("type"),
    ts: parseUTCInput(get("ts")).toISOString(),
    lat: num("lat"),
    lng: num("lng"),
    elevation: num("elevation"),
    temp: num("temp"),
    dew: num("dew"),
    pressure: num("pressure"),
    windAngle: num("windAngle"),
    windSpeed: num("windSpeed"),
  };
}

const quality = (v) => (v == null ? "9" : "1");

function toCreatePayload(v) {
  return {
    st: v.st,
    ts: v.ts,
    callLetters: v.callLetters || undefined,
    type: v.type || undefined,
    position: { type: "Point", coordinates: [v.lng, v.lat] },
    elevation: v.elevation ?? MISSING.elevation,
    airTemperature: { value: v.temp ?? MISSING.temp, quality: quality(v.temp) },
    dewPoint: { value: v.dew ?? MISSING.temp, quality: quality(v.dew) },
    pressure: { value: v.pressure ?? MISSING.pressure, quality: quality(v.pressure) },
    wind: {
      direction: { angle: v.windAngle ?? MISSING.angle, quality: quality(v.windAngle) },
      type: "N",
      speed: { rate: v.windSpeed ?? MISSING.rate, quality: quality(v.windSpeed) },
    },
    qualityControlProcess: "V020",
    dataSource: "4",
    sections: [],
  };
}

function toUpdatePayload(v) {
  return {
    st: v.st,
    ts: v.ts,
    callLetters: v.callLetters,
    type: v.type,
    "position.type": "Point",
    "position.coordinates": [v.lng, v.lat],
    elevation: v.elevation ?? MISSING.elevation,
    "airTemperature.value": v.temp ?? MISSING.temp,
    "airTemperature.quality": quality(v.temp),
    "dewPoint.value": v.dew ?? MISSING.temp,
    "dewPoint.quality": quality(v.dew),
    "pressure.value": v.pressure ?? MISSING.pressure,
    "pressure.quality": quality(v.pressure),
    "wind.direction.angle": v.windAngle ?? MISSING.angle,
    "wind.direction.quality": quality(v.windAngle),
    "wind.speed.rate": v.windSpeed ?? MISSING.rate,
    "wind.speed.quality": quality(v.windSpeed),
  };
}

function renderForm(doc = null) {
  const s = doc ? summarize(doc) : null;
  const isEdit = !!s;

  return (root) => {
    modal.mode = "form";
    modal.docId = s?.id ?? null;
    root.innerHTML = `
      <form class="form" novalidate>
        <h2 class="form__title" id="modalTitle">${isEdit ? esc(s.callLabel) : "Nouveau relevé"}</h2>
        <p class="form__lead">Les champs marqués d'une étoile sont obligatoires. Une mesure laissée vide est enregistrée comme non mesurée.</p>

        <div class="form__group">
          <h3>Identité</h3>
          <div class="form__grid">
            ${field({ name: "callLetters", label: "Indicatif", value: s?.call, hint: "Exemple : VCSZ", maxlength: 12 })}
            ${field({ name: "st", label: "Identifiant station", value: s?.st, required: true, hint: "Exemple : x+47600-047900" })}
            ${field({ name: "type", label: "Type de relevé", value: s?.type, list: "typeList", hint: "Exemple : FM-13 pour un navire, FM-15 pour un aéroport" })}
            ${field({ name: "ts", label: "Date et heure (UTC)", type: "datetime-local", value: toInputDate(s?.ts ?? new Date()), required: true })}
          </div>
          <datalist id="typeList">${Object.entries(TYPE_LABELS)
            .map(([k, v]) => `<option value="${k}">${esc(v)}</option>`)
            .join("")}</datalist>
        </div>

        <div class="form__group">
          <h3>Position</h3>
          <div class="picker${s?.lat == null ? " is-empty" : ""}" data-picker aria-hidden="true">
            <span class="picker__eq"></span>
            <span class="picker__mer"></span>
            <span class="picker__dot"></span>
            <span class="picker__hint">Cliquez pour placer la station</span>
            <span class="picker__readout"></span>
          </div>
          <div class="form__grid form__grid--3">
            ${field({ name: "lat", label: "Latitude", type: "number", value: inputValue(s?.lat), required: true, min: -90, max: 90, step: "any", hint: "De -90 à 90" })}
            ${field({ name: "lng", label: "Longitude", type: "number", value: inputValue(s?.lng), required: true, min: -180, max: 180, step: "any", hint: "De -180 à 180" })}
            ${field({ name: "elevation", label: "Altitude (m)", type: "number", value: inputValue(s?.elevation), step: "any" })}
          </div>
        </div>

        <div class="form__group">
          <h3>Mesures</h3>
          <div class="form__grid form__grid--3">
            ${field({ name: "temp", label: "Température (°C)", type: "number", value: inputValue(s?.temp), step: "any" })}
            ${field({ name: "dew", label: "Point de rosée (°C)", type: "number", value: inputValue(s?.dew), step: "any" })}
            ${field({ name: "pressure", label: "Pression (hPa)", type: "number", value: inputValue(s?.pressure), step: "any" })}
            ${field({ name: "windAngle", label: "Direction du vent (°)", type: "number", value: inputValue(s?.windAngle), step: "any", hint: "0 pour le nord, 90 pour l'est" })}
            ${field({ name: "windSpeed", label: "Vitesse du vent (m/s)", type: "number", value: inputValue(s?.windSpeed), step: "any" })}
          </div>
        </div>

        <div class="form__actions">
          <button class="btn" type="button" ${isEdit ? `data-cancel="${esc(s.id)}"` : "data-close"}>Annuler</button>
          <button class="btn btn--primary" type="submit">${icon.check}<span>${isEdit ? "Enregistrer" : "Créer le relevé"}</span></button>
        </div>
      </form>`;

    const form = $("form", root);
    const picker = $("[data-picker]", form);
    const readout = $(".picker__readout", picker);
    const latInput = form.elements.lat;
    const lngInput = form.elements.lng;

    const syncPicker = () => {
      const lat = Number(latInput.value);
      const lng = Number(lngInput.value);
      const ok = latInput.value !== "" && lngInput.value !== "" && Number.isFinite(lat) && Number.isFinite(lng);
      picker.classList.toggle("is-empty", !ok);
      if (!ok) return;
      picker.style.setProperty("--px", `${((clamp(lng, -180, 180) + 180) / 360) * 100}%`);
      picker.style.setProperty("--py", `${((90 - clamp(lat, -90, 90)) / 180) * 100}%`);
    };
    syncPicker();

    const pointToCoords = (e) => {
      const r = picker.getBoundingClientRect();
      return {
        lng: Math.round((((e.clientX - r.left) / r.width) * 360 - 180) * 10) / 10,
        lat: Math.round((90 - ((e.clientY - r.top) / r.height) * 180) * 10) / 10,
      };
    };

    picker.addEventListener("pointermove", (e) => {
      const { lat, lng } = pointToCoords(e);
      readout.textContent = fmtCoords(lat, lng);
    });
    picker.addEventListener("pointerleave", () => {
      readout.textContent = "";
    });
    picker.addEventListener("click", (e) => {
      const { lat, lng } = pointToCoords(e);
      latInput.value = lat;
      lngInput.value = lng;
      validateField(latInput);
      validateField(lngInput);
      modal.dirty = true;
      syncPicker();
    });

    form.addEventListener("input", (e) => {
      modal.dirty = true;
      if (e.target === latInput || e.target === lngInput) syncPicker();
      if (e.target.closest(".field")?.classList.contains("has-error")) validateField(e.target);
    });
    form.addEventListener("focusout", (e) => {
      if (e.target.matches?.("input") && e.target.value !== "") validateField(e.target);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const inputs = $$("input[name]", form);
      const ok = inputs.map(validateField).every(Boolean);
      if (!ok) {
        const first = inputs.find((i) => i.getAttribute("aria-invalid") === "true");
        first?.focus();
        return;
      }
      const btn = $('[type="submit"]', form);
      btn.classList.add("is-loading");
      btn.disabled = true;
      const values = readForm(form);
      const payload = isEdit ? null : toCreatePayload(values);
      const parkOffline = () => {
        queueReading(payload);
        modal.dirty = false;
        closeModal();
        toast({ msg: "Hors ligne. Relevé gardé sur cet appareil. Il partira au retour du réseau." });
      };
      if (!isEdit && !navigator.onLine) {
        parkOffline();
        btn.classList.remove("is-loading");
        btn.disabled = false;
        return;
      }
      try {
        const saved = isEdit ? await api.update(s.id, toUpdatePayload(values)) : await api.create(payload, { measure: ab.counted });
        modal.dirty = false;
        if (isEdit) {
          replaceDoc(saved);
          openModal(renderDetail(saved));
          toast({ msg: "Relevé enregistré." });
        } else {
          closeModal();
          toast({
            msg: "Relevé créé.",
            action: { label: "Voir", run: () => openModal(renderDetail(saved)) },
          });
          state.sort = "-ts";
          state.page = 1;
          state.q = "";
          $("#searchInput").value = "";
          syncFilters();
          renderFeatured(saved);
          loadList();
        }
      } catch (err) {
        if (!isEdit && isNetworkFailure(err)) parkOffline();
        else toast({ msg: err.message, type: "error" });
      } finally {
        btn.classList.remove("is-loading");
        btn.disabled = false;
      }
    });
  };
}

/* Suppression */

function scheduleDelete(id) {
  const doc = cache.get(id);
  if (!doc || pending.has(id)) return;
  const name = doc.callLetters || "sans indicatif";
  const wasFeatured = state.featuredId === id;
  closeModal();
  pending.add(id);
  renderGrid();
  renderMeta();
  if (wasFeatured) shuffleFeatured();

  let undone = false;
  toast({
    msg: `Relevé ${name} retiré.`,
    mark: icon.trash,
    duration: 6000,
    action: {
      label: "Annuler",
      run: () => {
        undone = true;
        pending.delete(id);
        featureToken += 1;
        renderGrid();
        renderMeta();
        if (wasFeatured) renderFeatured(doc);
        toast({ msg: "Suppression annulée." });
      },
    },
    onExpire: async () => {
      if (undone) return;
      try {
        await api.remove(id);
        pending.delete(id);
        cache.delete(id);
        state.docs = state.docs.filter((d) => String(d._id) !== id);
        state.total = Math.max(0, state.total - 1);
        if (!visibleDocs().length && state.page > 1) {
          state.page -= 1;
          loadList();
        } else {
          renderGrid();
          renderMeta();
        }
      } catch (err) {
        pending.delete(id);
        renderGrid();
        renderMeta();
        toast({ msg: err.message, type: "error" });
      }
    },
  });
}

addEventListener("pagehide", () => {
  for (const id of pending) api.remove(id, { keepalive: true }).catch(() => {});
});

/* Notifications */

function toast({ msg, type = "ok", mark, action, duration = 4200, onExpire }) {
  const el = document.createElement("div");
  el.className = `toast${type === "error" ? " toast--error" : ""}`;
  el.setAttribute("role", type === "error" ? "alert" : "status");
  el.style.setProperty("--d", `${duration}ms`);
  el.innerHTML = `
    <span class="toast__icon">${mark || (type === "error" ? icon.alert : icon.check)}</span>
    <p class="toast__msg">${esc(msg)}</p>
    ${action ? `<button class="btn toast__action" type="button">${esc(action.label)}</button>` : ""}
    <button class="toast__x" type="button" aria-label="Fermer">${icon.x}</button>
    <span class="toast__bar" aria-hidden="true"></span>`;
  $("#toasts").append(el);

  let remaining = duration;
  let started = Date.now();
  let timer = null;
  let settled = false;

  const dismiss = (expired) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    if (expired) onExpire?.();
    el.classList.add("is-leaving");
    setTimeout(() => el.remove(), reduceMotion ? 0 : 150);
  };
  const arm = () => {
    started = Date.now();
    timer = setTimeout(() => dismiss(true), remaining);
  };

  el.addEventListener("pointerenter", () => {
    clearTimeout(timer);
    remaining -= Date.now() - started;
  });
  el.addEventListener("pointerleave", arm);
  $(".toast__x", el).addEventListener("click", () => dismiss(true));
  if (action) {
    $(".toast__action", el).addEventListener("click", () => {
      settled = true;
      clearTimeout(timer);
      el.classList.add("is-leaving");
      setTimeout(() => el.remove(), reduceMotion ? 0 : 150);
      action.run();
    });
  }
  arm();
}

/* Interactions */

document.addEventListener("click", async (e) => {
  const t = e.target.closest(
    "[data-close],[data-cancel],[data-new],[data-shuffle],[data-retry],[data-sort],[data-page],[data-clear],[data-copy],[data-delete],[data-edit],[data-open],[data-id],[data-outbox-remove],[data-save-place]"
  );
  if (!t) return;

  if (t.matches("[data-outbox-remove]")) {
    removeOutbox(t.dataset.outboxRemove);
    toast({ msg: "Relevé retiré de cet appareil." });
  } else if (t.matches("[data-close]")) {
    requestClose();
  } else if (t.matches("[data-cancel]")) {
    if (modal.dirty && Date.now() > modal.closeArmed) {
      modal.closeArmed = Date.now() + 3500;
      toast({ msg: "Modifications non enregistrées. Fermez encore une fois pour les abandonner.", type: "error", duration: 3500 });
      return;
    }
    const doc = cache.get(t.dataset.cancel);
    if (doc) openModal(renderDetail(doc));
    else closeModal();
  } else if (t.matches("[data-new]")) {
    openModal(renderForm());
  } else if (t.matches("[data-shuffle]")) {
    shuffleFeatured();
  } else if (t.matches("[data-retry]")) {
    if (t.dataset.retry === "une") loadFeatured();
    else scheduleSearch($("#searchInput").value, { immediate: true });
  } else if (t.matches("[data-sort]")) {
    setSort(t.dataset.sort);
  } else if (t.matches("[data-page]")) {
    goPage(Number(t.dataset.page));
  } else if (t.matches("[data-clear]")) {
    clearSearch();
  } else if (t.matches("[data-copy]")) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(cache.get(t.dataset.copy), null, 2));
      toast({ msg: "Document copié." });
    } catch {
      toast({ msg: "Copie impossible dans ce navigateur.", type: "error" });
    }
  } else if (t.matches("[data-delete]")) {
    scheduleDelete(t.dataset.delete);
  } else if (t.matches("[data-save-place]")) {
    try {
      const doc = await ensureDoc(t.dataset.savePlace);
      const s = summarize(doc);
      if (s.lat == null || s.lng == null) {
        toast({ msg: "Ce relevé n'a pas de position.", type: "error" });
        return;
      }
      const result = CielPlaces.save({ name: s.callLabel, st: s.st, lat: s.lat, lng: s.lng });
      const voir = { label: "Voir", run: () => { location.href = "/lieux.html"; } };
      toast({ msg: result.created ? "Lieu enregistré." : "Ce lieu est déjà dans Mes lieux.", action: voir });
      if (state.featuredId === s.id) renderFeatured(doc);
      if (!$("#modal").hidden && modal.mode === "detail" && modal.docId === s.id) openModal(renderDetail(doc));
    } catch (err) {
      toast({ msg: err.message, type: "error" });
    }
  } else {
    const id = t.dataset.open || t.dataset.edit || t.dataset.id;
    try {
      const doc = await ensureDoc(id);
      openModal(t.matches("[data-edit]") ? renderForm(doc) : renderDetail(doc));
    } catch (err) {
      toast({ msg: err.message, type: "error" });
    }
  }
});

document.addEventListener("keydown", (e) => {
  const open = !$("#modal").hidden;
  if (open) {
    if (e.key === "Escape") {
      e.preventDefault();
      requestClose();
    } else if (e.key === "Tab") {
      trapFocus(e);
    }
    return;
  }
  const typing = e.target.closest?.("input, textarea, select, [contenteditable]");
  if (typing) {
    if (e.key === "Escape") e.target.blur();
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "/") {
    e.preventDefault();
    $("#searchInput").focus();
  } else if (e.key === "n" || e.key === "N") {
    e.preventDefault();
    openModal(renderForm());
  }
});

$("#clearSearch").addEventListener("click", clearSearch);

$("#searchInput").addEventListener("input", (e) => {
  scheduleSearch(e.target.value);
});

$("#searchBtn").addEventListener("click", () => {
  scheduleSearch($("#searchInput").value, { immediate: true });
});

$("#searchInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    scheduleSearch(e.target.value, { immediate: true });
  }
});

const spy = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      $$(".nav a").forEach((a) => a.removeAttribute("aria-current"));
      $(`.nav a[href="#${entry.target.id}"]`)?.setAttribute("aria-current", "page");
    });
  },
  { rootMargin: "-40% 0px -50% 0px" }
);
["une", "releves"].forEach((id) => spy.observe(document.getElementById(id)));

/* Live SSE — synchro multi-onglets */

const POLL_MS = 30_000;
let stream = null;
let pollTimer = null;
let stopped = false;
let sseReloadRunning = false;
let sseReloadDirty = false;

function setSseStatus(state, label) {
  const el = $("#sseStatus");
  if (!el) return;
  el.dataset.state = state;
  $(".sse__label", el).textContent = label;
}

async function refreshOpenDetail(change) {
  if (stopped || $("#modal").hidden || modal.mode !== "detail" || !modal.docId) return;
  const openId = modal.docId;

  if (change?.action === "deleted" && String(change.id) === openId) {
    closeModal();
    toast({ msg: "Ce relevé a été supprimé sur un autre écran.", type: "error" });
    return;
  }

  if (change?.id && String(change.id) !== openId) return;

  try {
    const doc = await api.get(openId);
    cache.set(openId, doc);
    if (!stopped && !$("#modal").hidden && modal.mode === "detail" && modal.docId === openId) {
      openModal(renderDetail(doc));
    }
  } catch {
    if (!$("#modal").hidden && modal.docId === openId) {
      closeModal();
      toast({ msg: "Ce relevé n’est plus disponible.", type: "error" });
    }
  }
}

async function reloadFromLive(change) {
  if (stopped) return;
  sseReloadDirty = true;
  if (sseReloadRunning) return;
  sseReloadRunning = true;
  try {
    while (sseReloadDirty && !stopped) {
      sseReloadDirty = false;
      await Promise.all([loadList(), loadFeatured(), refreshOpenDetail(change)]);
    }
  } catch {
    /* loadList / loadFeatured gèrent déjà l’erreur à l’écran */
  } finally {
    sseReloadRunning = false;
  }
}

function openLiveStream() {
  if (stopped || typeof EventSource === "undefined") return;
  if (stream) {
    stream.close();
    stream = null;
  }

  setSseStatus("connecting", "Connexion…");
  stream = new EventSource("/api/weather/events");

  stream.addEventListener("ready", () => {
    if (stopped) return;
    setSseStatus("connected", "En direct");
    reloadFromLive();
  });

  stream.addEventListener("weather-updated", (e) => {
    if (stopped) return;
    let change = null;
    try {
      change = JSON.parse(e.data);
    } catch {
      /* ignore */
    }
    reloadFromLive(change);
  });

  // Ne pas appeler close() ici : EventSource se reconnecte tout seul
  stream.onerror = () => {
    if (stopped) return;
    setSseStatus("interrupted", "Connexion interrompue");
  };
}

function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (!stopped) reloadFromLive();
  }, POLL_MS);
}

function stopLive() {
  stopped = true;
  if (stream) {
    stream.close();
    stream = null;
  }
  clearInterval(pollTimer);
  pollTimer = null;
  cleanupReactiveSearch();
}

addEventListener("pagehide", stopLive);

$("#grid").innerHTML = skeletons();
renderOutbox();
const initialQuery = new URLSearchParams(location.search).get("q");
if (initialQuery) {
  $("#searchInput").value = initialQuery;
  scheduleSearch(initialQuery, { immediate: true });
}
loadFeatured();
if (!initialQuery) loadList();
loadAssignment();
addEventListener("online", () => {
  renderOutbox();
  flushOutbox();
});
addEventListener("offline", renderOutbox);
flushOutbox();
openLiveStream();
startPolling();
