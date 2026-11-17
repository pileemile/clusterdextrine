const express = require("express");
const mongoose = require("mongoose");
const { SpanStatusCode, trace } = require("@opentelemetry/api");
const Weather = require("../models/Weather");
const { subscribe, changed } = require("../sse/weatherEvents");
const { attributeBooking, readVisitorId, wantsMeasure } = require("../services/abService");
const { applyPdfHeaders, loadReleve, ownedPayload, publicError, readerFrom } = require("../pdf/releve");
const { NearbyError, nearbyResponse } = require("../geo/nearby");
const { internalError, writeError } = require("../security/errors");
const { pickCreate, pickUpdate } = require("../security/weatherInput");

const router = express.Router();

function parseObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }
  return new mongoose.Types.ObjectId(id);
}

// Les valeurs "missing" sont les sentinelles du dataset officiel (ex. 999.9 = non mesuré).
const SORTS = {
  ts: { path: "ts" },
  temp: { path: "airTemperature.value", missing: 999.9 },
  pressure: { path: "pressure.value", missing: 9999.9 },
  wind: { path: "wind.speed.rate", missing: 999.9 },
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function labDelayMs(q) {
  // Profil lab : ralentit certaines recherches pour tester abort + génération.
  if (q.length === 2) return 1200;
  if (q.length === 3) return 100;
  return 180;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Liste (pagination, filtre st exact, recherche q, tri)
router.get("/", async (req, res) => {
  const nearby =
    req.query.lon !== undefined ||
    req.query.radiusKm !== undefined ||
    (req.query.lat !== undefined && req.query.lng === undefined);
  if (nearby) {
    try {
      const page = await nearbyResponse(req.query);
      return res.json(page);
    } catch (err) {
      if (err instanceof NearbyError) return res.status(400).json({ error: err.message });
      return res.status(500).json({ error: "Recherche impossible." });
    }
  }

  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    // Chaîne seulement : ?st=a&st=b donnerait un tableau.
    if (typeof req.query.st === "string" && req.query.st) {
      filter.st = req.query.st;
    }

    const qRaw = req.query.q;
    const q = qRaw === undefined || qRaw === null ? "" : String(qRaw).trim();

    // Validation serveur quand q est fourni (contrat TP recherche réactive)
    if (qRaw !== undefined && qRaw !== null && qRaw !== "") {
      if (q.length < 2) {
        return res.status(400).json({ error: "Le paramètre q doit contenir au moins 2 caractères." });
      }
      if (q.length > 60) {
        return res.status(400).json({ error: "Le paramètre q ne doit pas dépasser 60 caractères." });
      }
      if (q.toLowerCase() === "erreur") {
        await sleep(180);
        const span = trace.getActiveSpan();
        const failure = new Error("Service temporairement indisponible (simulation lab).");
        if (span) {
          span.recordException(failure);
          span.setStatus({ code: SpanStatusCode.ERROR, message: failure.message });
        }
        const traceId = span?.spanContext().traceId;
        const ref = traceId && !/^0+$/.test(traceId) ? ` (réf. ${traceId})` : "";
        return res.status(503).json({ error: `Le service est momentanément indisponible.${ref}` });
      }
      await sleep(labDelayMs(q));
    }

    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ st: rx }, { callLetters: rx }];
    }

    const nearLat = Number(req.query.lat);
    const nearLng = Number(req.query.lng);
    if (req.query.lat !== undefined && req.query.lng !== undefined && Number.isFinite(nearLat) && Number.isFinite(nearLng)) {
      const km = Math.min(800, Math.max(20, Number(req.query.km) || 400));
      const dLat = km / 111;
      const cos = Math.cos((nearLat * Math.PI) / 180);
      const dLng = km / (111 * Math.max(0.2, Math.abs(cos)));
      filter["position.coordinates.1"] = { $gte: nearLat - dLat, $lte: nearLat + dLat };
      filter["position.coordinates.0"] = { $gte: nearLng - dLng, $lte: nearLng + dLng };
    }

    let sort = { _id: 1 };
    if (req.query.sort) {
      const raw = String(req.query.sort);
      const key = raw.replace(/^-/, "");
      const def = SORTS[key];
      if (!def) {
        return res.status(400).json({ error: `Tri inconnu : ${key}` });
      }
      sort = { [def.path]: raw.startsWith("-") ? -1 : 1, _id: 1 };
      if (def.missing !== undefined) {
        filter[def.path] = { $lt: def.missing };
      }
    }

    const [items, total] = await Promise.all([
      Weather.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Weather.countDocuments(filter),
    ]);

    res.json({
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      query: q || undefined,
      data: items,
    });
  } catch (err) {
    internalError(res, err, "Liste des relevés");
  }
});

