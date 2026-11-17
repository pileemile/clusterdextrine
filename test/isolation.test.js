const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { once } = require("node:events");
const { setTimeout: sleep } = require("node:timers/promises");
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/index");
const Weather = require("../src/models/Weather");
const User = require("../src/models/User");
const AbAssignment = require("../src/models/AbAssignment");
const { createSession } = require("../src/auth/session");
const { BOTH, ONLY_A, startDb, stopDb } = require("./helpers");

const READER = "00000000-0000-4000-8000-000000000001";
const sessions = {};

async function sessionCookie(email) {
  if (!sessions[email]) {
    const user = await User.findOne({ email });
    sessions[email] = `ciel_session=${await createSession(user._id)}`;
  }
  return sessions[email];
}

test.before(async () => {
  await startDb();
  await sessionCookie(BOTH);
  await sessionCookie(ONLY_A);
});
test.after(stopDb);

function as(slug) {
  return { "X-Tenant": slug, Cookie: `ciel_lecteur=${READER}; ${sessions[BOTH]}` };
}

function post(slug, body) {
  return request(app).post("/api/weather").set(as(slug)).send(body);
}

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

test("le middleware refuse un tenant absent, mal formé, inconnu, ou un non-membre (session)", async () => {
  assert.equal((await request(app).get("/api/weather")).status, 400);
  assert.equal((await request(app).get("/api/weather").set("X-Tenant", "../x")).status, 400);

  const unknown = await request(app).get("/api/weather").set("X-Tenant", "observatoire-z");
  assert.equal(unknown.status, 404);

  const notMember = await request(app).get("/api/weather").set({ "X-Tenant": "observatoire-b", Cookie: sessions[ONLY_A] });
  assert.equal(notMember.status, 404);
  assert.deepEqual(notMember.body, unknown.body);

  const member = await request(app).get("/api/weather").set({ "X-Tenant": "observatoire-a", Cookie: sessions[ONLY_A] });
  assert.equal(member.status, 200);
});

test("X-User est ignoré : il ne donne ni n'enlève aucun droit", async () => {
  const notMember = { "X-Tenant": "observatoire-b", Cookie: sessions[ONLY_A] };
  const withHeader = await request(app).get("/api/weather").set({ ...notMember, "X-User": BOTH });
  assert.equal(withHeader.status, 404, "X-User ne fait pas entrer un non-membre");

  const anonymousWrite = await request(app)
    .post("/api/weather")
    .set({ "X-Tenant": "observatoire-a", "X-User": BOTH })
    .send({ st: "XUSER", ts: "2026-11-16T07:00:00.000Z" });
  assert.equal(anonymousWrite.status, 401, "X-User ne remplace pas une session");
});

test("anonyme : lecture autorisée, écriture refusée (401)", async () => {
  const anon = { "X-Tenant": "observatoire-a" };
  assert.equal((await request(app).get("/api/weather").set(anon)).status, 200);
  assert.equal(
    (await request(app).post("/api/weather").set(anon).send({ st: "ANON", ts: "2026-11-16T07:30:00.000Z" })).status,
    401
  );

  const { body } = await post("observatoire-a", { st: "ANON-CIBLE", ts: "2026-11-16T07:45:00.000Z" });
  assert.equal((await request(app).put(`/api/weather/${body._id}`).set(anon).send({ st: "PIRATE" })).status, 401);
  assert.equal((await request(app).delete(`/api/weather/${body._id}`).set(anon)).status, 401);
  assert.equal((await rawDoc(body._id)).st, "ANON-CIBLE");
});

test("les routes admin refusent X-User et les utilisateurs ordinaires", async () => {
  assert.equal((await request(app).get("/api/admin/users").set("X-User", BOTH)).status, 401);
  const regular = await User.findOne({ email: BOTH });
  const regularSession = await createSession(regular._id);
  assert.equal(
    (await request(app).get("/api/admin/users").set("Cookie", `ciel_session=${regularSession}`)).status,
    403
  );
});

test("la liste des tenants ne montre que ceux de l'utilisateur", async () => {
  const slugs = async (headers) => (await request(app).get("/api/tenants").set(headers)).body.map((t) => t.slug);
  assert.deepEqual(await slugs({ Cookie: sessions[ONLY_A] }), ["observatoire-a"]);
  assert.deepEqual(await slugs({ Cookie: sessions[BOTH] }), ["observatoire-a", "observatoire-b"]);
  assert.deepEqual(await slugs({ "X-User": ONLY_A }), ["observatoire-a", "observatoire-b"]);
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

test("un relevé partagé, sans tenantId, se lit depuis A mais ne se modifie ni ne se supprime", async () => {
  const { insertedId } = await mongoose.connection.collection("data").insertOne({ st: "PARTAGE", ts: new Date() });
  const id = String(insertedId);
  const a = as("observatoire-a");

  assert.equal((await request(app).get(`/api/weather/${id}`).set(a)).status, 200);
  assert.equal((await request(app).put(`/api/weather/${id}`).set(a).send({ st: "MODIFIE" })).status, 404);
  assert.equal((await request(app).delete(`/api/weather/${id}`).set(a)).status, 404);
  assert.equal((await rawDoc(id)).st, "PARTAGE");
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
