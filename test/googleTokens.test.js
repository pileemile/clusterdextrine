const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

process.env.GOOGLE_TOKEN_KEY = crypto.randomBytes(32).toString("base64");
const { seal, open } = require("../src/google/crypto");
const { createTokenStore } = require("../src/google/tokens");

const USER = "11111111-1111-4111-8111-111111111111";

function memoryDb() {
  const rows = new Map();
  return {
    rows,
    googleCredential: {
      findUnique: async ({ where }) => rows.get(where.userId) ?? null,
      upsert: async ({ where, update, create }) => {
        const current = rows.get(where.userId);
        rows.set(where.userId, current ? { ...current, ...update } : { ...create });
      },
      deleteMany: async ({ where }) => {
        rows.delete(where.userId);
      },
    },
  };
}

function storeWith(row) {
  const db = memoryDb();
  if (row) db.rows.set(USER, row);
  return { db, store: createTokenStore(() => db) };
}

function credential(expiresInMs) {
  return {
    userId: USER,
    accessToken: seal("old-access"),
    refreshToken: seal("refresh-1"),
    expiresAt: new Date(Date.now() + expiresInMs),
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
  };
}

function stubFetch(t, reply) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: String(init?.body ?? "") });
    const { status = 200, body } = reply(calls.length);
    return new Response(JSON.stringify(body), { status });
  };
  t.after(() => {
    globalThis.fetch = original;
  });
  return calls;
}

const refreshed = { access_token: "new-access", expires_in: 3599, scope: "https://www.googleapis.com/auth/calendar.events" };

test("un token encore valide est rendu sans appel à Google", async (t) => {
  const calls = stubFetch(t, () => ({ body: refreshed }));
  const { store } = storeWith(credential(30 * 60 * 1000));
  assert.equal(await store.accessTokenFor(USER), "old-access");
  assert.equal(calls.length, 0);
});

test("un token expiré est rafraîchi puis enregistré", async (t) => {
  const calls = stubFetch(t, () => ({ body: refreshed }));
  const { db, store } = storeWith(credential(-1000));

  assert.equal(await store.accessTokenFor(USER), "new-access");
  assert.equal(calls.length, 1);
  assert.match(calls[0].body, /grant_type=refresh_token/);

  const row = db.rows.get(USER);
  assert.equal(open(row.accessToken), "new-access");
  assert.equal(open(row.refreshToken), "refresh-1");
  assert.ok(row.expiresAt > new Date());
});

test("deux appels simultanés ne déclenchent qu'un refresh", async (t) => {
  const calls = stubFetch(t, () => ({ body: refreshed }));
  const { store } = storeWith(credential(10 * 1000));
  const tokens = await Promise.all([store.accessTokenFor(USER), store.accessTokenFor(USER)]);
  assert.deepEqual(tokens, ["new-access", "new-access"]);
  assert.equal(calls.length, 1);
});

test("invalid_grant supprime la ligne et répond revoked", async (t) => {
  stubFetch(t, () => ({ status: 400, body: { error: "invalid_grant" } }));
  const { db, store } = storeWith(credential(-1000));
  await assert.rejects(store.accessTokenFor(USER), { code: "revoked", status: 401 });
  assert.equal(db.rows.has(USER), false);
});

test("un 429 au refresh devient une erreur de quota", async (t) => {
  stubFetch(t, () => ({ status: 429, body: {} }));
  const { db, store } = storeWith(credential(-1000));
  await assert.rejects(store.accessTokenFor(USER), { code: "quota", status: 429 });
  assert.equal(db.rows.has(USER), true);
});

test("sans ligne ou sans cookie : not_connected", async () => {
  const { store } = storeWith(null);
  await assert.rejects(store.accessTokenFor(USER), { code: "not_connected", status: 401 });
  await assert.rejects(store.accessTokenFor(null), { code: "not_connected" });
  assert.deepEqual(await store.status(USER), { connected: false });
});

test("save garde le refresh token et status le reflète", async () => {
  const { db, store } = storeWith(null);
  await store.save(USER, { ...refreshed, refresh_token: "refresh-2" });
  await store.save(USER, refreshed);
  assert.equal(open(db.rows.get(USER).refreshToken), "refresh-2");
  const state = await store.status(USER);
  assert.equal(state.connected, true);
  assert.deepEqual(state.scopes, ["https://www.googleapis.com/auth/calendar.events"]);
});

test("disconnect révoque chez Google puis oublie le compte", async (t) => {
  const calls = stubFetch(t, () => ({ body: {} }));
  const { db, store } = storeWith(credential(30 * 60 * 1000));
  await store.disconnect(USER);
  assert.match(calls[0].url, /revoke/);
  assert.equal(db.rows.has(USER), false);
});

test("disconnect oublie le compte même si Google est injoignable", async (t) => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new TypeError("fetch failed");
  };
  t.after(() => {
    globalThis.fetch = original;
  });
  t.mock.method(console, "warn", () => {});
  const { db, store } = storeWith(credential(30 * 60 * 1000));
  await store.disconnect(USER);
  assert.equal(db.rows.has(USER), false);
});
