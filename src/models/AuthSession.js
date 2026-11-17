const mongoose = require("mongoose");

const authSessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    expiresAt: { type: Date, required: true },
    twoFactorAt: { type: Date, default: null },
  },
  { collection: "auth_sessions", versionKey: false, timestamps: true }
);

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("AuthSession", authSessionSchema);
