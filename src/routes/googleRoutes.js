const crypto = require("crypto");
const express = require("express");
const ab = require("../services/abService");
const { authUrl, exchangeCode, userInfo } = require("../google/oauth");
const { createTokenStore } = require("../google/tokens");
const { createCalendar } = require("../google/calendar");
const { GoogleError } = require("../google/errors");
const User = require("../models/User");
const { createSession, currentUser, setSessionCookie, requireUser } = require("../auth/session");

const STATE_COOKIE = "google_state";
const STATE_ATTRS = "Path=/api/google; HttpOnly; Secure; SameSite=Lax";

const store = createTokenStore();
const calendar = createCalendar(store);
const router = express.Router();

function configuredAdmin() {
  return String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
}

router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// L'identifiant utilisateur est celui du cookie ab_visitor : l'app n'a pas de comptes.
router.get("/auth", (req, res) => {
  const { visitorId } = ab.resolveVisitor(req);
  const state = crypto.randomBytes(16).toString("base64url");
  const cookies = [
    `${STATE_COOKIE}=${state}; Max-Age=600; ${STATE_ATTRS}`,
    ab.cookieHeader(visitorId),
  ];
  res.set("Set-Cookie", cookies);
  res.redirect(authUrl(state));
});

router.get("/callback", async (req, res) => {
  const { code, state, error } = req.query;
  const expected = ab.readCookie(req, STATE_COOKIE);
  res.append("Set-Cookie", `${STATE_COOKIE}=; Max-Age=0; ${STATE_ATTRS}`);

  if (error) return res.redirect("/agenda.html?google=refused");
  if (!expected || state !== expected || typeof code !== "string") {
    return res.status(400).json({ error: "invalid_state" });
  }
  const tokens = await exchangeCode(code);
  const profile = await userInfo(tokens.access_token);
  if (!profile.email || profile.email_verified === false) {
    return res.status(403).json({ error: "google_email_required" });
  }
  const user = await User.findOneAndUpdate(
    { email: profile.email.toLowerCase() },
    {
      $set: {
        name: profile.name || profile.email,
        ...(configuredAdmin() === profile.email.toLowerCase() ? { role: "admin" } : {}),
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  ).lean();
  await store.save(String(user._id), tokens);
  setSessionCookie(res, await createSession(user._id));
  res.redirect("/agenda.html?google=connected");
});

router.get("/me", requireUser(), (req, res) => res.json(req.user));

async function identity(req) {
  const user = await currentUser(req);
  return user ? String(user._id) : ab.readVisitorId(req);
}

router.get("/status", async (req, res) => {
  res.json(await store.status(await identity(req)));
});

router.delete("/disconnect", async (req, res) => {
  await store.disconnect(await identity(req));
  res.status(204).end();
});

router.get("/events", async (req, res) => {
  const { timeMin, timeMax } = req.query;
  res.json(await calendar.listEvents(await identity(req), { timeMin, timeMax }));
});

router.post("/events", async (req, res) => {
  const { summary, description, location, start, end } = req.body ?? {};
  if (!summary || !start || !end) {
    return res.status(400).json({ error: "summary, start et end sont requis" });
  }
  const event = { summary, description, location, start, end };
  res.status(201).json(await calendar.createEvent(await identity(req), event));
});

router.patch("/events/:id", async (req, res) => {
  const { summary, description, start, end } = req.body ?? {};
  const event = { summary, description, start, end };
  res.json(await calendar.updateEvent(await identity(req), req.params.id, event));
});

router.delete("/events/:id", async (req, res) => {
  await calendar.deleteEvent(await identity(req), req.params.id);
  res.status(204).end();
});

router.use((err, _req, res, _next) => {
  if (!(err instanceof GoogleError)) {
    return res.status(500).json({ error: err.message });
  }
  if (err.retryAfter) res.set("Retry-After", err.retryAfter);
  res.status(err.status).json({ error: err.code });
});

module.exports = router;
