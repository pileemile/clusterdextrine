const crypto = require("crypto");
const AbAssignment = require("../models/AbAssignment");
const { getTenant } = require("../tenant/context");

/**
 * Clé d'expérience. Ne pas la modifier en cours d'exercice :
 * une nouvelle version de l'essai = une nouvelle clé.
 * A = « Nouveau relevé » (référence), B = « Ajouter un relevé ».
 */
const EXP = "bouton_nouveau_releve_v1";
const COOKIE = "ab_visitor";
const SPLIT = 128;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const COOKIE_MAX_AGE = 390 * 24 * 60 * 60;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isEnabled() {
  return String(process.env.AB_ENABLED ?? "true").toLowerCase() !== "false";
}

function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

function readCookie(req, name) {
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

function readVisitorId(req) {
  const value = readCookie(req, COOKIE);
  return isUuid(value) ? value : null;
}

/** Présent seulement quand le visiteur est dans l'expérience. Ne choisit pas A ou B. */
function wantsMeasure(req) {
  const value = String(req.get("x-ab-measure") || "");
  return value === "1" || value.toLowerCase() === "true";
}

/**
 * Répartition stable, proche de 50/50.
 * Empreinte SHA-256 de « clé:identifiant », premier octet lu comme non signé (0–255).
 * Seaux 0–127 → A, 128–255 → B. Même entrée, même seau, sur tous les serveurs.
 */
function variantFor(visitorId) {
  const digest = crypto.createHash("sha256").update(`${EXP}:${visitorId}`, "utf8").digest();
  const bucket = digest[0] & 0xff;
  return { variant: bucket < SPLIT ? "A" : "B", bucket };
}

function cookieHeader(visitorId) {
  return `${COOKIE}=${encodeURIComponent(visitorId)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax`;
}

function resolveVisitor(req) {
  const existing = readVisitorId(req);
  if (existing) return { visitorId: existing, fresh: false };
  return { visitorId: crypto.randomUUID(), fresh: true };
}

async function assign(visitorId) {
  if (!isEnabled()) {
    return { experiment: EXP, variant: "A", enabled: false, counted: false };
  }

  const { variant, bucket } = variantFor(visitorId);
  const doc = await AbAssignment.findOneAndUpdate(
    { experiment: EXP, visitorId },
    {
      $setOnInsert: {
        experiment: EXP,
        visitorId,
        variant,
        bucket,
        exposed: false,
        converted: false,
        bookings: 0,
      },
    },
    { upsert: true, returnDocument: "after" }
  ).lean();

  return {
    experiment: EXP,
    variant: doc.variant,
    bucket: doc.bucket,
    enabled: true,
    counted: true,
  };
}

/**
 * Première exposition seulement. Le filtre `exposed: false` est dans la mise à jour :
 * une seconde déclaration ne réécrit pas exposedAt.
 */
async function expose(visitorId) {
  if (!isEnabled() || !isUuid(visitorId)) return;
  const doc = await AbAssignment.findOne({ experiment: EXP, visitorId }).select("_id");
  if (!doc) return;
  await AbAssignment.updateOne(
    { _id: doc._id, exposed: false },
    { $set: { exposed: true, exposedAt: new Date() } }
  );
}

/**
 * Une création réussie, dans les 24 h après l'exposition.
 * bookings augmente à chaque fois ; converted reste une seule unité par visiteur.
 * Sans exposition, ou hors fenêtre, la mise à jour ne touche rien.
 */
async function attributeBooking(visitorId) {
  if (!isEnabled() || !isUuid(visitorId)) return false;
  const since = new Date(Date.now() - WINDOW_MS);
  const result = await AbAssignment.updateOne(
    {
      experiment: EXP,
      visitorId,
      exposed: true,
      exposedAt: { $gte: since },
    },
    [
      {
        $set: {
          bookings: { $add: [{ $ifNull: ["$bookings", 0] }, 1] },
          converted: true,
          convertedAt: { $ifNull: ["$convertedAt", "$$NOW"] },
        },
      },
    ],
    { updatePipeline: true }
  );
  return result.matchedCount > 0;
}

function withRate(row) {
  const exposed = row?.exposed || 0;
  return {
    assigned: row?.assigned || 0,
    exposed,
    converted: row?.converted || 0,
    bookings: row?.bookings || 0,
    rate: exposed > 0 ? (row?.converted || 0) / exposed : null,
  };
}

async function metrics() {
  const rows = await AbAssignment.aggregate([
    { $match: { tenantId: getTenant()._id, experiment: EXP } },
    {
      $group: {
        _id: "$variant",
        assigned: { $sum: 1 },
        exposed: { $sum: { $cond: ["$exposed", 1, 0] } },
        converted: { $sum: { $cond: ["$converted", 1, 0] } },
        bookings: { $sum: { $ifNull: ["$bookings", 0] } },
      },
    },
  ]);

  const variants = { A: withRate(null), B: withRate(null) };
  for (const row of rows) {
    if (row._id === "A" || row._id === "B") variants[row._id] = withRate(row);
  }
  return { experiment: EXP, enabled: isEnabled(), variants };
}

module.exports = {
  EXP,
  COOKIE,
  isEnabled,
  variantFor,
  cookieHeader,
  resolveVisitor,
  readVisitorId,
  wantsMeasure,
  assign,
  expose,
  attributeBooking,
  metrics,
};
