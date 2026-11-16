const mongoose = require("mongoose");

const abAssignmentSchema = new mongoose.Schema(
  {
    experiment: { type: String, required: true },
    visitorId: { type: String, required: true },
    variant: { type: String, enum: ["A", "B"], required: true },
    bucket: { type: Number, required: true },
    exposed: { type: Boolean, default: false },
    exposedAt: Date,
    converted: { type: Boolean, default: false },
    convertedAt: Date,
    bookings: { type: Number, default: 0 },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
  },
  {
    collection: "ab_assignments",
    versionKey: false,
  }
);

abAssignmentSchema.index({ experiment: 1, visitorId: 1 }, { unique: true });

module.exports = mongoose.model("AbAssignment", abAssignmentSchema);
