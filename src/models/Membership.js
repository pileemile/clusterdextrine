const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
  },
  {
    collection: "memberships",
    versionKey: false,
  }
);

membershipSchema.index({ userId: 1, tenantId: 1 }, { unique: true });

module.exports = mongoose.model("Membership", membershipSchema);
