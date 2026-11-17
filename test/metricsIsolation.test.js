const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../src/index");
const User = require("../src/models/User");
const { createSession } = require("../src/auth/session");
const { BOTH, startDb, stopDb } = require("./helpers");

test.before(startDb);
test.after(stopDb);

const converted = (metrics) => metrics.variants.A.converted + metrics.variants.B.converted;

test("les métriques de A ne bougent pas quand un visiteur convertit dans B", async () => {
  const a = { "X-Tenant": "observatoire-a" };
  const b = { "X-Tenant": "observatoire-b" };
  const before = (await request(app).get("/api/ab/metrics").set(a).expect(200)).body;

  const assignment = await request(app).get("/api/ab/assignment").set(b).expect(200);
  const visitor = assignment.headers["set-cookie"].find((c) => c.startsWith("ab_visitor=")).split(";")[0];
  const member = await User.findOne({ email: BOTH });
  const session = `ciel_session=${await createSession(member._id)}`;
  await request(app).post("/api/ab/exposure").set({ ...b, Cookie: visitor }).expect(204);
  await request(app)
    .post("/api/weather")
    .set({ ...b, Cookie: `${visitor}; ${session}`, "X-AB-Measure": "1" })
    .send({ st: "AB-B", ts: "2026-11-16T11:00:00.000Z" })
    .expect(201);

  const inB = (await request(app).get("/api/ab/metrics").set(b).expect(200)).body;
  assert.equal(converted(inB), 1, "la conversion est bien comptée dans B");

  const after = (await request(app).get("/api/ab/metrics").set(a).expect(200)).body;
  assert.deepEqual(after, before);
});
