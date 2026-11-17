const Tenant = require("../models/Tenant");
const User = require("../models/User");
const Membership = require("../models/Membership");
const { runWithTenant } = require("./context");

const HEADER = "x-tenant";
const USER_HEADER = "x-user";
const SSE_PATHS = new Set(["/weather/events", "/events"]);

function readSlug(req) {
  const fromHeader = req.get(HEADER);
  if (fromHeader !== undefined) return fromHeader;
  if (SSE_PATHS.has(req.path) && typeof req.query.tenant === "string") return req.query.tenant;
  return undefined;
}
async function allowed(req, tenant) {
  const email = req.get(USER_HEADER);
  if (email === undefined || email === "") return true;
  const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select("_id").lean();
  if (!user) return false;
  return Boolean(await Membership.exists({ userId: user._id, tenantId: tenant._id }));
}

async function tenantMiddleware(req, res, next) {
  const slug = readSlug(req);

  if (!slug) {
    return res.status(400).json({ error: "En-tête X-Tenant manquant." });
  }
  if (!Tenant.SLUG.test(slug)) {
    return res.status(400).json({ error: "Tenant invalide." });
  }

  const tenant = await Tenant.findOne({ slug }).select("_id slug name color").lean();
  if (!tenant || !(await allowed(req, tenant))) {
    return res.status(404).json({ error: "Tenant introuvable." });
  }

  req.tenant = tenant;
  runWithTenant(tenant, () => next());
}

module.exports = { tenantMiddleware };
