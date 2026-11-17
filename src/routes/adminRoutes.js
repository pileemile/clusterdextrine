const express = require("express");
const mongoose = require("mongoose");
const Tenant = require("../models/Tenant");
const User = require("../models/User");
const Membership = require("../models/Membership");
const Weather = require("../models/Weather");
const AdminLog = require("../models/AdminLog");
const weatherEvents = require("../sse/weatherEvents");
const { requireAdmin } = require("../auth/session");
const { log, whoFrom } = require("../services/adminLog");

const router = express.Router();
router.use(requireAdmin());

router.get("/logs", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
  res.json(await AdminLog.find().sort({ at: -1 }).limit(limit).lean());
});

router.get("/stats", async (_req, res) => {
  const [labos, users, memberships, weather, stationIds] = await Promise.all([
    Tenant.countDocuments(),
    User.countDocuments(),
    Membership.countDocuments(),
    Weather.collection.countDocuments({}),
    Weather.collection.distinct("st"),
  ]);
  res.json({
    labos,
    stations: stationIds.filter((st) => st != null && String(st).trim()).length,
    weather,
    users,
    memberships,
    weatherListeners: weatherEvents.clients.size,
  });
});

router.get("/users", async (_req, res) => {
  res.json(await User.find().select("_id email name role createdAt updatedAt").sort({ email: 1 }).lean());
});

router.patch("/users/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "invalid_user_id" });
  const updates = {};
  if (typeof req.body?.name === "string" && req.body.name.trim()) updates.name = req.body.name.trim();
  if (req.body?.role === "admin" || req.body?.role === "user") updates.role = req.body.role;
  if (!Object.keys(updates).length) return res.status(400).json({ error: "no_valid_changes" });
  if (req.params.id === String(req.user._id) && updates.role === "user") {
    return res.status(400).json({ error: "cannot_demote_self" });
  }
  if (updates.role === "user") {
    const admins = await User.countDocuments({ role: "admin", _id: { $ne: req.params.id } });
    if (!admins) return res.status(400).json({ error: "last_admin" });
  }
  const user = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { returnDocument: "after" })
    .select("_id email name role")
    .lean();
  if (!user) return res.status(404).json({ error: "user_not_found" });
  if (updates.role) {
    log({
      action: "role",
      who: whoFrom(req),
      detail: `${user.email} → ${user.role}`,
    });
  }
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
  const [memberUser, memberTenant] = await Promise.all([
    User.findById(userId).select("email").lean(),
    Tenant.findById(tenantId).select("slug").lean(),
  ]);
  if (!memberUser || !memberTenant) return res.status(404).json({ error: "user_or_tenant_not_found" });
  const membership = await Membership.findOneAndUpdate(
    { userId, tenantId },
    { $setOnInsert: { userId, tenantId } },
    { upsert: true, returnDocument: "after" }
  ).lean();
  log({
    action: "appartenance",
    who: whoFrom(req),
    detail: `+ ${memberUser.email} → ${memberTenant.slug}`,
  });
  res.status(201).json(membership);
});

router.delete("/memberships/:userId/:tenantId", async (req, res) => {
  const [user, tenant] = await Promise.all([
    User.findById(req.params.userId).select("email").lean(),
    Tenant.findById(req.params.tenantId).select("slug").lean(),
  ]);
  await Membership.deleteOne({ userId: req.params.userId, tenantId: req.params.tenantId });
  log({
    action: "appartenance",
    who: whoFrom(req),
    detail: `- ${user?.email || req.params.userId} → ${tenant?.slug || req.params.tenantId}`,
  });
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
    const tenant = await Tenant.create({ slug, name: name.trim(), address, color });
    log({ action: "tenant_cree", who: whoFrom(req), detail: `${tenant.slug} (${tenant.name})` });
    res.status(201).json(tenant);
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
  const tenant = await Tenant.findById(req.params.id).lean();
  if (!tenant) return res.status(404).json({ error: "tenant_not_found" });
  await Tenant.deleteOne({ _id: req.params.id });
  await Membership.deleteMany({ tenantId: req.params.id });
  log({ action: "tenant_supprime", who: whoFrom(req), detail: `${tenant.slug} (${tenant.name})` });
  res.status(204).end();
});

router.get("/weather", async (_req, res) => {
  res.json(await Weather.collection.find({}).limit(1000).toArray());
});

router.delete("/weather/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "invalid_weather_id" });
  const id = new mongoose.Types.ObjectId(req.params.id);
  const doc = await Weather.collection.findOne({ _id: id });
  if (!doc) return res.status(404).json({ error: "weather_not_found" });
  await Weather.collection.deleteOne({ _id: id });
  log({
    action: "releve_supprime",
    who: whoFrom(req),
    detail: `Admin · station ${doc.st || "?"} · ${req.params.id}`,
  });
  res.status(204).end();
});

module.exports = router;
