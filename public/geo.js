const CielGeo = (function () {
  const POSITION_OPTIONS = { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 };
  const GEOCODER_URL = "https://data.geopf.fr/geocodage/search";
  const MIN_SCORE = 0.5;
  const MESSAGES = {
    insecure: "La page n'est pas en HTTPS. Saisissez une adresse ou un code postal.",
    denied: "Localisation refusée. Saisissez une adresse ou un code postal.",
    unavailable: "Position introuvable pour le moment. Saisissez une adresse.",
    timeout: "La localisation prend trop de temps. Réessayez ou saisissez une adresse.",
    busy: "Le service d'adresses est occupé. Réessayez.",
    "not-found": "Adresse introuvable. Précisez la ville.",
  };
  const REASON_BY_CODE = { 1: "denied", 2: "unavailable", 3: "timeout" };
  const cache = new Map();

  class GeoError extends Error {
    constructor(reason) {
      super(MESSAGES[reason] || MESSAGES.unavailable);
      this.reason = reason;
    }
  }

  function roundCoord(value, decimals = 3) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  function nearbyParams(lat, lon, radiusKm = 5, page = 0, size = 6) {
    return new URLSearchParams({
      lat: String(roundCoord(lat)),
      lon: String(roundCoord(lon)),
      radiusKm: String(radiusKm),
      page: String(page),
      size: String(size),
    });
  }

  function formatDistance(km) {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;
  }

  function getPosition(env) {
    if (!env.secure) return Promise.reject(new GeoError("insecure"));
    if (!env.geolocation) return Promise.reject(new GeoError("unavailable"));
    return new Promise((resolve, reject) => {
      env.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            accuracyM: position.coords.accuracy,
          }),
        (error) => reject(new GeoError(REASON_BY_CODE[error.code] || "unavailable")),
        POSITION_OPTIONS
      );
    });
  }

  function cacheKey(query) {
    return query.trim().toLowerCase().replace(/\s+/g, " ");
  }

  async function geocode(query, fetchFn) {
    const key = cacheKey(query);
    if (!key) throw new GeoError("not-found");
    if (cache.has(key)) return cache.get(key);
    const params = new URLSearchParams({ q: query.trim(), limit: "1" });
    const response = await fetchFn(`${GEOCODER_URL}?${params}`);
    if (response.status === 429) throw new GeoError("busy");
    const feature = (await response.json()).features?.[0];
    if (!feature || feature.properties.score < MIN_SCORE) throw new GeoError("not-found");
    const [lon, lat] = feature.geometry.coordinates;
    const hit = { lat, lon, label: feature.properties.label, score: feature.properties.score };
    cache.set(key, hit);
    return hit;
  }

  function clearGeocodeCache() {
    cache.clear();
  }

  return {
    POSITION_OPTIONS,
    MESSAGES,
    GeoError,
    roundCoord,
    nearbyParams,
    formatDistance,
    getPosition,
    geocode,
    clearGeocodeCache,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CielGeo;
}
