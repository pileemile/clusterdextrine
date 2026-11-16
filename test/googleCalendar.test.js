const test = require("node:test");
const assert = require("node:assert/strict");
const { createCalendar } = require("../src/google/calendar");

const USER = "11111111-1111-4111-8111-111111111111";

function fakeStore() {
  const store = {
    removed: false,
    refreshes: 0,
    accessTokenFor: async () => "stale",
    forceRefresh: async () => {
      store.refreshes += 1;
      return "fresh";
    },
    remove: async () => {
      store.removed = true;
    },
  };
  return store;
}

function stubFetch(t, replies) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    const { status = 200, body = {}, headers } = replies[calls.length - 1];
    return new Response(JSON.stringify(body), { status, headers });
  };
  t.after(() => {
    globalThis.fetch = original;
  });
  return calls;
}

test("un 401 déclenche un refresh et un seul nouvel essai", async (t) => {
  const calls = stubFetch(t, [{ status: 401 }, { body: { items: [{ id: "evt1" }] } }]);
  const store = fakeStore();
  const events = await createCalendar(store).listEvents(USER);

  assert.deepEqual(events, [{ id: "evt1" }]);
  assert.equal(store.refreshes, 1);
  assert.equal(calls[0].init.headers.Authorization, "Bearer stale");
  assert.equal(calls[1].init.headers.Authorization, "Bearer fresh");
  assert.match(calls[0].url, /singleEvents=true/);
});

test("deux 401 de suite : compte oublié, erreur revoked", async (t) => {
  stubFetch(t, [{ status: 401 }, { status: 401 }]);
  const store = fakeStore();
  await assert.rejects(createCalendar(store).listEvents(USER), { code: "revoked", status: 401 });
  assert.equal(store.removed, true);
});

test("un 429 donne quota avec Retry-After", async (t) => {
  stubFetch(t, [{ status: 429, headers: { "Retry-After": "30" } }]);
  await assert.rejects(createCalendar(fakeStore()).listEvents(USER), {
    code: "quota",
    status: 429,
    retryAfter: "30",
  });
});

test("un 403 userRateLimitExceeded est aussi un dépassement de quota", async (t) => {
  const body = { error: { errors: [{ reason: "userRateLimitExceeded" }] } };
  stubFetch(t, [{ status: 403, body }]);
  await assert.rejects(createCalendar(fakeStore()).listEvents(USER), { code: "quota" });
});

test("un 403 sans raison de quota reste une erreur Google", async (t) => {
  stubFetch(t, [{ status: 403, body: { error: { errors: [{ reason: "forbidden" }] } } }]);
  await assert.rejects(createCalendar(fakeStore()).listEvents(USER), { code: "google_error", status: 502 });
});

test("createEvent envoie l'événement en JSON", async (t) => {
  const calls = stubFetch(t, [{ body: { id: "evt2" } }]);
  const event = { summary: "Relevé", start: { dateTime: "2026-11-20T10:00:00Z" }, end: { dateTime: "2026-11-20T11:00:00Z" } };
  const created = await createCalendar(fakeStore()).createEvent(USER, event);

  assert.deepEqual(created, { id: "evt2" });
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init.body), event);
});

test("un 400 de Google remonte en bad_request", async (t) => {
  stubFetch(t, [{ status: 400 }]);
  await assert.rejects(createCalendar(fakeStore()).createEvent(USER, {}), { code: "bad_request", status: 400 });
});
