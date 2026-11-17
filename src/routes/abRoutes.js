const express = require("express");
const ab = require("../services/abService");
const { internalError } = require("../security/errors");

const router = express.Router();

router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.get("/assignment", async (req, res) => {
  try {
    const { visitorId } = ab.resolveVisitor(req);
    if (ab.isEnabled()) {
      res.set("Set-Cookie", ab.cookieHeader(visitorId));
    }
    res.json(await ab.assign(visitorId));
  } catch (err) {
    internalError(res, err, "Affectation A/B");
  }
});

router.post("/exposure", async (req, res) => {
  try {
    await ab.expose(ab.readVisitorId(req));
    res.status(204).end();
  } catch (err) {
    internalError(res, err, "Exposition A/B");
  }
});

router.get("/metrics", async (req, res) => {
  try {
    res.json(await ab.metrics());
  } catch (err) {
    internalError(res, err, "Métriques A/B");
  }
});

module.exports = router;
