const mongoose = require("mongoose");

const SLUG = /^[a-z0-9-]{2,40}$/;
const COLOR = /^#[0-9a-f]{6}$/i;

const tenantSchema = new mongoose.Schema(
    {
        // Identifiant public : URL (/c/:slug/) et en-tête X-Tenant.
        slug: { type: String, required: true, unique: true, trim: true, lowercase: true, match: SLUG },
        name: { type: String, required: true, trim: true },
        address: { type: String, default: "" },
        color: { type: String, default: "#6b7280", match: COLOR },
    },
    {
        collection: "tenant",
        versionKey: false,
        // Ajoute createdAt et updatedAt automatiquement.
        timestamps: true,
    }
);

module.exports = mongoose.model("Tenant", tenantSchema);
module.exports.SLUG = SLUG;
