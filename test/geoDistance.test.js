const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const { haversineKm, roundKm, around } = require("../src/geo/distance");
const { parseNearby, searchNearby } = require("../src/geo/nearby");

test("Nashville vers Los Angeles, référence Rosetta Code", () => {
  const km = haversineKm(36.12, -86.67, 33.94, -118.4);
  assert.equal(Math.abs(km - 2886.444) < 0.001, true);
});

test("inverser lat et lon éloigne Bellecour d'elle-même", () => {
  const same = haversineKm(45.7576, 4.8317, 45.7576, 4.8317);
  const swapped = haversineKm(4.8317, 45.7576, 45.7576, 4.8317);
  assert.equal(same < 0.001, true);
  assert.equal(swapped > 1000, true);
});

test("l'arrondi au dixième ne sert pas au tri", () => {
  assert.equal(roundKm(2.26), 2.3);
  assert.equal(roundKm(2.34), 2.3);
});

test("la boîte de 5 km autour de Bellecour", () => {
  const box = around(45.7576, 4.8317, 5);
  assert.equal(Math.abs(box.maxLat - box.minLat - 0.09) < 0.001, true);
  assert.equal(Math.abs((box.maxLon - box.minLon) / 2 - 0.0644) < 0.001, true);
  assert.equal(box.wraps, false);
});

test("pôle et antiméridien", () => {
  const pole = around(90, 0, 5);
  assert.equal(pole.minLon, -180);
  assert.equal(pole.maxLon, 180);
  const edge = around(0, 179.9, 50);
  assert.equal(edge.wraps, true);
});

test("le coin de la boîte est écarté, le centre reste", () => {
  const box = around(45.7576, 4.8317, 5);
  const docs = [
    { _id: "coin", callLetters: "COIN", position: { coordinates: [box.maxLon, box.maxLat] } },
    { _id: "ici", callLetters: "ICI", position: { coordinates: [4.8317, 45.7576] } },
  ];
  const page = searchNearby(docs, { lat: 45.7576, lon: 4.8317, radiusKm: 5, page: 0, size: 6 });
  assert.equal(page.total, 1);
  assert.equal(page.items[0].id, "ici");
  assert.equal(page.items[0].distanceKm, 0);
});

test("refus du contrat", () => {
  const message = (query) => {
    try {
      parseNearby(query);
    } catch (err) {
      return err.message;
    }
    return "";
  };
  assert.equal(message({ lat: "45.75" }), "Indiquez lat et lon ensemble.");
  assert.equal(message({ lat: "95", lon: "4.8" }), "Latitude invalide : entre -90 et 90 degrés.");
  assert.equal(message({ lat: "abc", lon: "4.8" }), "Paramètre invalide : lat.");
  assert.equal(message({ lat: "NaN", lon: "4.8" }), "Latitude invalide : entre -90 et 90 degrés.");
  assert.equal(message({ lat: "45.75", lon: "4.8", radiusKm: "30" }), "Rayon invalide : plus de 0 et au plus 20 km.");
  const ok = parseNearby({ lat: "45.758", lon: "4.832" });
  assert.equal(ok.radiusKm, 5);
  assert.equal(ok.page, 0);
  assert.equal(ok.size, 6);
});

test("le tri est stable et la page ne mélange pas", () => {
  const docs = [
    { _id: "b", callLetters: "B", position: { coordinates: [4.85, 45.77] } },
    { _id: "a", callLetters: "A", position: { coordinates: [4.84, 45.76] } },
    { _id: "c", callLetters: "C", position: { coordinates: [4.9, 45.8] } },
  ];
  const query = { lat: 45.7576, lon: 4.8317, radiusKm: 20, page: 0, size: 1 };
  const first = searchNearby(docs, query);
  const second = searchNearby(docs, { ...query, page: 1 });
  assert.equal(first.items[0].id === second.items[0].id, false);
  assert.equal(first.total, 3);
});

test("le code geo n'écrit pas la position", () => {
  const distance = fs.readFileSync("src/geo/distance.js", "utf8");
  const nearby = fs.readFileSync("src/geo/nearby.js", "utf8");
  assert.equal(distance.includes("console."), false);
  assert.equal(nearby.includes("console."), false);
});
