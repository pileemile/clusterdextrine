/* =========================================================
   MONGOFLIX — front de l'API sample_weatherdata
   ========================================================= */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const debounce = (fn, ms) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};
const smooth = () => (reduceMotion ? "auto" : "smooth");

/* ---------- Icônes ---------- */

const svg = (d, fill = false) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" ${
    fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
  }>${d}</svg>`;

const icon = {
  leaf: svg('<path d="M12 2c3.5 4.2 5.5 8.3 5.5 12.2 0 3.6-2.2 6.2-4.8 7.3V23h-1.4v-1.5C8.7 20.4 6.5 17.8 6.5 14.2 6.5 10.3 8.5 6.2 12 2z"/>', true),
  play: svg('<path d="M7 4.5v15l12.5-7.5z"/>', true),
  edit: svg('<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M14.5 7.5l3 3"/>'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  shuffle: svg('<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>'),
  wind: svg('<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>'),
  gauge: svg('<path d="M12 14l4-5"/><path d="M3.5 18a9.5 9.5 0 1 1 17 0"/>'),
  thermo: svg('<path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0z"/>'),
  drop: svg('<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z"/>'),
  humidity: svg('<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z"/><path d="M9.5 16l5-5M9.5 11h.01M14.5 16h.01"/>'),
  eye: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  cloud: svg('<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18z"/>'),
  mountain: svg('<path d="M3 20 9.5 8l4 7 2.5-4 5 9z"/>'),
  chevronL: svg('<path d="M15 5l-7 7 7 7"/>'),
  chevronR: svg('<path d="M9 5l7 7-7 7"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  alert: svg('<circle cx="12" cy="12" r="9.5"/><path d="M12 8v5M12 16.5h.01"/>'),
  copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  code: svg('<path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/>'),
  refresh: svg('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>'),
};

/* ---------- Texte animé ---------- */

const charSpans = (text) =>
  [...String(text)].map((c, i) => `<span style="--i:${i}">${c === " " ? "&nbsp;" : esc(c)}</span>`).join("");

const roll = (text) =>
  `<span class="roll"><span class="sr-only">${esc(text)}</span><span class="roll__a" aria-hidden="true">${charSpans(
    text
  )}</span><span class="roll__b" aria-hidden="true">${charSpans(text)}</span></span>`;

const splitTitle = (text) =>
  `<span class="sr-only">${esc(text)}</span>` +
  [...String(text)]
    .map((c, i) => `<span class="ch" aria-hidden="true"><span style="--i:${i}">${c === " " ? "&nbsp;" : esc(c)}</span></span>`)
    .join("");

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@$";

function scramble(el) {
  if (!el || reduceMotion || el.dataset.scrambling) return;
  const final = (el.dataset.text ??= el.textContent);
  el.dataset.scrambling = "1";
  const total = 22;
  let frame = 0;
  const tick = () => {
    frame++;
    const progress = frame / total;
    el.textContent = [...final]
      .map((ch, i) => (ch === " " || progress > i / final.length ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
      .join("");
    if (frame < total) requestAnimationFrame(tick);
    else {
      el.textContent = final;
      delete el.dataset.scrambling;
    }
  };
  requestAnimationFrame(tick);
}

/* ---------- Formatage ---------- */

const minus = (s) => s.replace("-", "−");
const nfCache = new Map();
const nf = (digits) => {
  if (!nfCache.has(digits)) {
    nfCache.set(digits, new Intl.NumberFormat("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  }
  return nfCache.get(digits);
};
const fmtNum = (v, digits = 1) => (v == null ? "—" : minus(nf(digits).format(v)));
const fmtInt = (v) => new Intl.NumberFormat("fr-FR").format(v);
const fmtTemp = (v) => (v == null ? "—" : `${fmtNum(v, 1)}°`);
const dfLong = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" });
const dfShort = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());
const fmtDate = (d, short = false) =>
  !isValidDate(d) ? "Date inconnue" : short ? dfShort.format(d) : `${dfLong.format(d)} UTC`;
const fmtCoords = (lat, lng) =>
  lat == null || lng == null
    ? "Position inconnue"
    : `${nf(1).format(Math.abs(lat))}°${lat >= 0 ? "N" : "S"} ${nf(1).format(Math.abs(lng))}°${lng >= 0 ? "E" : "O"}`;
const CARDINALS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
const cardinal = (a) => CARDINALS[Math.round(a / 22.5) % 16];

/* ---------- Données ---------- */

// Sentinelles du dataset officiel : valeur >= seuil = non mesuré.
const MISSING = { temp: 999.9, pressure: 9999.9, rate: 999.9, angle: 999, elevation: 9999, visibility: 999999, ceiling: 99999 };
const measured = (v, missing) => (typeof v === "number" && Number.isFinite(v) && v < missing ? v : null);

const TYPE_LABELS = {
  "FM-12": "SYNOP terrestre",
  "FM-13": "Navire en mer",
  "FM-14": "SYNOP mobile",
  "FM-15": "METAR aéroport",
  "FM-16": "SPECI aéroport",
  SAO: "Station SAO",
  "SY-MT": "SYNOP + METAR",
};

function summarize(d) {
  const coords = Array.isArray(d.position?.coordinates) ? d.position.coordinates : [];
  const [lng, lat] = coords;
  return {
    id: String(d._id),
    st: d.st ?? "",
    call: d.callLetters || "—",
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

const heatOf = (t) => (t == null ? 0.12 : clamp((t + 25) / 65, 0, 1));

function heatColor(h) {
  const stops = [
    [0, [150, 178, 163]],
    [0.55, [0, 237, 100]],
    [1, [210, 255, 60]],
  ];
  const i = h <= stops[1][0] ? 0 : 1;
  const [a, ca] = stops[i];
  const [b, cb] = stops[i + 1];
  const t = (h - a) / (b - a);
  const c = ca.map((v, k) => Math.round(v + (cb[k] - v) * t));
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}

function relativeHumidity(t, dew) {
  if (t == null || dew == null) return null;
  const f = (x) => Math.exp((17.625 * x) / (243.04 + x));
  return clamp((100 * f(dew)) / f(t), 0, 100);
}

function describe(s) {
  const when = isValidDate(s.ts) ? ` le ${fmtDate(s.ts)}` : "";
  const where = s.lat != null ? `, à ${fmtCoords(s.lat, s.lng)}` : "";
  const mood =
    s.temp == null
      ? "Température non mesurée."
      : s.temp >= 30
        ? "Chaleur écrasante."
        : s.temp >= 20
          ? "Douceur estivale."
          : s.temp >= 8
            ? "Air tempéré."
            : s.temp >= 0
              ? "Fraîcheur marquée."
              : "Le gel s'installe.";
  return `${TYPE_LABELS[s.type] ?? "Relevé"} capturé${when}${where}. ${mood}`;
}

/* ---------- API ---------- */

async function request(url, { method = "GET", body, keepalive } = {}) {
  const res = await fetch(url, {
    method,
    keepalive,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

const api = {
  list(params = {}) {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));
    return request(`/api/weather?${qs}`);
  },
  get: (id) => request(`/api/weather/${encodeURIComponent(id)}`),
  create: (body) => request("/api/weather", { method: "POST", body }),
  update: (id, body) => request(`/api/weather/${encodeURIComponent(id)}`, { method: "PUT", body }),
  remove: (id, opts) => request(`/api/weather/${encodeURIComponent(id)}`, { method: "DELETE", ...opts }),
};

/* ---------- État ---------- */

const cache = new Map();
const pendingDeletes = new Map();
let heroGlobe = null;
let featuredId = null;

function remember(docs) {
  docs.forEach((d) => cache.set(String(d._id), d));
  heroGlobe?.setMarkers(
    [...cache.values()]
      .filter((d) => !pendingDeletes.has(String(d._id)))
      .map(summarize)
      .filter((s) => s.lat != null)
  );
}

/* =========================================================
   Globe 3D (canvas, projection orthographique)
   ========================================================= */

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const globes = new Set();

function fibonacciSphere(n) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    pts.push([Math.asin(y), Math.atan2(Math.sin(th) * r, Math.cos(th) * r)]);
  }
  return pts;
}

class Globe {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.opts = { dots: 1600, speed: 0.0012, radius: 0.44, hold: 4500, interactive: false, ...opts };
    this.rot = opts.rot ?? 0.6;
    this.tilt = -0.42;
    this.vel = 0;
    this.targetRot = null;
    this.targetTilt = null;
    this.holdUntil = 0;
    this.markers = [];
    this.focus = null;
    this.visible = true;
    this.raf = null;
    this.w = 0;
    this.h = 0;
    this.points = fibonacciSphere(this.opts.dots);
    this.frame = this.frame.bind(this);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.io = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.start();
    });
    this.io.observe(canvas);
    if (this.opts.interactive) this.bindDrag();
    globes.add(this);
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.start();
  }

  setMarkers(list) {
    this.markers = list.slice(0, 500).map((s) => [s.lat * DEG, s.lng * DEG]);
    if (reduceMotion) this.start();
  }

  setFocus(lat, lng, { spin = true } = {}) {
    this.focus = [lat * DEG, lng * DEG];
    if (spin) this.spinTo(lat, lng);
    this.start();
  }

  spinTo(lat, lng) {
    const target = -lng * DEG;
    const diff = ((((target - this.rot + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
    this.targetRot = this.rot + diff;
    this.targetTilt = clamp(-lat * DEG, -1.2, 1.2);
    this.vel = 0;
    this.start();
  }

  bindDrag() {
    const c = this.canvas;
    let lx = 0;
    let ly = 0;
    c.addEventListener("pointerdown", (e) => {
      this.dragging = true;
      this.targetRot = null;
      lx = e.clientX;
      ly = e.clientY;
      c.setPointerCapture(e.pointerId);
      c.classList.add("is-dragging");
      $(".hero__hint")?.classList.add("is-hidden");
    });
    c.addEventListener("pointermove", (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      this.rot += dx * 0.006;
      this.tilt = clamp(this.tilt - dy * 0.004, -1.3, 1.3);
      this.vel = dx * 0.0007;
      this.start();
    });
    const end = () => {
      this.dragging = false;
      this.holdUntil = performance.now() + 1200;
      c.classList.remove("is-dragging");
    };
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", end);
  }

  start() {
    if (!this.raf && this.visible) this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    globes.delete(this);
  }

  frame(now) {
    this.raf = null;
    if (!this.visible || document.hidden || !this.w) return;

    if (this.targetRot != null) {
      const k = reduceMotion ? 1 : 0.06;
      this.rot += (this.targetRot - this.rot) * k;
      this.tilt += (this.targetTilt - this.tilt) * k;
      if (Math.abs(this.targetRot - this.rot) < 1e-3 && Math.abs(this.targetTilt - this.tilt) < 1e-3) {
        this.targetRot = null;
        this.holdUntil = now + this.opts.hold;
      }
    } else if (!this.dragging) {
      this.rot += this.vel;
      this.vel *= 0.94;
      if (now > this.holdUntil) this.rot += this.opts.speed;
    }

    this.draw(now);
    if (!reduceMotion) this.raf = requestAnimationFrame(this.frame);
  }

  draw(now) {
    const { ctx, w, h } = this;
    const R = Math.min(w, h) * this.opts.radius;
    const cx = w / 2;
    const cy = h / 2;
    const ct = Math.cos(this.tilt);
    const st = Math.sin(this.tilt);
    const rot = this.rot;
    const project = (la, lo) => {
      const l = lo + rot;
      const cl = Math.cos(la);
      const x = cl * Math.sin(l);
      const y = -Math.sin(la);
      const z = cl * Math.cos(l);
      return [cx + x * R, cy + (y * ct - z * st) * R, y * st + z * ct];
    };

    ctx.clearRect(0, 0, w, h);

    let g = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.5);
    g.addColorStop(0, "rgba(0,237,100,0.16)");
    g.addColorStop(1, "rgba(0,237,100,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.5, 0, TAU);
    ctx.fill();

    g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R);
    g.addColorStop(0, "rgba(0,104,74,0.55)");
    g.addColorStop(0.6, "rgba(2,40,28,0.72)");
    g.addColorStop(1, "rgba(1,12,8,0.95)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "#00ed64";
    for (const [la, lo] of this.points) {
      const [x, y, z] = project(la, lo);
      if (z < 0) {
        ctx.globalAlpha = 0.05;
        ctx.fillRect(x, y, 1, 1);
      } else {
        ctx.globalAlpha = 0.1 + z * 0.6;
        const s = 0.8 + z * 1.2;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
    }

    ctx.fillStyle = "#c6ff3d";
    for (const [la, lo] of this.markers) {
      const [x, y, z] = project(la, lo);
      if (z <= 0.02) continue;
      ctx.globalAlpha = 0.3 + z * 0.7;
      ctx.beginPath();
      ctx.arc(x, y, 1.4 + z * 1.4, 0, TAU);
      ctx.fill();
    }

    if (this.focus) {
      const [x, y, z] = project(this.focus[0], this.focus[1]);
      if (z > 0) {
        const t = now / 1000;
        ctx.strokeStyle = "#00ed64";
        ctx.lineWidth = 1.5;
        for (let k = 0; k < 3; k++) {
          const ph = (t * 0.55 + k / 3) % 1;
          ctx.globalAlpha = (1 - ph) * 0.85 * z;
          ctx.beginPath();
          ctx.arc(x, y, 4 + ph * R * 0.16, 0, TAU);
          ctx.stroke();
        }
        const beam = ctx.createLinearGradient(x, y, x, y - R * 0.45);
        beam.addColorStop(0, "rgba(0,237,100,0.9)");
        beam.addColorStop(1, "rgba(0,237,100,0)");
        ctx.globalAlpha = z;
        ctx.fillStyle = beam;
        ctx.fillRect(x - 1, y - R * 0.45, 2, R * 0.45);
        ctx.fillStyle = "rgba(0,237,100,0.35)";
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#eafff2";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}

document.addEventListener("visibilitychange", () => globes.forEach((g) => g.start()));

/* =========================================================
   Cartes
   ========================================================= */

function cardHTML(doc, i = 0, { poster = false } = {}) {
  const s = summarize(doc);
  const heat = heatOf(s.temp);
  const px = s.lng == null ? 50 : ((s.lng + 180) / 360) * 100;
  const py = s.lat == null ? 50 : ((90 - s.lat) / 180) * 100;
  const label = `${s.call}, ${s.temp == null ? "température inconnue" : `${fmtNum(s.temp)} degrés`}, ${fmtDate(s.ts, true)}`;
  return `
  <button class="card${poster ? " card--poster" : ""}" type="button" data-id="${esc(s.id)}"
    style="--i:${i};--heat:${heat.toFixed(3)};--tc:${heatColor(heat)};--px:${px.toFixed(2)}%;--py:${py.toFixed(2)}%"
    aria-label="${esc(label)}">
    <span class="card__map" aria-hidden="true"><span class="card__cross"></span><span class="card__dot"></span></span>
    <span class="card__fill" aria-hidden="true"></span>
    <span class="card__spot" aria-hidden="true"></span>
    <span class="card__top" aria-hidden="true">
      <span class="tag">${esc(s.type || "N/A")}</span>
      <span class="card__coords">${esc(fmtCoords(s.lat, s.lng))}</span>
    </span>
    <span class="card__body" aria-hidden="true">
      <span class="card__temp">${fmtTemp(s.temp)}</span>
      <span class="card__call" data-scramble>${esc(s.call)}</span>
      <span class="card__date">${esc(fmtDate(s.ts, true))}</span>
      <span class="card__reveal"><span>
        <span class="card__meta">
          <span>${icon.wind}${s.windSpeed == null ? "—" : `${fmtNum(s.windSpeed)} m/s`}</span>
          <span>${icon.gauge}${s.pressure == null ? "—" : `${fmtNum(s.pressure, 0)} hPa`}</span>
        </span>
      </span></span>
    </span>
    <span class="card__play" aria-hidden="true">${icon.play}</span>
  </button>`;
}

const top10Item = (doc, i) =>
  `<div class="top10__item" data-item-id="${esc(String(doc._id))}" style="--i:${i}"><span class="top10__num" aria-hidden="true">${
    i + 1
  }</span>${cardHTML(doc, i, { poster: true })}</div>`;

const skeletons = (n, poster = false) =>
  Array.from(
    { length: n },
    (_, i) => `<div class="card card--skeleton${poster ? " card--poster" : ""}" style="--i:${i}" aria-hidden="true"></div>`
  ).join("");

const stateBlock = ({ title, text, action = "", error = false }) => `
  <div class="state${error ? " state--error" : ""}" role="${error ? "alert" : "status"}">
    <div class="state__orb" aria-hidden="true"></div>
    <h3>${esc(title)}</h3>
    <p>${esc(text)}</p>
    ${action}
  </div>`;

const errorBlock = (message) =>
  stateBlock({
    title: "Impossible de charger les relevés",
    text: message,
    error: true,
    action: `<button class="btn btn--ghost btn--sm" type="button" data-retry>${icon.refresh}${roll("Réessayer")}</button>`,
  });

function patchCards(doc) {
  const id = String(doc._id);
  $$(`.card[data-id="${id}"]`).forEach((card) => {
    card.outerHTML = cardHTML(doc, 0, { poster: card.classList.contains("card--poster") });
  });
}

function cardsFor(id) {
  return $$(`.card[data-id="${id}"]`).map((c) => c.closest(".top10__item") ?? c);
}

/* =========================================================
   Hero
   ========================================================= */

function heroStat(label, value, unit, digits) {
  return `<div class="stat">
    <div class="stat__value"><span data-count="${value ?? ""}" data-digits="${digits}">${value == null ? "—" : fmtNum(0, digits)}</span><small>${unit}</small></div>
    <div class="stat__label">${label}</div>
  </div>`;
}

function renderHero(doc) {
  const s = summarize(doc);
  featuredId = s.id;
  const el = $("#hero");
  el.innerHTML = `
    <p class="eyebrow">${icon.leaf} Relevé à la une</p>
    <h1 class="hero__title">${splitTitle(s.call)}</h1>
    <div class="chips">
      <span class="chip chip--green">${esc(s.type || "N/A")}</span>
      <span class="chip">${esc(fmtDate(s.ts))}</span>
      <span class="chip">${esc(fmtCoords(s.lat, s.lng))}</span>
    </div>
    <p class="hero__desc">${esc(describe(s))}</p>
    <div class="hero__stats">
      ${heroStat("Température", s.temp, "°C", 1)}
      ${heroStat("Pression", s.pressure, "hPa", 0)}
      ${heroStat("Vent", s.windSpeed, "m/s", 1)}
    </div>
    <div class="hero__actions">
      <button class="btn btn--primary btn--lg magnetic" type="button" data-open="${esc(s.id)}">${icon.play}${roll("Voir le relevé")}</button>
      <button class="btn btn--ghost btn--lg magnetic" type="button" data-edit="${esc(s.id)}">${icon.edit}${roll("Modifier")}</button>
      <button class="btn btn--ghost btn--lg btn--icon magnetic" type="button" data-shuffle aria-label="Afficher un autre relevé" title="Un autre relevé">${icon.shuffle}</button>
    </div>`;
  $$("[data-count]", el).forEach((n) => countUp(n, 1600));
  if (s.lat != null) heroGlobe?.setFocus(s.lat, s.lng);
}

async function shuffleHero() {
  const pool = [...cache.values()].filter((d) => {
    const s = summarize(d);
    return s.id !== featuredId && !pendingDeletes.has(s.id) && s.lat != null && s.temp != null;
  });
  if (!pool.length) return;
  const el = $("#hero");
  el.classList.add("is-leaving");
  await sleep(reduceMotion ? 0 : 380);
  renderHero(pool[(Math.random() * pool.length) | 0]);
  el.classList.remove("is-leaving");
}

function countUp(el, duration = 1300) {
  const raw = el.dataset.count;
  if (raw === "" || raw == null) return;
  const to = Number(raw);
  const digits = Number(el.dataset.digits ?? 1);
  if (reduceMotion) {
    el.textContent = fmtNum(to, digits);
    return;
  }
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / duration);
    const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
    el.textContent = fmtNum(to * eased, digits);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* =========================================================
   Rangées
   ========================================================= */

const ROWS = [
  { id: "cold", title: "Grand froid", subtitle: "Les températures les plus basses de la collection", sort: "temp" },
  { id: "wind", title: "Vents violents", subtitle: "Les rafales les plus fortes jamais relevées", sort: "-wind" },
  { id: "high", title: "Anticyclones", subtitle: "Là où la pression atmosphérique culmine", sort: "-pressure" },
  { id: "low", title: "Dépressions", subtitle: "Là où la pression s'effondre", sort: "pressure" },
  { id: "recent", title: "Les plus récents", subtitle: "Les derniers relevés horodatés, y compris les vôtres", sort: "-ts" },
];

const rowShell = ({ id, title, subtitle, sort }) => `
  <section class="section reveal-group" id="row-${id}" aria-labelledby="row-${id}-title">
    <div class="section__head reveal">
      <div>
        <h2 class="section__title" id="row-${id}-title">${esc(title)}</h2>
        <p class="section__sub">${esc(subtitle)}</p>
      </div>
      <button class="link-more" type="button" data-explore-sort="${sort}">Tout voir ${svg('<path d="M5 12h14M13 6l6 6-6 6"/>')}</button>
    </div>
    <div class="row">
      <button class="row__arrow row__arrow--prev" type="button" data-dir="-1" aria-label="Défiler vers la gauche">${icon.chevronL}</button>
      <div class="track" data-track data-reloadable></div>
      <button class="row__arrow row__arrow--next" type="button" data-dir="1" aria-label="Défiler vers la droite">${icon.chevronR}</button>
    </div>
  </section>`;

async function loadRow(track, sort, { limit = 20, poster = false } = {}) {
  track._reload = () => loadRow(track, sort, { limit, poster });
  track.innerHTML = skeletons(poster ? 7 : 6, poster);
  track.setAttribute("aria-busy", "true");
  try {
    const { data } = await api.list({ sort, limit });
    remember(data);
    const docs = data.filter((d) => !pendingDeletes.has(String(d._id)));
    track.innerHTML = docs.length
      ? docs.map((d, i) => (poster ? top10Item(d, i) : cardHTML(d, i))).join("")
      : stateBlock({ title: "Rien ici", text: "Aucun relevé ne correspond à cette catégorie." });
    track.scrollLeft = 0;
    updateArrows(track);
    return data;
  } catch (err) {
    track.innerHTML = errorBlock(err.message);
    return [];
  } finally {
    track.removeAttribute("aria-busy");
  }
}

function updateArrows(track) {
  const row = track.closest(".row");
  if (!row) return;
  const max = track.scrollWidth - track.clientWidth;
  row.classList.toggle("can-prev", track.scrollLeft > 4);
  row.classList.toggle("can-next", track.scrollLeft < max - 4);
}

/* =========================================================
   Explorer
   ========================================================= */

const SORTS = [
  ["", "Par défaut"],
  ["-temp", "Plus chauds"],
  ["temp", "Plus froids"],
  ["-wind", "Vent fort"],
  ["-pressure", "Haute pression"],
  ["-ts", "Récents"],
];

const explore = {
  page: 1,
  limit: 24,
  sort: "",
  q: "",
  total: 0,
  pages: 1,
  reqId: 0,

  async load() {
    const id = ++this.reqId;
    const grid = $("#grid");
    grid._reload = () => this.load();
    grid.setAttribute("aria-busy", "true");
    grid.innerHTML = skeletons(12);
    try {
      const res = await api.list({ page: this.page, limit: this.limit, sort: this.sort, q: this.q });
      if (id !== this.reqId) return;
      remember(res.data);
      this.total = res.total;
      this.pages = Math.max(1, res.pages);
      const docs = res.data.filter((d) => !pendingDeletes.has(String(d._id)));
      grid.innerHTML = docs.length ? docs.map((d, i) => cardHTML(d, i)).join("") : this.emptyHTML();
      this.renderMeta();
      this.renderPager();
    } catch (err) {
      if (id !== this.reqId) return;
      grid.innerHTML = errorBlock(err.message);
      $("#pager").innerHTML = "";
    } finally {
      if (id === this.reqId) grid.removeAttribute("aria-busy");
    }
  },

  emptyHTML() {
    return stateBlock({
      title: this.q ? `Aucun résultat pour « ${this.q} »` : "Aucun relevé",
      text: this.q ? "Essayez un autre indicatif ou une partie de l'identifiant de station." : "La collection est vide.",
      action: `<button class="btn btn--primary btn--sm magnetic" type="button" data-new>${icon.plus}${roll("Créer un relevé")}</button>`,
    });
  },

  renderMeta() {
    $("#exploreCount").textContent = fmtInt(this.total);
    $("#exploreSub").innerHTML = this.q
      ? `${fmtInt(this.total)} résultat${this.total > 1 ? "s" : ""} pour « <mark>${esc(this.q)}</mark> » · <button class="link-more" type="button" data-clear-search>Effacer la recherche</button>`
      : `${fmtInt(this.total)} relevés · page ${this.page} sur ${fmtInt(this.pages)}`;
  },

  renderPager() {
    const { page, pages } = this;
    if (pages <= 1) {
      $("#pager").innerHTML = "";
      return;
    }
    const list = [...new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages))].sort((a, b) => a - b);
    let html = `<button type="button" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""} aria-label="Page précédente">${icon.chevronL}</button>`;
    let prev = 0;
    for (const p of list) {
      if (p - prev > 1) html += `<span class="pager__gap" aria-hidden="true">…</span>`;
      html += `<button type="button" data-page="${p}" ${p === page ? 'aria-current="page"' : ""} aria-label="Page ${p}">${fmtInt(p)}</button>`;
      prev = p;
    }
    html += `<button type="button" data-page="${page + 1}" ${page >= pages ? "disabled" : ""} aria-label="Page suivante">${icon.chevronR}</button>`;
    $("#pager").innerHTML = html;
  },

  renderSeg() {
    const seg = $("#sortSeg");
    if (!seg.querySelector("button")) {
      seg.insertAdjacentHTML(
        "beforeend",
        SORTS.map(([v, label]) => `<button type="button" data-sort="${v}" aria-pressed="false">${label}</button>`).join("")
      );
    }
    $$("button", seg).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.sort === this.sort)));
    movePill($(".seg__pill", seg), $('button[aria-pressed="true"]', seg));
  },

  setSort(sort) {
    this.sort = sort;
    this.page = 1;
    this.renderSeg();
    this.load();
  },

  go(page) {
    this.page = clamp(page, 1, this.pages);
    this.load();
    $("#explore").scrollIntoView({ behavior: smooth(), block: "start" });
  },

  search(q) {
    this.q = q.trim();
    this.page = 1;
    this.load();
  },
};

function movePill(pill, target) {
  if (!pill) return;
  if (!target) {
    pill.style.opacity = "0";
    return;
  }
  pill.style.opacity = "1";
  pill.style.width = `${target.offsetWidth}px`;
  pill.style.transform = `translateX(${target.offsetLeft}px)`;
}

/* =========================================================
   Modale
   ========================================================= */

const modalState = { opener: null, globe: null, mode: null, dirty: false, closeTimer: null };
let keyboardMode = false;
let lastPointer = { x: innerWidth / 2, y: innerHeight / 2 };
let closeArmedUntil = 0;

function lockScroll(on) {
  const scrollbar = innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.overflow = on ? "hidden" : "";
  document.body.style.paddingRight = on && scrollbar > 0 ? `${scrollbar}px` : "";
  $("#main").inert = on;
  $("#nav").inert = on;
}

function openModal(render) {
  const modal = $("#modal");
  const panel = $(".modal__panel", modal);
  const content = $("#modalContent");

  const mount = () => {
    modalState.globe?.destroy();
    modalState.globe = null;
    modalState.dirty = false;
    render(content);
  };

  if (!modal.hidden && !modal.classList.contains("is-closing")) {
    content.classList.add("is-swapping");
    setTimeout(
      () => {
        mount();
        panel.scrollTop = 0;
        content.classList.remove("is-swapping");
        focusInModal();
      },
      reduceMotion ? 0 : 220
    );
    return;
  }

  const wasClosing = modal.classList.contains("is-closing");
  clearTimeout(modalState.closeTimer);
  if (!wasClosing) modalState.opener = document.activeElement;
  mount();
  modal.hidden = false;
  modal.classList.remove("is-closing");
  if (!wasClosing) lockScroll(true);

  const rect = panel.getBoundingClientRect();
  let origin = lastPointer;
  if (keyboardMode && modalState.opener?.getBoundingClientRect) {
    const r = modalState.opener.getBoundingClientRect();
    origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  const ox = origin.x - rect.left;
  const oy = origin.y - rect.top;
  const radius = Math.max(
    Math.hypot(ox, oy),
    Math.hypot(rect.width - ox, oy),
    Math.hypot(ox, rect.height - oy),
    Math.hypot(rect.width - ox, rect.height - oy)
  );
  panel.style.setProperty("--ox", `${ox}px`);
  panel.style.setProperty("--oy", `${oy}px`);
  panel.style.setProperty("--r", `${Math.ceil(radius + 20)}px`);

  requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add("is-open")));
  panel.focus({ preventScroll: true });
  focusInModal();
}

function focusInModal() {
  if (modalState.mode !== "form") return;
  setTimeout(() => $("#modalContent input")?.focus({ preventScroll: true }), reduceMotion ? 0 : 450);
}

function closeModal() {
  const modal = $("#modal");
  if (modal.hidden || modal.classList.contains("is-closing")) return;
  modal.classList.remove("is-open");
  modal.classList.add("is-closing");
  modalState.closeTimer = setTimeout(
    () => {
      modal.hidden = true;
      modal.classList.remove("is-closing");
      modalState.globe?.destroy();
      modalState.globe = null;
      modalState.mode = null;
      $("#modalContent").innerHTML = "";
      lockScroll(false);
      if (modalState.opener?.isConnected) modalState.opener.focus({ preventScroll: true });
    },
    reduceMotion ? 0 : 520
  );
}

function requestClose() {
  if (modalState.mode === "form" && modalState.dirty && Date.now() > closeArmedUntil) {
    closeArmedUntil = Date.now() + 3500;
    const panel = $(".modal__panel");
    panel.classList.remove("is-shake");
    void panel.offsetWidth;
    panel.classList.add("is-shake");
    toast({ msg: "Modifications non enregistrées. Refermez à nouveau pour les abandonner.", type: "error", duration: 3500 });
    return;
  }
  closeModal();
}

function trapFocus(e) {
  const panel = $(".modal__panel");
  const items = $$(
    'button:not([disabled]), [href], input:not([disabled]), select, textarea, summary, [tabindex]:not([tabindex="-1"])',
    panel
  ).filter((el) => el.offsetParent !== null);
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

/* ---------- Détail ---------- */

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

function renderDetail(doc) {
  const s = summarize(doc);
  let n = 0;
  const tile = ({ label, ico, value, unit, digits = 1, extra = "", cls = "" }) => `
    <div class="tile ${cls}" style="--i:${n++}">
      <div class="tile__label">${ico}${label}</div>
      <div class="tile__value">${
        value == null ? '<span class="tile__na">—</span>' : `<span data-count="${value}" data-digits="${digits}">${fmtNum(0, digits)}</span><small>${unit}</small>`
      }</div>
      ${extra}
    </div>`;
  const meter = (v) => `<div class="meter" aria-hidden="true"><span style="--v:${clamp(v, 0.02, 1).toFixed(3)}"></span></div>`;
  const rh = relativeHumidity(s.temp, s.dew);

  return (root) => {
    modalState.mode = "detail";
    root.innerHTML = `
    <article class="detail">
      <header class="detail__hero">
        <div class="detail__globe"><canvas aria-hidden="true"></canvas></div>
        <div>
          <p class="eyebrow">${icon.leaf} ${esc(TYPE_LABELS[s.type] ?? "Relevé météo")}</p>
          <h2 class="detail__title" id="modalTitle">${splitTitle(s.call)}</h2>
          <p class="detail__st"><code>${esc(s.st || "station inconnue")}</code></p>
          <div class="chips">
            <span class="chip chip--green">${esc(s.type || "N/A")}</span>
            <span class="chip">${esc(fmtDate(s.ts))}</span>
            <span class="chip">${esc(fmtCoords(s.lat, s.lng))}</span>
          </div>
          <div class="detail__actions">
            <button class="btn btn--primary magnetic" type="button" data-edit="${esc(s.id)}">${icon.edit}${roll("Modifier")}</button>
            <button class="btn btn--danger magnetic" type="button" data-delete="${esc(s.id)}">${icon.trash}${roll("Supprimer")}</button>
          </div>
        </div>
      </header>
      <div class="detail__body">
        <section class="tiles" aria-label="Mesures">
          ${tile({ label: "Température", ico: icon.thermo, value: s.temp, unit: "°C", extra: s.temp == null ? "" : meter(heatOf(s.temp)) })}
          ${tile({ label: "Point de rosée", ico: icon.drop, value: s.dew, unit: "°C" })}
          ${tile({ label: "Humidité", ico: icon.humidity, value: rh, unit: "%", digits: 0, extra: rh == null ? "" : meter(rh / 100) })}
          ${tile({ label: "Pression", ico: icon.gauge, value: s.pressure, unit: "hPa", extra: s.pressure == null ? "" : meter((s.pressure - 950) / 100) })}
          <div class="tile" style="--i:${n++}">
            <div class="tile__label">${icon.wind}Vent</div>
            <div class="tile__value">${
              s.windSpeed == null ? '<span class="tile__na">—</span>' : `<span data-count="${s.windSpeed}" data-digits="1">0</span><small>m/s</small>`
            }</div>
            <div class="tile__sub">${s.windAngle == null ? "Direction inconnue" : `${s.windAngle}° · ${cardinal(s.windAngle)}`}</div>
            <div class="compass" style="--a:${s.windAngle ?? 0}deg" ${s.windAngle == null ? "data-na" : ""} aria-hidden="true">
              <span class="compass__needle"></span><span class="compass__n">N</span>
            </div>
          </div>
          ${tile({ label: "Visibilité", ico: icon.eye, value: s.visibility == null ? null : s.visibility / 1000, unit: "km" })}
          ${tile({ label: "Plafond nuageux", ico: icon.cloud, value: s.ceiling, unit: "m", digits: 0 })}
          ${tile({ label: "Altitude", ico: icon.mountain, value: s.elevation, unit: "m", digits: 0 })}
        </section>
        <details class="raw">
          <summary>${icon.code} Document brut <span class="raw__hint">JSON · ${Object.keys(doc).length} champs</span><span class="raw__chev">${icon.chevronR}</span></summary>
          <div class="raw__body">
            <button class="btn btn--ghost btn--sm raw__copy" type="button" data-copy="${esc(s.id)}">${icon.copy}${roll("Copier")}</button>
            <pre><code>${highlightJSON(doc)}</code></pre>
          </div>
        </details>
      </div>
    </article>`;

    const globe = new Globe($(".detail__globe canvas", root), { dots: 1100, speed: 0, radius: 0.42, rot: Math.random() * TAU });
    modalState.globe = globe;
    if (s.lat != null) {
      globe.focus = [s.lat * DEG, s.lng * DEG];
      setTimeout(() => modalState.globe === globe && globe.spinTo(s.lat, s.lng), reduceMotion ? 0 : 300);
    }
    $$("[data-count]", root).forEach((el) => countUp(el));
    requestAnimationFrame(() => $$(".compass", root).forEach((c) => c.classList.add("is-on")));
  };
}

/* ---------- Formulaire ---------- */

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
  ].join(" ");
  return `
    <div class="field" data-hint="${esc(hint)}">
      <div class="field__box">
        <input id="${id}" name="${name}" type="${type}" value="${esc(value ?? "")}" placeholder=" " autocomplete="off" aria-describedby="${id}-msg" ${attrs} />
        <label for="${id}">${esc(label)}${required ? '<i class="req" aria-hidden="true"></i>' : ""}</label>
      </div>
      <span class="field__msg" id="${id}-msg">${esc(hint)}</span>
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
    modalState.mode = "form";
    root.innerHTML = `
    <form class="form" novalidate>
      <header>
        <p class="eyebrow">${icon.leaf} ${isEdit ? "Modifier le relevé" : "Nouveau relevé"}</p>
        <h2 class="form__title" id="modalTitle">${isEdit ? esc(s.call) : "Créer un relevé"}</h2>
        <p class="form__sub">Les champs marqués d'un point vert sont obligatoires. Une mesure laissée vide est enregistrée comme « non mesurée », comme dans le dataset officiel.</p>
      </header>

      <div class="form__group" style="--i:0">
        <h3>Identité</h3>
        <div class="form__grid">
          ${field({ name: "callLetters", label: "Indicatif", value: s && s.call !== "—" ? s.call : "", hint: "Ex. VCSZ", maxlength: 12 })}
          ${field({ name: "st", label: "Identifiant station", value: s?.st, required: true, hint: "Ex. x+47600-047900" })}
          ${field({ name: "type", label: "Type de relevé", value: s?.type, list: "typeList", hint: "Ex. FM-13 (navire), FM-15 (aéroport)" })}
          ${field({ name: "ts", label: "Date et heure (UTC)", type: "datetime-local", value: toInputDate(s?.ts ?? new Date()), required: true })}
        </div>
        <datalist id="typeList">${Object.entries(TYPE_LABELS)
          .map(([k, v]) => `<option value="${k}">${v}</option>`)
          .join("")}</datalist>
      </div>

      <div class="form__group" style="--i:1">
        <h3>Position</h3>
        <div class="picker" data-picker ${s?.lat == null ? "data-empty" : ""} aria-hidden="true">
          <span class="picker__dot"></span>
          <span class="picker__hint">Cliquez sur la carte pour placer la station</span>
          <span class="picker__readout"></span>
        </div>
        <div class="form__grid form__grid--3">
          ${field({ name: "lat", label: "Latitude", type: "number", value: inputValue(s?.lat), required: true, min: -90, max: 90, step: "any", hint: "−90 à 90" })}
          ${field({ name: "lng", label: "Longitude", type: "number", value: inputValue(s?.lng), required: true, min: -180, max: 180, step: "any", hint: "−180 à 180" })}
          ${field({ name: "elevation", label: "Altitude (m)", type: "number", value: inputValue(s?.elevation), step: "any" })}
        </div>
      </div>

      <div class="form__group" style="--i:2">
        <h3>Mesures</h3>
        <div class="form__grid form__grid--3">
          ${field({ name: "temp", label: "Température (°C)", type: "number", value: inputValue(s?.temp), step: "any" })}
          ${field({ name: "dew", label: "Point de rosée (°C)", type: "number", value: inputValue(s?.dew), step: "any" })}
          ${field({ name: "pressure", label: "Pression (hPa)", type: "number", value: inputValue(s?.pressure), step: "any" })}
          ${field({ name: "windAngle", label: "Direction du vent (°)", type: "number", value: inputValue(s?.windAngle), step: "any", hint: "0 = Nord, 90 = Est" })}
          ${field({ name: "windSpeed", label: "Vitesse du vent (m/s)", type: "number", value: inputValue(s?.windSpeed), step: "any" })}
        </div>
      </div>

      <footer class="form__actions">
        <button class="btn btn--ghost" type="button" ${isEdit ? `data-open="${esc(s.id)}"` : "data-close"}>${roll("Annuler")}</button>
        <button class="btn btn--primary magnetic" type="submit">${icon.check}${roll(isEdit ? "Enregistrer" : "Créer le relevé")}</button>
      </footer>
    </form>`;

    const form = $("form", root);
    const picker = $("[data-picker]", form);
    const readout = $(".picker__readout", picker);
    const latInput = form.elements.lat;
    const lngInput = form.elements.lng;

    const syncPicker = () => {
      const lat = Number(latInput.value);
      const lng = Number(lngInput.value);
      if (latInput.value === "" || lngInput.value === "" || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
      picker.removeAttribute("data-empty");
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
    picker.addEventListener("click", (e) => {
      const { lat, lng } = pointToCoords(e);
      latInput.value = lat;
      lngInput.value = lng;
      validateField(latInput);
      validateField(lngInput);
      modalState.dirty = true;
      syncPicker();
    });

    form.addEventListener("input", (e) => {
      modalState.dirty = true;
      if (e.target === latInput || e.target === lngInput) syncPicker();
      if (e.target.closest(".field")?.classList.contains("has-error")) validateField(e.target);
    });
    form.addEventListener("focusout", (e) => {
      if (e.target.matches("input") && e.target.value !== "") validateField(e.target);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const inputs = $$("input[name]", form);
      const ok = inputs.map(validateField).every(Boolean);
      if (!ok) {
        const firstInvalid = inputs.find((i) => i.getAttribute("aria-invalid") === "true");
        firstInvalid?.focus();
        firstInvalid?.scrollIntoView({ behavior: smooth(), block: "center" });
        return;
      }

      const btn = $('[type="submit"]', form);
      btn.classList.add("is-loading");
      btn.disabled = true;
      try {
        const values = readForm(form);
        const saved = isEdit ? await api.update(s.id, toUpdatePayload(values)) : await api.create(toCreatePayload(values));
        cache.set(String(saved._id), saved);
        remember([saved]);
        modalState.dirty = false;
        if (isEdit) {
          patchCards(saved);
          if (featuredId === s.id) renderHero(saved);
          openModal(renderDetail(saved));
          toast({ msg: `Relevé « ${saved.callLetters || "sans indicatif"} » mis à jour.` });
        } else {
          closeModal();
          toast({
            msg: `Relevé « ${saved.callLetters || "sans indicatif"} » créé.`,
            action: { label: "Voir", run: () => openModal(renderDetail(saved)) },
          });
          refreshAfterCreate();
        }
      } catch (err) {
        toast({ msg: err.message, type: "error" });
      } finally {
        btn.classList.remove("is-loading");
        btn.disabled = false;
      }
    });
  };
}

