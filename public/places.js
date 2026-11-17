/* Lieux enregistrés sur cet appareil. */
var CielPlaces = (() => {
  const KEY = "ciel-places";

  function read() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(raw) ? raw.filter((item) => item && item.id && item.name) : [];
    } catch {
      return [];
    }
  }

  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
  }

  function ping(action, detail) {
    try {
      fetch("/api/logs", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, detail: String(detail || "").slice(0, 500) }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }

  function identity(place) {
    const st = String(place.st || "").trim();
    if (st) return `st:${st}`;
    const lat = Number(place.lat);
    const lng = Number(place.lng);
    const name = String(place.name || "").trim().toLowerCase();
    return `geo:${lat.toFixed(2)}:${lng.toFixed(2)}:${name}`;
  }

  function find(place) {
    const id = identity(place);
    return read().find((item) => identity(item) === id) || null;
  }

  function label(place) {
    const name = place?.name || "lieu";
    if (place?.st) return `${name} · ${place.st}`;
    if (place?.lat != null && place?.lng != null) return `${name} · ${place.lat}, ${place.lng}`;
    return name;
  }

  function save(place) {
    const existing = find(place);
    if (existing) return { created: false, place: existing };
    const next = {
      id: crypto.randomUUID(),
      name: String(place.name || "").trim(),
      st: String(place.st || "").trim(),
      lat: Number(place.lat),
      lng: Number(place.lng),
      savedAt: new Date().toISOString(),
    };
    const items = read();
    items.unshift(next);
    write(items);
    ping("lieu_ajoute", label(next));
    return { created: true, place: next };
  }

  function remove(id) {
    const items = read();
    const gone = items.find((item) => item.id === id);
    write(items.filter((item) => item.id !== id));
    if (gone) ping("lieu_retire", label(gone));
  }

  return { list: read, find, save, remove, ping };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CielPlaces;
}
