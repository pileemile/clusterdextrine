const express = require("express");
const mongoose = require("mongoose");
const Weather = require("../models/Weather");
const { subscribe, changed } = require("../sse/weatherEvents");

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

// Liste (pagination, filtre st exact, recherche q, tri)
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.st) {
      filter.st = req.query.st;
    }

    const q = String(req.query.q ?? "").trim();
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ st: rx }, { callLetters: rx }];
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
      data: items,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Flux SSE — avant /:id pour ne pas être capturé comme un ObjectId
router.get("/events", (req, res) => {
  subscribe(req, res);
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
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const created = await Weather.create(req.body);
    changed({ id: created._id, action: "created" });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ID invalide" });
    }

    const updated = await Weather.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: false }
    ).lean();

    if (!updated) {
      return res.status(404).json({ error: "Rapport météo introuvable" });
    }
    changed({ id: updated._id, action: "updated" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