function refreshAfterCreate() {
  const recent = $("#row-recent [data-track]");
  recent?._reload?.();
  explore.load();
}

/* ---------- Suppression avec annulation ---------- */

function scheduleDelete(id) {
  const doc = cache.get(id);
  if (!doc || pendingDeletes.has(id)) return;
  const name = doc.callLetters || "sans indicatif";
  closeModal();

  const els = cardsFor(id);
  els.forEach((el) => el.classList.add("is-removing"));
  const hideTimer = setTimeout(() => els.forEach((el) => (el.hidden = true)), reduceMotion ? 0 : 450);

  const restore = () => {
    clearTimeout(hideTimer);
    els.forEach((el) => {
      el.hidden = false;
      el.classList.remove("is-removing");
    });
  };

  pendingDeletes.set(id, true);
  remember([]);

  toast({
    msg: `« ${name} » supprimé.`,
    type: "delete",
    duration: 6000,
    action: {
      label: "Annuler",
      run: () => {
        pendingDeletes.delete(id);
        restore();
        remember([]);
        toast({ msg: "Suppression annulée." });
      },
    },
    onExpire: async () => {
      try {
        await api.remove(id);
        pendingDeletes.delete(id);
        cache.delete(id);
        els.forEach((el) => el.remove());
        explore.total = Math.max(0, explore.total - 1);
        explore.renderMeta();
        if (featuredId === id) shuffleHero();
      } catch (err) {
        pendingDeletes.delete(id);
        restore();
        toast({ msg: `Suppression impossible : ${err.message}`, type: "error" });
      }
    },
  });
}

