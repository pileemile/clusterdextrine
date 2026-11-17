/**
 * Crée une session pour un utilisateur existant et affiche le cookie à utiliser.
 * Sert à tester la connexion avec les comptes fictifs du seeder, qui n'ont pas de
 * compte Google. Aucune route HTTP : il faut l'accès à la base pour s'en servir.
 *
 * Usage : node scripts/dev-session.js membre@clusterdextrine.test
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../src/config/db");
const User = require("../src/models/User");
const { createSession } = require("../src/auth/session");

async function main() {
  const email = String(process.argv[2] || "").trim().toLowerCase();
  if (!email) {
    console.error("Usage : node scripts/dev-session.js <email>");
    process.exitCode = 1;
    return;
  }

  await connectDB();
  const user = await User.findOne({ email }).select("_id email name").lean();
  if (!user) {
    console.error(`Aucun utilisateur ${email}. Lancez d'abord : npm run seed`);
    process.exitCode = 1;
    return;
  }

  const token = await createSession(user._id);
  console.log(`Session créée pour ${user.name} (${user.email}), valable 7 jours.\n`);
  console.log("Navigateur : DevTools > Application > Cookies > http://localhost:3000, ajouter :");
  console.log(`  Nom    : ciel_session`);
  console.log(`  Valeur : ${token}`);
  console.log("puis recharger la page.\n");
  console.log("curl :");
  console.log(`  -H "Cookie: ciel_session=${token}"`);
}

main()
  .catch((err) => {
    console.error("Échec :", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