// Flux SSE — avant /:id pour ne pas être capturé comme un ObjectId
router.get("/events", (req, res) => {
  subscribe(req, res);
});

router.get("/:id/releve.pdf", async (req, res) => {
  try {
    const file = await loadReleve(req.params.id, readerFrom(req));
    applyPdfHeaders(res, file, String(req.query.download) === "true");
    res.status(200).end(file.pdf);
  } catch (err) {
    const out = publicError(err);
    if (out.status === 500) console.error("Fiche PDF:", err.message);
    if (!res.headersSent) res.status(out.status).json(out.body);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ID invalide" });
    }

    const doc = await Weather.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ error: "Rapport météo introuvable" });
    }
    res.json(doc);
  } catch (err) {
    internalError(res, err, "Lecture d'un relevé");
  }
});

router.post("/", async (req, res) => {
  const tracer = trace.getTracer("ciel");
  await tracer.startActiveSpan("ciel.releve", async (span) => {
    try {
      const st = req.body?.st;
      if (st) span.setAttribute("ciel.station.id", String(st));
      const ts = req.body?.ts ? new Date(req.body.ts) : null;
      if (st && ts && !Number.isNaN(ts.getTime())) {
        const taken = await Weather.exists({ st, ts, tenantId: req.tenant._id });
        if (taken) {
          res.status(409).json({ error: "Ce relevé existe déjà pour cette station et cette heure." });
          return;
        }
      }

      const input = pickCreate(req.body);
      if (!input.st || !input.ts) {
        res.status(400).json({ error: "Les champs st et ts sont requis." });
        return;
      }
      const created = await Weather.create(ownedPayload(input, readerFrom(req)));
      span.setAttribute("ciel.reading.id", String(created._id));
      changed({ id: created._id, action: "created" });

      if (wantsMeasure(req)) {
        try {
          await attributeBooking(readVisitorId(req));
        } catch (err) {
          console.error("Attribution A/B ignorée:", err.message);
        }
      }

      res.status(201).json(created);
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      writeError(res, err, "Création d'un relevé", "Ce relevé existe déjà pour cette station et cette heure.");
    } finally {
      span.end();
    }
  });
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ID invalide" });
    }

    const changes = pickUpdate(req.body);
    if (!Object.keys(changes).length) {
      return res.status(400).json({ error: "Aucune modification valide." });
    }
    const updated = await Weather.findByIdAndUpdate(
      id,
      { $set: changes },
      { returnDocument: "after", runValidators: false }
    ).lean();

    if (!updated) {
      return res.status(404).json({ error: "Rapport météo introuvable" });
    }
    changed({ id: updated._id, action: "updated" });
    res.json(updated);
  } catch (err) {
    writeError(res, err, "Modification d'un relevé", "Ce relevé existe déjà pour cette station et cette heure.");
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ID invalide" });
    }

    const deleted = await Weather.findByIdAndDelete(id).lean();
    if (!deleted) {
      return res.status(404).json({ error: "Rapport météo introuvable" });
    }
    changed({ id: req.params.id, action: "deleted" });
    res.json({ message: "Supprimé", id: req.params.id });
  } catch (err) {
    internalError(res, err, "Suppression d'un relevé");
  }
});

module.exports = router;
