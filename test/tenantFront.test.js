const test = require("node:test");
const assert = require("node:assert/strict");
const { tenantFromPath, safeColor } = require("../public/tenant.js");

test("tenantFromPath lit le slug de /c/:slug/ et rejette les chemins forgés", () => {
  assert.equal(tenantFromPath("/c/observatoire-a/"), "observatoire-a");
  assert.equal(tenantFromPath("/c/observatoire-b/releves"), "observatoire-b");
  assert.equal(tenantFromPath("/"), null);
  assert.equal(tenantFromPath("/c/../"), null);
  assert.equal(tenantFromPath("/c/<script>/"), null);
  assert.equal(tenantFromPath("/c/A/"), null);
});

test("safeColor n'accepte que #rrggbb, en minuscules", () => {
  assert.equal(safeColor("#1F6FEB"), "#1f6feb");
  const fallback = safeColor(undefined);
  assert.match(fallback, /^#[0-9a-f]{6}$/);
  assert.equal(safeColor("red"), fallback);
  assert.equal(safeColor("#fff"), fallback);
  assert.equal(safeColor("#000000;background:url(x)"), fallback);
});
