const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    twoFactorSecret: { type: String, default: null },
    twoFactorEnabled: { type: Boolean, default: false },
    recoveryCodeHashes: { type: [String], default: [] },
  },
  {
    collection: "users",
    versionKey: false,
    timestamps: true,
  }
);

userSchema.index({ role: 1 }, { unique: true, partialFilterExpression: { role: "admin" } });

module.exports = mongoose.model("User", userSchema);
