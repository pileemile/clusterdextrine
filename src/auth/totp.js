const crypto = require("node:crypto");

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function randomSecret() {
  const bytes = crypto.randomBytes(20);
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i < bits.length; i += 5) out += BASE32[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  return out;
}

function decodeBase32(value) {
  const bits = value
    .replace(/=+$/, "")
    .toUpperCase()
    .split("")
    .map((char) => BASE32.indexOf(char).toString(2).padStart(5, "0"))
    .join("");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function codeAt(secret, counter) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 15;
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return String(value).padStart(6, "0");
}

function verifyCode(secret, code, timestamp = Date.now()) {
  if (!secret || !/^\d{6}$/.test(String(code))) return false;
  const counter = Math.floor(timestamp / 30000);
  return [-1, 0, 1].some((delta) => codeAt(secret, counter + delta) === String(code));
}

function recoveryCode() {
  return crypto.randomBytes(5).toString("hex");
}

function hashRecoveryCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

module.exports = { randomSecret, verifyCode, recoveryCode, hashRecoveryCode };
