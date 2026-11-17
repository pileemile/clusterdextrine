const test = require("node:test");
const assert = require("node:assert/strict");
const tenant = require("../public/tenant.js");

test("lit uniquement un slug valide au début du chemin tenant", () => {
  assert.equal(tenant.tenantFromPath("/c/observatoire-a/"), "observatoire-a");
  assert.equal(tenant.tenantFromPath("/c/../"), null);
  assert.equal(tenant.tenantFromPath("/c/%3Cscript%3E/"), null);
  assert.equal(tenant.tenantFromPath("/c/<script>/"), null);
  assert.equal(tenant.tenantFromPath("/lieux.html"), null);
});

test("normalise les couleurs hexadécimales et refuse les autres valeurs", () => {
  assert.equal(tenant.safeColor("#Ab12Ef"), "#ab12ef");
  assert.equal(tenant.safeColor("red"), tenant.DEFAULT_COLOR);
  assert.equal(tenant.safeColor("#123"), tenant.DEFAULT_COLOR);
});

test("ajoute le tenant courant sans remplacer les autres en-têtes", async (t) => {
  const previousFetch = global.fetch;
  const previousTenant = tenant.currentTenant;
  t.after(() => {
    global.fetch = previousFetch;
    tenant.setTenant(previousTenant);
  });
  tenant.setTenant("observatoire-a");
  let request;
  global.fetch = async (_path, options) => {
    request = options;
    return new Response("{}", { headers: { "Content-Type": "application/json" } });
  };

  const response = await tenant.api("/api/weather", { headers: { Accept: "application/json" } });
  assert.equal(request.headers.get("X-Tenant"), "observatoire-a");
  assert.equal(request.headers.get("Accept"), "application/json");
  assert.equal(tenant.url("/?q=station"), "/c/observatoire-a/?q=station");
  assert.equal(tenant.url("/lieux.html"), "/lieux.html?tenant=observatoire-a");
  assert.deepEqual(await response.json(), {});
});

test("jette une réponse reçue après un changement de génération", async (t) => {
  const previousFetch = global.fetch;
  const previousTenant = tenant.currentTenant;
  t.after(() => {
    global.fetch = previousFetch;
    tenant.setTenant(previousTenant);
  });
  tenant.setTenant("observatoire-a");
  let resolveFetch;
  global.fetch = () => new Promise((resolve) => {
    resolveFetch = resolve;
  });
  const pending = tenant.api("/api/weather");
  tenant.setTenant("observatoire-b");
  resolveFetch(new Response("{}"));
  await assert.rejects(pending, { name: "AbortError" });
});

test("jette aussi un corps lu après un changement de génération", async (t) => {
  const previousFetch = global.fetch;
  const previousTenant = tenant.currentTenant;
  t.after(() => {
    global.fetch = previousFetch;
    tenant.setTenant(previousTenant);
  });
  tenant.setTenant("observatoire-a");
  let resolveBody;
  global.fetch = async () => ({
    ok: true,
    json: () => new Promise((resolve) => {
      resolveBody = resolve;
    }),
  });
  const requestGeneration = tenant.generation;
  const response = await tenant.api("/api/weather");
  const pending = response.json().then((body) => {
    tenant.assertGeneration(requestGeneration);
    return body;
  });
  tenant.setTenant("observatoire-b");
  resolveBody({});
  await assert.rejects(pending, { name: "AbortError" });
});
