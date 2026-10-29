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
    return { created: true, place: next };
  }

  function remove(id) {
    write(read().filter((item) => item.id !== id));
  }

  return { list: read, find, save, remove };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CielPlaces;
}
