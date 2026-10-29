const test = require("node:test");
const assert = require("node:assert/strict");

const store = new Map();
global.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const places = require("../public/places.js");

test("un lieu se retrouve, ne se duplique pas et se retire", () => {
  store.clear();
  const saved = places.save({ name: "Amsterdam", st: "PLAT", lat: 52.37, lng: 4.9 });
  assert.equal(saved.created, true);
  assert.equal(saved.place.name, "Amsterdam");
  assert.equal(places.list().length, 1);
  assert.equal(places.find({ st: "PLAT" }).id, saved.place.id);

  const again = places.save({ name: "Amsterdam port", st: "PLAT", lat: 52.37, lng: 4.9 });
  assert.equal(again.created, false);
  assert.equal(places.list().length, 1);

  const geo = places.save({ name: "Point", lat: 1, lng: 2 });
  assert.equal(geo.created, true);
  assert.equal(places.list().length, 2);
  places.remove(geo.place.id);
  assert.equal(places.find({ name: "Point", lat: 1, lng: 2 }), null);
  assert.equal(places.list().length, 1);
});

test("un nom vide n'est pas relu", () => {
  store.clear();
  places.save({ name: "   ", lat: 1, lng: 2 });
  assert.equal(places.list().length, 0);
});
