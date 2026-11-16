const Weather = require("../models/Weather");
const { around, haversineKm, roundKm } = require("./distance");

const DEFAULT_RADIUS_KM = 5;
const MAX_RADIUS_KM = 20;

class NearbyError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

function bad(message) {
  return new NearbyError(message);
}

function readNumber(raw, name) {
  const text = String(raw).trim();
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(text) && !/^[+-]?(?:NaN|Infinity)$/.test(text)) {
    throw bad(`Paramètre invalide : ${name}.`);
  }
  return Number(text);
}

function parseNearby(query) {
  const latRaw = query.lat;
  const lonRaw = query.lon;
  if (latRaw === undefined || latRaw === "" || lonRaw === undefined || lonRaw === "") {
    throw bad("Indiquez lat et lon ensemble.");
  }
  const lat = readNumber(latRaw, "lat");
  const lon = readNumber(lonRaw, "lon");
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw bad("Latitude invalide : entre -90 et 90 degrés.");
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw bad("Longitude invalide : entre -180 et 180 degrés.");
  }
  const radiusKm =
    query.radiusKm === undefined || query.radiusKm === "" ? DEFAULT_RADIUS_KM : readNumber(query.radiusKm, "radiusKm");
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > MAX_RADIUS_KM) {
    throw bad("Rayon invalide : plus de 0 et au plus 20 km.");
  }
  const page = query.page === undefined || query.page === "" ? 0 : readNumber(query.page, "page");
  const size = query.size === undefined || query.size === "" ? 6 : readNumber(query.size, "size");
  if (!Number.isInteger(page) || page < 0) throw bad("Page invalide : entier supérieur ou égal à 0.");
  if (!Number.isInteger(size) || size < 1 || size > 50) throw bad("Taille invalide : entre 1 et 50.");
  return { lat, lon, radiusKm, page, size };
}

function stationPoint(doc) {
  const coordinates = doc.position?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const lon = coordinates[0];
  const lat = coordinates[1];
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function searchNearby(docs, query) {
  const rows = [];
  for (const doc of docs) {
    const point = stationPoint(doc);
    if (!point) continue;
    const exact = haversineKm(query.lat, query.lon, point.lat, point.lon);
    if (exact > query.radiusKm) continue;
    rows.push({
      id: String(doc._id),
      callLetters: doc.callLetters || "",
      st: doc.st || "",
      latitude: point.lat,
      longitude: point.lon,
      exact,
      ts: doc.ts,
    });
  }
  rows.sort(
    (a, b) => a.exact - b.exact || a.callLetters.localeCompare(b.callLetters, "fr") || a.id.localeCompare(b.id)
  );
  const start = query.page * query.size;
  const items = rows.slice(start, start + query.size).map((row) => ({
    id: row.id,
    callLetters: row.callLetters,
    st: row.st,
    latitude: row.latitude,
    longitude: row.longitude,
    distanceKm: roundKm(row.exact),
    ts: row.ts,
  }));
  return { items, page: query.page, size: query.size, total: rows.length };
}

function boxFilter(box) {
  const filter = {
    "position.coordinates.1": { $gte: box.minLat, $lte: box.maxLat },
  };
  if (box.wraps) {
    filter.$or = [
      { "position.coordinates.0": { $gte: box.minLon, $lte: 180 } },
      { "position.coordinates.0": { $gte: -180, $lte: box.maxLon } },
    ];
  } else {
    filter["position.coordinates.0"] = { $gte: box.minLon, $lte: box.maxLon };
  }
  return filter;
}

async function findInBox(box) {
  return Weather.find(boxFilter(box))
    .select({ callLetters: 1, st: 1, ts: 1, position: 1 })
    .lean();
}

async function nearbyResponse(query) {
  const parsed = parseNearby(query);
  const docs = await findInBox(around(parsed.lat, parsed.lon, parsed.radiusKm));
  return searchNearby(docs, parsed);
}

module.exports = {
  NearbyError,
  parseNearby,
  searchNearby,
  boxFilter,
  nearbyResponse,
};
