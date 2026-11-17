const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

process.env.GOOGLE_CLIENT_ID = "client-test";
process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/google/callback";
const googleRoutes = require("../src/routes/googleRoutes");

const VISITOR = "ab_visitor=11111111-1111-4111-8111-111111111111";

async function startApp(t) {
  const app = express();
  app.use(express.json());
  app.use("/api/google", googleRoutes);
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => server.close());
  return `http://127.0.0.1:${server.address().port}/api/google`;
}

test("auth pose le state et redirige vers Google", async (t) => {
  const base = await startApp(t);
  const res = await fetch(`${base}/auth`, { redirect: "manual" });
  const target = new URL(res.headers.get("location"));
  const cookies = res.headers.getSetCookie();

  assert.equal(res.status, 302);
  assert.equal(target.host, "accounts.google.com");
  assert.equal(target.searchParams.get("access_type"), "offline");
  const stateCookie = cookies.find((c) => c.startsWith("google_state="));
  assert.ok(stateCookie.includes(`google_state=${target.searchParams.get("state")};`));
  assert.ok(stateCookie.includes("; Secure;"));
  const visitorCookie = cookies.find((c) => c.startsWith("ab_visitor="));
  assert.ok(visitorCookie);
  assert.ok(visitorCookie.includes("; Secure;"));
});

test("callback refuse un state qui ne correspond pas", async (t) => {
  const base = await startApp(t);
  const res = await fetch(`${base}/callback?code=abc&state=autre`, {
    headers: { cookie: `${VISITOR}; google_state=attendu` },
  });
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: "invalid_state" });
});

test("callback renvoie vers l'accueil si l'utilisateur refuse", async (t) => {
  const base = await startApp(t);
  const res = await fetch(`${base}/callback?error=access_denied`, { redirect: "manual" });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "/agenda.html?google=refused");
});

test("sans cookie : status déconnecté et events en 401", async (t) => {
  const base = await startApp(t);
  assert.deepEqual(await (await fetch(`${base}/status`)).json(), { connected: false });

  const res = await fetch(`${base}/events`);
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "not_connected" });
});

test("POST events vérifie summary, start et end", async (t) => {
  const base = await startApp(t);
  const res = await fetch(`${base}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ summary: "Relevé" }),
  });
  assert.equal(res.status, 400);
});