addEventListener("pagehide", () => {
  for (const id of pendingDeletes.keys()) api.remove(id, { keepalive: true }).catch(() => {});
});

/* =========================================================
   Toasts
   ========================================================= */

function toast({ msg, type = "success", action, duration = 4200, onExpire }) {
  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.setAttribute("role", type === "error" ? "alert" : "status");
  el.style.setProperty("--d", `${duration}ms`);
  const ico = type === "error" ? icon.alert : type === "delete" ? icon.trash : icon.check;
  el.innerHTML = `
    <span class="toast__icon">${ico}</span>
    <p class="toast__msg">${esc(msg)}</p>
    ${action ? `<button class="toast__action" type="button">${roll(action.label)}</button>` : ""}
    <button class="toast__close" type="button" aria-label="Fermer la notification">${icon.close}</button>
    <span class="toast__bar" aria-hidden="true"></span>`;
  $("#toasts").append(el);

  let remaining = duration;
  let startedAt = Date.now();
  let timer = null;
  let settled = false;

  const dismiss = (expired) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    if (expired) onExpire?.();
    el.classList.add("is-leaving");
    setTimeout(() => el.remove(), reduceMotion ? 0 : 360);
  };
  const arm = () => {
    startedAt = Date.now();
    timer = setTimeout(() => dismiss(true), remaining);
  };

  el.addEventListener("pointerenter", () => {
    clearTimeout(timer);
    remaining -= Date.now() - startedAt;
  });
  el.addEventListener("pointerleave", arm);
  $(".toast__close", el).addEventListener("click", () => dismiss(true));
  if (action) {
    $(".toast__action", el).addEventListener("click", () => {
      settled = true;
      clearTimeout(timer);
      el.classList.add("is-leaving");
      setTimeout(() => el.remove(), reduceMotion ? 0 : 360);
      action.run();
    });
  }
  arm();
}

