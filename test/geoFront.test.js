const test = require("node:test");
const assert = require("node:assert/strict");
const geo = require("../public/geo.js");

function fakeEnv({ secure = true, code, position } = {}) {
  return {
    secure,
    geolocation: {
      getCurrentPosition(ok, fail, options) {
        fakeEnv.lastOptions = options;
        if (code) fail({ code });
        else ok({ coords: position });
      },
    },
  };
}

test("un refus, un délai et une page non sécurisée ont chacun leur phrase", async () => {
  await assert.rejects(geo.getPosition(fakeEnv({ code: 1 })), (err) => err.reason === "denied" && err.message === geo.MESSAGES.denied);
  await assert.rejects(geo.getPosition(fakeEnv({ code: 2 })), (err) => err.reason === "unavailable");
  await assert.rejects(geo.getPosition(fakeEnv({ code: 3 })), (err) => err.reason === "timeout");
  let called = false;
  await assert.rejects(
    geo.getPosition({
      secure: false,
      geolocation: { getCurrentPosition() { called = true; } },
    }),
    (err) => err.reason === "insecure"
  );
  assert.equal(called, false);
  assert.equal(geo.POSITION_OPTIONS.enableHighAccuracy, false);
  assert.equal(geo.POSITION_OPTIONS.timeout, 10000);
  assert.equal(geo.POSITION_OPTIONS.maximumAge, 300000);
});

test("les paramètres sont arrondis à 3 décimales et nommés lat, lon, radiusKm", () => {
  const params = geo.nearbyParams(45.75764, 4.83174, 5, 0, 6);
  assert.equal(params.get("lat"), "45.758");
  assert.equal(params.get("lon"), "4.832");
  assert.equal(params.get("radiusKm"), "5");
  assert.equal(params.get("page"), "0");
  assert.equal(params.get("size"), "6");
});

test("mètres sous 1 km, kilomètres ensuite", () => {
  assert.equal(geo.formatDistance(0.3), "300 m");
  assert.equal(geo.formatDistance(1.2), "1,2 km");
});

test("le géocodeur lit [lon, lat] et le cache ignore casse et espaces", async () => {
  geo.clearGeocodeCache();
  let calls = 0;
  const fetchFn = async () => {
    calls += 1;
    return {
      status: 200,
      json: async () => ({
        features: [
          {
            geometry: { coordinates: [4.835685, 45.763721] },
            properties: { label: "69002 Lyon", score: 0.75 },
          },
        ],
      }),
    };
  };
  const first = await geo.geocode("69002", fetchFn);
  const second = await geo.geocode("  69002 ", fetchFn);
  assert.equal(calls, 1);
  assert.equal(first.lat, 45.763721);
  assert.equal(first.lon, 4.835685);
  assert.equal(second.label, first.label);
});

test("un score trop bas et un 429 ont leur phrase", async () => {
  geo.clearGeocodeCache();
  await assert.rejects(
    geo.geocode("mairie", async () => ({
      status: 200,
      json: async () => ({ features: [{ geometry: { coordinates: [1, 2] }, properties: { score: 0.39, label: "ailleurs" } }] }),
    })),
    (err) => err.reason === "not-found"
  );
  geo.clearGeocodeCache();
  await assert.rejects(
    geo.geocode("69002", async () => ({ status: 429, json: async () => ({}) })),
    (err) => err.reason === "busy"
  );
});
