require("dotenv").config();
const { connectDB } = require("../src/config/db");
const User = require("../src/models/User");

const email = String(process.argv[2] || "").trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: npm run admin:grant -- user@example.com");
  process.exit(2);
}

connectDB()
  .then(async () => {
    const configuredAdmin = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    if (!configuredAdmin || email !== configuredAdmin) {
      throw new Error("Cette adresse ne correspond pas à ADMIN_EMAIL.");
    }
    const currentAdmin = await User.findOne({ role: "admin" }).select("email").lean();
    if (currentAdmin && currentAdmin.email !== email) {
      throw new Error(`Un seul admin est autorisé : ${currentAdmin.email}`);
    }
    const user = await User.findOneAndUpdate({ email }, { $set: { role: "admin" } }, { returnDocument: "after" })
      .select("email name role")
      .lean();
    if (!user) throw new Error("Utilisateur introuvable : connectez-vous d'abord avec Google.");
    console.log(`Admin accordé à ${user.email}`);
  })
  .catch((err) => {
    console.error("Création admin échouée :", err.message);
    process.exitCode = 1;
  })
  .finally(() => require("mongoose").disconnect());
