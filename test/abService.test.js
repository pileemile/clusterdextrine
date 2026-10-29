const test = require("node:test");
const assert = require("node:assert/strict");
const { variantFor, wantsMeasure, readVisitorId, isEnabled } = require("../src/services/abService");

test("variantFor est stable et coupe à 128", () => {
  const seen = new Set();
  for (let i = 0; i < 400; i += 1) {
    const first = variantFor(`visitor-${i}`);
    const again = variantFor(`visitor-${i}`);
    assert.deepEqual(again, first);
    assert.ok(first.bucket >= 0 && first.bucket <= 255);
    assert.equal(first.variant, first.bucket < 128 ? "A" : "B");
    seen.add(first.variant);
  }
  assert.deepEqual([...seen].sort(), ["A", "B"]);
});

test("wantsMeasure ne lit que l'en-tête de mesure", () => {
  const req = (value) => ({ get: () => value });
  assert.equal(wantsMeasure(req("1")), true);
  assert.equal(wantsMeasure(req("true")), true);
  assert.equal(wantsMeasure(req("")), false);
  assert.equal(wantsMeasure(req("0")), false);
});

test("readVisitorId ignore un cookie absent, invalide ou mal encodé", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  assert.equal(readVisitorId({ headers: { cookie: `ab_visitor=${id}` } }), id);
  assert.equal(readVisitorId({ headers: { cookie: "ab_visitor=nope" } }), null);
  assert.equal(readVisitorId({ headers: { cookie: "ab_visitor=%E0%A4%A" } }), null);
  assert.equal(readVisitorId({ headers: {} }), null);
});

test("isEnabled suit AB_ENABLED", () => {
  const previous = process.env.AB_ENABLED;
  process.env.AB_ENABLED = "false";
  assert.equal(isEnabled(), false);
  process.env.AB_ENABLED = "true";
  assert.equal(isEnabled(), true);
  if (previous === undefined) delete process.env.AB_ENABLED;
  else process.env.AB_ENABLED = previous;
});
