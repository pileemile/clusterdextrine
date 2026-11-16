const $ = (sel, root = document) => root.querySelector(sel);
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const nf = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const df = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });

function coords(lat, lng) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "O";
  return `${nf.format(Math.abs(lat))}° ${ns}  ${nf.format(Math.abs(lng))}° ${ew}`;
}

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.innerHTML = `<p class="toast__msg">${esc(msg)}</p>`;
  $("#toasts").append(el);
  setTimeout(() => el.remove(), 3200);
}

function emptyBlock() {
  return `<div class="empty" role="status">
    <h3>Aucun lieu</h3>
    <p>Ajoute un lieu avec le formulaire, ou enregistre la position d'un relevé depuis la page d'accueil.</p>
  </div>`;
}

function card(place) {
  const when = place.savedAt ? df.format(new Date(place.savedAt)) : "";
  return `<article class="card card--place">
    <span class="card__top">
      <span class="tag">Lieu</span>
      <span class="card__date">${esc(when)}</span>
    </span>
    <span class="card__call">${esc(place.name)}</span>
    <span class="card__meta"><span>${esc(coords(place.lat, place.lng))}</span></span>
    ${place.st ? `<span class="card__meta"><span>${esc(place.st)}</span></span>` : ""}
    <button class="btn" type="button" data-remove="${esc(place.id)}">Retirer</button>
  </article>`;
}

function render() {
  const items = CielPlaces.list();
  $("#placeCount").textContent = items.length ? String(items.length) : "";
  const grid = $("#placeGrid");
  grid.className = items.length ? "grid" : "";
  grid.innerHTML = items.length ? items.map(card).join("") : emptyBlock();
}

function setFieldError(input, msg) {
  const wrap = input.closest(".field");
  wrap.classList.toggle("has-error", !!msg);
  input.setAttribute("aria-invalid", String(!!msg));
  $(".field__msg", wrap).textContent = msg || wrap.dataset.hint || "";
}

$("#placeForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const nameInput = form.elements.name;
  const latInput = form.elements.lat;
  const lngInput = form.elements.lng;
  const name = nameInput.value.trim();
  const lat = Number(latInput.value);
  const lng = Number(lngInput.value);
  const nameMsg = name ? "" : "Le nom est obligatoire.";
  const latMsg = latInput.value === "" || !Number.isFinite(lat) || lat < -90 || lat > 90 ? "Latitude entre -90 et 90." : "";
  const lngMsg = lngInput.value === "" || !Number.isFinite(lng) || lng < -180 || lng > 180 ? "Longitude entre -180 et 180." : "";
  setFieldError(nameInput, nameMsg);
  setFieldError(latInput, latMsg);
  setFieldError(lngInput, lngMsg);
  if (nameMsg || latMsg || lngMsg) return;

  const result = CielPlaces.save({ name, lat, lng });
  if (!result.created) {
    toast("Ce lieu est déjà enregistré.");
    return;
  }
  form.reset();
  setFieldError(nameInput, "");
  setFieldError(latInput, "");
  setFieldError(lngInput, "");
  render();
  toast("Lieu enregistré.");
});

const CITIES = [
  { name: "Amsterdam", lat: 52.37, lng: 4.9 },
  { name: "Londres", lat: 51.51, lng: -0.13 },
  { name: "Paris", lat: 48.86, lng: 2.35 },
  { name: "Brest", lat: 48.39, lng: -4.49 },
  { name: "Lisbonne", lat: 38.72, lng: -9.14 },
  { name: "Oslo", lat: 59.91, lng: 10.75 },
  { name: "Reykjavik", lat: 64.15, lng: -21.94 },
  { name: "Rome", lat: 41.9, lng: 12.5 },
  { name: "New York", lat: 40.71, lng: -74.0 },
  { name: "Tokyo", lat: 35.68, lng: 139.69 },
  { name: "Singapour", lat: 1.35, lng: 103.82 },
  { name: "Le Cap", lat: -33.92, lng: 18.42 },
];

const citySelect = $("#citySelect");
for (const city of CITIES) {
  const option = document.createElement("option");
  option.value = city.name;
  option.textContent = city.name;
  citySelect.append(option);
}

function cityByName(name) {
  return CITIES.find((city) => city.name === name) || null;
}

function readingTemp(doc) {
  const value = doc.airTemperature?.value;
  return typeof value === "number" && value < 999 ? `${nf.format(value)}°` : "Non mesuré";
}

function readingHref(doc) {
  const call = String(doc.callLetters || "").trim();
  const key = call.length >= 2 ? call : String(doc.st || "");
  return key ? `/?q=${encodeURIComponent(key)}` : "/";
}

function weatherCard(doc) {
  const call = doc.callLetters || doc.st || "Relevé";
  const when = doc.ts ? df.format(new Date(doc.ts)) : "";
  return `<a class="card" href="${esc(readingHref(doc))}">
    <span class="card__top"><span class="tag">En ligne</span><span class="card__date">${esc(when)}</span></span>
    <span class="card__call">${esc(call)}</span>
    <span class="card__temp">${esc(readingTemp(doc))}</span>
  </a>`;
}

async function showCity(city) {
  const box = $("#cityWeather");
  $("#saveCity").disabled = !city;
  if (!city) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  box.hidden = false;
  box.innerHTML = `<p class="section__sub">Chargement des relevés proches de ${esc(city.name)}…</p>`;
  try {
    const res = await fetch(`/api/weather?lat=${city.lat}&lng=${city.lng}&km=400&limit=6&sort=-ts`);
    if (!res.ok) throw new Error("chargement");
    const items = (await res.json()).data || [];
    if (!items.length) {
      box.innerHTML = `<p class="section__sub">Aucun relevé en ligne à proximité de ${esc(city.name)}.</p>`;
      return;
    }
    box.innerHTML = `<h3>Relevés proches de ${esc(city.name)}</h3><div class="grid">${items.map(weatherCard).join("")}</div>`;
  } catch {
    box.innerHTML = `<p class="section__sub">Impossible de charger les relevés.</p>`;
  }
}

citySelect.addEventListener("change", () => showCity(cityByName(citySelect.value)));

$("#saveCity").addEventListener("click", () => {
  const city = cityByName(citySelect.value);
  if (!city) return;
  const result = CielPlaces.save({ name: city.name, lat: city.lat, lng: city.lng });
  toast(result.created ? "Ville enregistrée." : "Cette ville est déjà dans tes lieux.");
  render();
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-remove]");
  if (!btn) return;
  CielPlaces.remove(btn.dataset.remove);
  render();
  toast("Lieu retiré.");
});

render();
