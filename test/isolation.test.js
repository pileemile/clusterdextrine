const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { once } = require("node:events");
const { setTimeout: sleep } = require("node:timers/promises");
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/index");
const Weather = require("../src/models/Weather");
const AbAssignment = require("../src/models/AbAssignment");
const { startDb, stopDb } = require("./helpers");

const READER = "00000000-0000-4000-8000-000000000001";

test.before(startDb);
test.after(stopDb);

function as(slug) {
  return { "X-Tenant": slug, Cookie: `ciel_lecteur=${READER}` };
}

function post(slug, body) {
  return request(app).post("/api/weather").set(as(slug)).send(body);
}

// Lecture directe par le driver, sans passer par le plugin.
function rawDoc(id) {
  return mongoose.connection.collection("data").findOne({ _id: new mongoose.Types.ObjectId(id) });
}

function openStream(port, slug) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}/api/weather/events?tenant=${slug}`, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`SSE ${slug} : ${res.statusCode}`));
      const stream = { req, text: "" };
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        stream.text += chunk;
        if (stream.text.includes("event: ready")) resolve(stream);
      });
    });
    req.on("error", reject);
  });
}

test("le middleware refuse un tenant absent, mal formé ou inconnu", async () => {
  let res = await request(app).get("/api/weather");
  assert.equal(res.status, 400);
  assert.deepEqual(res.body, { error: "Tenant invalide" });

  res = await request(app).get("/api/weather").set("X-Tenant", "../x");
  assert.equal(res.status, 400);

  res = await request(app).get("/api/weather").set("X-Tenant", "observatoire-z");
  assert.equal(res.status, 404);
  assert.deepEqual(res.body, { error: "Tenant introuvable" });

  res = await request(app).get("/api/weather").set("X-Tenant", "observatoire-a");
  assert.equal(res.status, 200);
});

test("un relevé créé dans A n'apparaît pas dans la liste de B", async () => {
  assert.equal((await post("observatoire-a", { st: "LISTE-A", ts: "2026-11-16T08:00:00.000Z" })).status, 201);

  const inA = await request(app).get("/api/weather?st=LISTE-A").set(as("observatoire-a"));
  const inB = await request(app).get("/api/weather?st=LISTE-A").set(as("observatoire-b"));
  assert.equal(inA.body.total, 1);
  assert.equal(inB.body.total, 0);
});

test("depuis B, GET, PUT, DELETE et PDF sur le relevé de A répondent 404 et ne changent rien", async () => {
  const { body } = await post("observatoire-a", { st: "CROISE-A", ts: "2026-11-16T08:30:00.000Z" });
  const id = body._id;
  assert.equal((await request(app).get(`/api/weather/${id}`).set(as("observatoire-a"))).status, 200);

  const b = as("observatoire-b");
  assert.equal((await request(app).get(`/api/weather/${id}`).set(b)).status, 404);
  assert.equal((await request(app).put(`/api/weather/${id}`).set(b).send({ st: "PIRATE" })).status, 404);
  assert.equal((await request(app).delete(`/api/weather/${id}`).set(b)).status, 404);
  assert.equal((await request(app).get(`/api/weather/${id}/releve.pdf`).set(b)).status, 404);

  const doc = await rawDoc(id);
  assert.ok(doc, "le relevé de A existe toujours");
  assert.equal(doc.st, "CROISE-A");
});

test("mêmes st et ts acceptés dans A et B, mais un doublon dans A reçoit 409", async () => {
  const reading = { st: "DOUBLON", ts: "2026-11-16T09:00:00.000Z" };
  assert.equal((await post("observatoire-a", reading)).status, 201);
  assert.equal((await post("observatoire-b", reading)).status, 201);
  assert.equal((await post("observatoire-a", reading)).status, 409);
});

test("SSE : un client sur B ne reçoit rien quand A crée un relevé", async () => {
  const server = app.listen(0);
  await once(server, "listening");
  const { port } = server.address();
  const streams = [];
  try {
    const a = await openStream(port, "observatoire-a");
    const b = await openStream(port, "observatoire-b");
    streams.push(a, b);

    await post("observatoire-a", { st: "SSE-A", ts: "2026-11-16T10:00:00.000Z" }).expect(201);
    await sleep(100);

    assert.match(a.text, /event: weather-updated/);
    assert.doesNotMatch(b.text, /event: weather-updated/);
  } finally {
    streams.forEach((s) => s.req.destroy());
    server.close();
  }
});

test("une requête exécutée hors contexte de tenant lève une erreur", async () => {
  await assert.rejects(Weather.find({}).exec());
  await assert.rejects(AbAssignment.countDocuments({}).exec());
});