/* =========================================================
   Interactions globales
   ========================================================= */

document.addEventListener(
  "pointerdown",
  (e) => {
    keyboardMode = false;
    lastPointer = { x: e.clientX, y: e.clientY };
  },
  { capture: true, passive: true }
);

document.addEventListener("click", async (e) => {
  const t = e.target.closest(
    "[data-open],[data-edit],[data-delete],[data-close],[data-retry],[data-explore-sort],[data-sort],[data-page],[data-copy],[data-new],[data-clear-search],[data-shuffle],[data-dir],.card[data-id]"
  );
  if (!t) return;

  if (t.matches("[data-dir]")) {
    const track = t.parentElement.querySelector("[data-track]");
    track.scrollBy({ left: Number(t.dataset.dir) * track.clientWidth * 0.85, behavior: smooth() });
  } else if (t.matches("[data-close]")) {
    requestClose();
  } else if (t.matches("[data-new]")) {
    openModal(renderForm());
  } else if (t.matches("[data-shuffle]")) {
    shuffleHero();
  } else if (t.matches("[data-retry]")) {
    t.closest("[data-reloadable]")?._reload?.();
  } else if (t.matches("[data-explore-sort]")) {
    explore.setSort(t.dataset.exploreSort);
    $("#explore").scrollIntoView({ behavior: smooth(), block: "start" });
  } else if (t.matches("[data-sort]")) {
    explore.setSort(t.dataset.sort);
  } else if (t.matches("[data-page]")) {
    explore.go(Number(t.dataset.page));
  } else if (t.matches("[data-clear-search]")) {
    $("#searchInput").value = "";
    explore.search("");
  } else if (t.matches("[data-copy]")) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(cache.get(t.dataset.copy), null, 2));
      toast({ msg: "Document copié dans le presse-papiers." });
    } catch {
      toast({ msg: "Copie impossible dans ce navigateur.", type: "error" });
    }
  } else if (t.matches("[data-delete]")) {
    scheduleDelete(t.dataset.delete);
  } else {
    const id = t.dataset.open ?? t.dataset.edit ?? t.dataset.id;
    let doc = cache.get(id);
    if (!doc) {
      try {
        doc = await api.get(id);
        cache.set(id, doc);
      } catch (err) {
        toast({ msg: err.message, type: "error" });
        return;
      }
    }
    openModal(t.matches("[data-edit]") ? renderForm(doc) : renderDetail(doc));
  }
});

