/**
 * Champs qu'un membre peut envoyer pour un relevé. Tout le reste (_id, owner,
 * tenantId, champs inventés, opérateurs $...) est ignoré.
 */

const MAX_TEXT = 60;

function text(v) {
  return typeof v === "string" && v.length <= MAX_TEXT ? v : undefined;
}

function number(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function date(v) {
  if (typeof v !== "string" && !(v instanceof Date)) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function coordinates(v) {
  if (!Array.isArray(v) || v.length !== 2) return undefined;
  const [lng, lat] = v;
  return number(lng) !== undefined && number(lat) !== undefined && Math.abs(lng) <= 180 && Math.abs(lat) <= 90
    ? [lng, lat]
    : undefined;
}

/** Données sans clé commençant par $ ni contenant un point, jusqu'à 4 niveaux. */
function plainData(v, depth = 0) {
  if (v === null || ["string", "number", "boolean"].includes(typeof v)) return true;
  if (depth > 4) return false;
  if (Array.isArray(v)) return v.length <= 50 && v.every((x) => plainData(x, depth + 1));
  if (typeof v !== "object") return false;
  return Object.entries(v).every(([k, x]) => !k.startsWith("$") && !k.includes(".") && plainData(x, depth + 1));
}

// Modification : exactement les chemins envoyés par toUpdatePayload (public/app.js).
const UPDATE_FIELDS = {
  st: text,
  ts: date,
  callLetters: text,
  type: text,
  "position.type": (v) => (v === "Point" ? v : undefined),
  "position.coordinates": coordinates,
  elevation: number,
  "airTemperature.value": number,
  "airTemperature.quality": text,
  "dewPoint.value": number,
  "dewPoint.quality": text,
  "pressure.value": number,
  "pressure.quality": text,
  "wind.direction.angle": number,
  "wind.direction.quality": text,
  "wind.speed.rate": number,
  "wind.speed.quality": text,
};

function pickUpdate(body) {
  const out = {};
  for (const [key, check] of Object.entries(UPDATE_FIELDS)) {
    if (body?.[key] === undefined) continue;
    const value = check(body[key]);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

// Création : les champs de toCreatePayload (public/app.js).
const CREATE_SIMPLE = { st: text, ts: date, callLetters: text, type: text, elevation: number, qualityControlProcess: text, dataSource: text };
const CREATE_NESTED = ["position", "airTemperature", "dewPoint", "pressure", "wind", "sections"];

function pickCreate(body) {
  const out = {};
  for (const [key, check] of Object.entries(CREATE_SIMPLE)) {
    if (body?.[key] === undefined) continue;
    const value = check(body[key]);
    if (value !== undefined) out[key] = value;
  }
  for (const key of CREATE_NESTED) {
    if (body?.[key] !== undefined && plainData(body[key])) out[key] = body[key];
  }
  return out;
}

module.exports = { pickUpdate, pickCreate };
