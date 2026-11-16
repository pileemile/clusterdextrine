const crypto = require("crypto");
const express = require("express");
const ab = require("../services/abService");
const { authUrl, exchangeCode } = require("../google/oauth");
const { createTokenStore } = require("../google/tokens");
const { createCalendar } = require("../google/calendar");
const { GoogleError } = require("../google/errors");

const STATE_COOKIE = "google_state";
const STATE_ATTRS = "Path=/api/google; HttpOnly; SameSite=Lax";

const store = createTokenStore();
const calendar = createCalendar(store);
const router = express.Router();

router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// L'identifiant utilisateur est celui du cookie ab_visitor : l'app n'a pas de comptes.
router.get("/auth", (req, res) => {
  const { visitorId, fresh } = ab.resolveVisitor(req);
  const state = crypto.randomBytes(16).toString("base64url");
  const cookies = [`${STATE_COOKIE}=${state}; Max-Age=600; ${STATE_ATTRS}`];
  if (fresh) cookies.push(ab.cookieHeader(visitorId));
  res.set("Set-Cookie", cookies);
  res.redirect(authUrl(state));
});

router.get("/callback", async (req, res) => {
  const { code, state, error } = req.query;
  const expected = ab.readCookie(req, STATE_COOKIE);
  const userId = ab.readVisitorId(req);
  res.append("Set-Cookie", `${STATE_COOKIE}=; Max-Age=0; ${STATE_ATTRS}`);

  if (error) return res.redirect("/?google=refused");
  if (!userId || !expected || state !== expected || typeof code !== "string") {
    return res.status(400).json({ error: "invalid_state" });
  }
  await store.save(userId, await exchangeCode(code));
  res.redirect("/?google=connected");
});

router.get("/status", async (req, res) => {
  res.json(await store.status(ab.readVisitorId(req)));
});

router.delete("/disconnect", async (req, res) => {
  await store.disconnect(ab.readVisitorId(req));
  res.status(204).end();
});

router.get("/events", async (req, res) => {
  const { timeMin, timeMax } = req.query;
  res.json(await calendar.listEvents(ab.readVisitorId(req), { timeMin, timeMax }));
});

router.post("/events", async (req, res) => {
  const { summary, description, location, start, end } = req.body ?? {};
  if (!summary || !start || !end) {
    return res.status(400).json({ error: "summary, start et end sont requis" });
  }
  const event = { summary, description, location, start, end };
  res.status(201).json(await calendar.createEvent(ab.readVisitorId(req), event));
});

router.use((err, _req, res, _next) => {
  if (!(err instanceof GoogleError)) {
    return res.status(500).json({ error: err.message });
  }
  if (err.retryAfter) res.set("Retry-After", err.retryAfter);
  res.status(err.status).json({ error: err.code });
});

module.exports = router;
