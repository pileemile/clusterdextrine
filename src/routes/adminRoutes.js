const express = require("express");
const mongoose = require("mongoose");
const Tenant = require("../models/Tenant");
const User = require("../models/User");
const Membership = require("../models/Membership");
const Weather = require("../models/Weather");
const { requireAdmin } = require("../auth/session");

const router = express.Router();
router.use(requireAdmin());

router.get("/users", async (_req, res) => {
  res.json(await User.find().select("_id email name role createdAt updatedAt").sort({ email: 1 }).lean());
});

router.patch("/users/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "invalid_user_id" });
  const updates = {};
  if (typeof req.body?.name === "string" && req.body.name.trim()) updates.name = req.body.name.trim();
  if (req.body?.role === "admin") return res.status(409).json({ error: "single_admin_only" });
  if (req.body?.role === "user") updates.role = req.body.role;
  if (!Object.keys(updates).length) return res.status(400).json({ error: "no_valid_changes" });
  if (req.params.id === String(req.user._id) && updates.role === "user") {
    return res.status(400).json({ error: "cannot_demote_self" });
  }
  const user = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { returnDocument: "after" })
    .select("_id email name role")
    .lean();
  if (!user) return res.status(404).json({ error: "user_not_found" });
  res.json(user);
});

router.get("/memberships", async (_req, res) => {
  res.json(await Membership.find().populate("userId", "email name role").populate("tenantId", "slug name").lean());
});

router.post("/memberships", async (req, res) => {
  const { userId, tenantId } = req.body || {};
  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(tenantId)) {
    return res.status(400).json({ error: "invalid_membership" });
  }
  const [user, tenant] = await Promise.all([User.exists({ _id: userId }), Tenant.exists({ _id: tenantId })]);
  if (!user || !tenant) return res.status(404).json({ error: "user_or_tenant_not_found" });
  const membership = await Membership.findOneAndUpdate(
    { userId, tenantId },
    { $setOnInsert: { userId, tenantId } },
    { upsert: true, returnDocument: "after" }
  ).lean();
  res.status(201).json(membership);
});

router.delete("/memberships/:userId/:tenantId", async (req, res) => {
  await Membership.deleteOne({ userId: req.params.userId, tenantId: req.params.tenantId });
  res.status(204).end();
});

router.get("/tenants", async (_req, res) => {
  res.json(await Tenant.find().sort({ name: 1 }).lean());
});

router.post("/tenants", async (req, res) => {
  const { slug, name, address = "", color = "#6b7280" } = req.body || {};
  if (typeof slug !== "string" || !Tenant.SLUG.test(slug) || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "invalid_tenant" });
  }
  try {
    res.status(201).json(await Tenant.create({ slug, name: name.trim(), address, color }));
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ error: "tenant_exists" });
    throw err;
  }
});

router.patch("/tenants/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "invalid_tenant_id" });
  const updates = {};
  for (const key of ["name", "address", "color"]) {
    if (typeof req.body?.[key] === "string") updates[key] = req.body[key].trim();
  }
  const tenant = await Tenant.findByIdAndUpdate(req.params.id, { $set: updates }, { returnDocument: "after" }).lean();
  if (!tenant) return res.status(404).json({ error: "tenant_not_found" });
  res.json(tenant);
});

router.delete("/tenants/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "invalid_tenant_id" });
  const result = await Tenant.deleteOne({ _id: req.params.id });
  if (!result.deletedCount) return res.status(404).json({ error: "tenant_not_found" });
  await Membership.deleteMany({ tenantId: req.params.id });
  res.status(204).end();
});

router.get("/weather", async (_req, res) => {
  res.json(await Weather.collection.find({}).limit(1000).toArray());
});

router.delete("/weather/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "invalid_weather_id" });
  const result = await Weather.collection.deleteOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
  if (!result.deletedCount) return res.status(404).json({ error: "weather_not_found" });
  res.status(204).end();
});

module.exports = router;
