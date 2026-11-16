const crypto = require("crypto");

const ALGO = "aes-256-gcm";

function key() {
  const raw = Buffer.from(process.env.GOOGLE_TOKEN_KEY || "", "base64");
  if (raw.length !== 32) {
    throw new Error("GOOGLE_TOKEN_KEY doit faire 32 octets, encodés en base64");
  }
  return raw;
}

// Stocké sous la forme iv.tag.chiffré, chaque morceau en base64url.
function seal(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const body = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((part) => part.toString("base64url")).join(".");
}

function open(sealed) {
  const [iv, tag, body] = sealed.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = crypto.createDecipheriv(ALGO, key(), iv, { authTagLength: 16 });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}

module.exports = { seal, open };
