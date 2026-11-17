const mongoose = require("mongoose");

const adminLogSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now, index: true },
    level: { type: String, enum: ["info", "warn", "error"], default: "info" },
    action: { type: String, required: true, trim: true },
    who: { type: String, default: "—", trim: true },
    detail: { type: String, default: "", trim: true },
  },
  {
    collection: "admin_logs",
    versionKey: false,
  }
);

module.exports = mongoose.model("AdminLog", adminLogSchema);
