const Tenant = require("../models/Tenant");
const { runWithTenant } = require("./context");

const HEADER = "x-tenant";
const SSE_PATH = "/weather/events";

function readSlug(req) {
  const fromHeader = req.get(HEADER);
  if (fromHeader !== undefined) return fromHeader;
  if (req.path === SSE_PATH && typeof req.query.tenant === "string") return req.query.tenant;
  return undefined;
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
  if (!tenant) {
    return res.status(404).json({ error: "Tenant introuvable." });
  }

  // TODO membership : renvoyer 404 (et non 403)
  req.tenant = tenant;
  runWithTenant(tenant, () => next());
}

module.exports = { tenantMiddleware };