document.addEventListener("keydown", (e) => {
  keyboardMode = true;
  const modalOpen = !$("#modal").hidden;
  if (modalOpen) {
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

document.addEventListener(
  "scroll",
  (e) => {
    if (e.target instanceof Element && e.target.matches("[data-track]")) updateArrows(e.target);
  },
  { capture: true, passive: true }
);

document.addEventListener("pointerover", (e) => {
  const card = e.target.closest?.(".card[data-id]");
  if (card && !card.contains(e.relatedTarget)) scramble($("[data-scramble]", card));
});

/* Projecteur + boutons magnétiques + lueur du curseur */
function setupPointerFx() {
  if (!finePointer) return;
  const glow = $("#cursorGlow");
  let magnet = null;
  let gx = innerWidth / 2;
  let gy = innerHeight / 3;
  let tx = gx;
  let ty = gy;
  let glowRaf = null;

  const glowLoop = () => {
    gx += (tx - gx) * 0.12;
    gy += (ty - gy) * 0.12;
    glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
    glowRaf = Math.abs(tx - gx) + Math.abs(ty - gy) > 0.5 ? requestAnimationFrame(glowLoop) : null;
  };

  let magnetBase = null;
  const releaseMagnet = () => {
    if (!magnet) return;
    magnet.style.transform = "";
    magnet = null;
    magnetBase = null;
  };
  addEventListener("scroll", releaseMagnet, { passive: true });

  document.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;

      const spot = e.target.closest?.(".card, .btn, .tile, .pager button, .picker");
      if (spot) {
        const r = spot.getBoundingClientRect();
        spot.style.setProperty("--mx", `${e.clientX - r.left}px`);
        spot.style.setProperty("--my", `${e.clientY - r.top}px`);
      }

      if (!reduceMotion) {
        const mag = e.target.closest?.(".magnetic");
        if (mag !== magnet) releaseMagnet();
        if (mag) {
          if (mag !== magnet) {
            magnet = mag;
            const r = mag.getBoundingClientRect();
            magnetBase = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          }
          const mx = (e.clientX - magnetBase.x) * 0.22;
          const my = (e.clientY - magnetBase.y) * 0.32;
          mag.style.transform = `translate(${mx}px, ${my}px)`;
        }

        tx = e.clientX;
        ty = e.clientY;
        glow.classList.add("is-on");
        if (!glowRaf) glowRaf = requestAnimationFrame(glowLoop);
      }
    },
    { passive: true }
  );

  document.addEventListener("pointerout", (e) => {
    if (magnet && !magnet.contains(e.relatedTarget)) releaseMagnet();
    if (!e.relatedTarget) glow.classList.remove("is-on");
  });
}

/* Navigation : fond au scroll, pilule de survol, section active */
function setupNav() {
  const nav = $("#nav");
  const links = $("#navLinks");
  const pill = $(".nav__pill", links);
  const wrap = $("#heroGlobeWrap");
  let active = null;
  let ticking = false;

  addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        nav.classList.toggle("is-solid", scrollY > 24);
        if (!reduceMotion) wrap.style.setProperty("--sy", `${Math.min(scrollY, 1000) * 0.3}px`);
      });
    },
    { passive: true }
  );

  $$("a", links).forEach((a) => a.addEventListener("pointerenter", () => movePill(pill, a)));
  links.addEventListener("pointerleave", () => movePill(pill, active));

  const sections = ["top", "top10", "rows", "explore"].map((id) => document.getElementById(id)).filter(Boolean);
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        $$("a", links).forEach((a) => a.removeAttribute("aria-current"));
        active = $(`a[data-section="${entry.target.id}"]`, links);
        active?.setAttribute("aria-current", "true");
        if (!links.matches(":hover")) movePill(pill, active);
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((s) => io.observe(s));
}

