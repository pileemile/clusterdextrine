const Tenant = require("../models/Tenant");
const Membership = require("../models/Membership");
const { currentUser } = require("../auth/session");
const { runWithTenant } = require("./context");

const HEADER = "x-tenant";
const SSE_PATHS = new Set(["/weather/events", "/events"]);
const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function readSlug(req) {
  const fromHeader = req.get(HEADER);
  if (fromHeader !== undefined) return fromHeader;
  if (SSE_PATHS.has(req.path) && typeof req.query.tenant === "string") return req.query.tenant;
  return undefined;
}
async function allowed(req, tenant) {
  req.user = await currentUser(req);
  if (!req.user) return true;
  return Boolean(await Membership.exists({ userId: req.user._id, tenantId: tenant._id }));
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
  // Même réponse pour « inconnu » et « non-membre » : on ne révèle pas qu'un tenant existe.
  if (!tenant || !(await allowed(req, tenant))) {
    return res.status(404).json({ error: "Tenant introuvable." });
  }

  req.tenant = tenant;
  runWithTenant(tenant, () => next());
}

function requireMemberToWrite(req, res, next) {
  if (READ_METHODS.has(req.method) || req.user) return next();
  return res.status(401).json({ error: "auth_required" });
}

module.exports = { tenantMiddleware, requireMemberToWrite };
