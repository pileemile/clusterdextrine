const express = require("express");
const { currentUser } = require("../auth/session");
const { log } = require("../services/adminLog");

/** Actions front autorisées (pas de lectures libres). */
const ALLOWED = new Set(["lieu_ajoute", "lieu_retire", "lieu_cherche"]);

const router = express.Router();

router.post("/", async (req, res) => {
  const action = String(req.body?.action || "");
  if (!ALLOWED.has(action)) return res.status(400).json({ error: "invalid_action" });
  const user = await currentUser(req);
  log({
    action,
    who: user?.email || "—",
    detail: String(req.body?.detail || "").slice(0, 500),
  });
  res.status(204).end();
});

module.exports = router;
