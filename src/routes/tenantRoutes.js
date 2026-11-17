const express = require("express");
const Tenant = require("../models/Tenant");
const Membership = require("../models/Membership");
const { currentUser } = require("../auth/session");

const router = express.Router();

// Connecté : ses tenants seulement. Anonyme : tous (lecture seule, voir tenant/middleware.js).
router.get("/", async (req, res) => {
  try {
    const filter = {};
    const user = await currentUser(req);
    if (user) {
      filter._id = { $in: await Membership.find({ userId: user._id }).distinct("tenantId") };
    }
    res.json(await Tenant.find(filter).select("-_id slug name color").sort({ name: 1 }).lean());
  } catch (err) {
    console.error("Liste des tenants :", err.message);
    res.status(500).json({ error: "Erreur interne." });
  }
});

module.exports = router;
