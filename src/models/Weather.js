const mongoose = require("mongoose");
const { tenantPlugin } = require("../tenant/plugin");

// Schéma flexible : les documents officiels ont beaucoup de champs imbriqués.
const weatherSchema = new mongoose.Schema(
  {
    st: String,
    ts: Date,
    callLetters: String,
    type: String,
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", index: true },
  },
  {
    collection: "data",
    strict: false,
    versionKey: false,
  }
);
weatherSchema.index(
  { tenantId: 1, st: 1, ts: 1 },
  { unique: true, partialFilterExpression: { tenantId: { $exists: true } } }
);
weatherSchema.plugin(tenantPlugin, { sharedReads: true });

module.exports = mongoose.model("Weather", weatherSchema);