const revealIO = new IntersectionObserver(
  (entries) =>
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      revealIO.unobserve(entry.target);
    }),
  { rootMargin: "0px 0px -8% 0px" }
);

function intro() {
  const el = $("#intro");
  if (reduceMotion || sessionStorage.getItem("mongoflix-intro")) {
    el.remove();
    return;
  }
  sessionStorage.setItem("mongoflix-intro", "1");
  document.documentElement.classList.add("is-intro");
  const done = () => {
    el.classList.add("is-done");
    document.documentElement.classList.remove("is-intro");
    setTimeout(() => el.remove(), 800);
  };
  const timer = setTimeout(done, 2300);
  el.addEventListener(
    "click",
    () => {
      clearTimeout(timer);
      done();
    },
    { once: true }
  );
}

/* =========================================================
   Démarrage
   ========================================================= */

async function init() {
  intro();
  $$("[data-roll]").forEach((el) => (el.outerHTML = roll(el.textContent.trim())));

  heroGlobe = new Globe($("#heroGlobe"), { interactive: true, dots: 1800, radius: 0.4 });

  $("#rows").innerHTML = ROWS.map(rowShell).join("");
  $$(".reveal, .reveal-group").forEach((el) => revealIO.observe(el));

  setupPointerFx();
  setupNav();
  explore.renderSeg();
  document.fonts?.ready.then(() => explore.renderSeg());
  addEventListener("resize", debounce(() => explore.renderSeg(), 150));

  const onSearch = debounce((value) => {
    explore.search(value);
    const rect = $("#explore").getBoundingClientRect();
    if (value.trim() && (rect.top > innerHeight * 0.6 || rect.bottom < 0)) {
      $("#explore").scrollIntoView({ behavior: smooth(), block: "start" });
    }
  }, 320);
  $("#searchInput").addEventListener("input", (e) => onSearch(e.target.value));

  const top = loadRow($("#top10Track"), "-temp", { limit: 10, poster: true });
  ROWS.forEach((r) => loadRow($(`#row-${r.id} [data-track]`), r.sort));
  explore.load();

  const hot = await top;
  if (hot.length) {
    renderHero(hot[(Math.random() * Math.min(hot.length, 5)) | 0]);
  } else {
    $("#hero").innerHTML = errorBlock("Le relevé à la une n'a pas pu être chargé. Vérifiez la connexion à MongoDB.");
    $("#hero")._reload = () => location.reload();
    $("#hero").setAttribute("data-reloadable", "");
  }
}

init();
