const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
    {
        email: { type: String, enum: ["A", "B"], required: true },
        address: { type: String, default: "" },
        name: { type: String, default: "" },
        color: { type: String, default: "grey" },
        createdAt: { type: Date, default: Date.now() },
        lastUpdatedAt: { type: Date, required: Date.now() },
    },
    {
        collection: "tenant",
        versionKey: false,
    }
);

module.exports = mongoose.model("tenant", tenantSchema);
