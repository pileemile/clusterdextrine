const crypto = require("node:crypto");
const User = require("../models/User");
const AuthSession = require("../models/AuthSession");

const COOKIE = "ciel_session";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function readCookie(req, name) {
  for (const part of String(req.headers.cookie || "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

function setSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`
  );
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  await AuthSession.create({
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + MAX_AGE_SECONDS * 1000),
  });
  return token;
}

async function currentUser(req) {
  const session = await currentSession(req);
  return session?.user ?? null;
}

async function currentSession(req) {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  const session = await AuthSession.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } }).lean();
  if (!session) return null;
  const user = await User.findById(session.userId).select("_id email name role twoFactorEnabled").lean();
  return user ? { ...session, user } : null;
}

function requireUser() {
  return async (req, res, next) => {
    req.user = await currentUser(req);
    if (!req.user) return res.status(401).json({ error: "auth_required" });
    next();
  };
}

function requireAdmin() {
  return async (req, res, next) => {
    const session = await currentSession(req);
    req.user = req.user || session?.user;
    if (!req.user) return res.status(401).json({ error: "auth_required" });
    if (req.user.role !== "admin") return res.status(403).json({ error: "admin_required" });
    if (!req.user.twoFactorEnabled) return res.status(428).json({ error: "two_factor_setup_required" });
    if (!session?.twoFactorAt) return res.status(401).json({ error: "two_factor_required" });
    next();
  };
}

async function markTwoFactorVerified(req) {
  const token = readCookie(req, COOKIE);
  if (!token) return false;
  const result = await AuthSession.updateOne(
    { tokenHash: hashToken(token), expiresAt: { $gt: new Date() } },
    { $set: { twoFactorAt: new Date() } }
  );
  return result.modifiedCount === 1;
}

module.exports = { createSession, currentUser, currentSession, markTwoFactorVerified, requireUser, requireAdmin, setSessionCookie };
