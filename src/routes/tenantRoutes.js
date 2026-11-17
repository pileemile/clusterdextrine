const express = require("express");
const Tenant = require("../models/Tenant");
const User = require("../models/User");
const Membership = require("../models/Membership");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const filter = {};
    const email = req.get("x-user");
    if (email) {
      const user = await User.findOne({ email: email.trim().toLowerCase() }).select("_id").lean();
      filter._id = { $in: user ? await Membership.find({ userId: user._id }).distinct("tenantId") : [] };
    }
    res.json(await Tenant.find(filter).select("-_id slug name color").sort({ name: 1 }).lean());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
