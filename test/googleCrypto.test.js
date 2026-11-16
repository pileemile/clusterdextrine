const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

process.env.GOOGLE_TOKEN_KEY = crypto.randomBytes(32).toString("base64");
const { seal, open } = require("../src/google/crypto");

test("seal puis open rend le texte d'origine", () => {
  assert.equal(open(seal("ya29.token")), "ya29.token");
});

test("deux seal du même texte ne donnent pas la même sortie", () => {
  assert.notEqual(seal("ya29.token"), seal("ya29.token"));
});

test("open refuse un texte modifié", () => {
  const [iv, tag, body] = seal("ya29.token").split(".");
  const flipped = Buffer.from(body, "base64url");
  flipped[0] ^= 1;
  assert.throws(() => open([iv, tag, flipped.toString("base64url")].join(".")));
});

test("une clé de mauvaise taille est refusée", () => {
  const previous = process.env.GOOGLE_TOKEN_KEY;
  process.env.GOOGLE_TOKEN_KEY = Buffer.alloc(16).toString("base64");
  assert.throws(() => seal("x"), /32 octets/);
  process.env.GOOGLE_TOKEN_KEY = previous;
});
