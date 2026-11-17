require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../src/config/db");
const Tenant = require("../src/models/Tenant");
const User = require("../src/models/User");
const Membership = require("../src/models/Membership");

const TENANTS = [
  {
    slug: "observatoire-alpes",
    name: "Observatoire des Alpes",
    address: "Grenoble",
    color: "#2563eb",
  },
  {
    slug: "station-littoral",
    name: "Station du Littoral",
    address: "La Rochelle",
    color: "#16a34a",
  },
];

async function seedTenants() {
  const result = [];
  for (const { slug, ...fields } of TENANTS) {
    const tenant = await Tenant.findOneAndUpdate(
      { slug },
      { $set: fields, $setOnInsert: { slug } },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
    ).lean();
    result.push(tenant);
  }
  return result;
}

const USERS = [
  { email: "membre@clusterdextrine.test", name: "Membre des deux", tenants: ["observatoire-alpes", "station-littoral"] },
  { email: "autre@clusterdextrine.test", name: "Membre des Alpes", tenants: ["observatoire-alpes"] },
];

// Votre propre compte Google, lu dans .env (jamais commité) : pas de donnée réelle dans le code.
// SEED_MY_EMAIL=vous@gmail.com   SEED_MY_TENANTS=observatoire-alpes,station-littoral
const MY_EMAIL = String(process.env.SEED_MY_EMAIL || "").trim().toLowerCase();
if (MY_EMAIL) {
  const known = new Set(TENANTS.map((t) => t.slug));
  const slugs = String(process.env.SEED_MY_TENANTS || "observatoire-alpes")
    .split(",")
    .map((slug) => slug.trim())
    .filter((slug) => known.has(slug));
  USERS.push({ email: MY_EMAIL, name: MY_EMAIL.split("@")[0], tenants: slugs });
}

async function seedUsers(tenants) {
  const idBySlug = new Map(tenants.map((t) => [t.slug, t._id]));
  const result = [];
  for (const { email, name, tenants: slugs } of USERS) {
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { name }, $setOnInsert: { email } },
      { upsert: true, returnDocument: "after", runValidators: true }
    ).lean();
    for (const slug of slugs) {
      await Membership.updateOne(
        { userId: user._id, tenantId: idBySlug.get(slug) },
        { $setOnInsert: { userId: user._id, tenantId: idBySlug.get(slug) } },
        { upsert: true }
      );
    }
    result.push({ ...user, slugs });
  }
  return result;
}

async function main() {
  await connectDB();
  await Promise.all([Tenant.init(), User.init(), Membership.init()]);

  const tenants = await seedTenants();
  console.log(`${tenants.length} tenants prêts :`);
  for (const t of tenants) {
    console.log(`  ${t.slug.padEnd(20)} ${t._id}  ${t.name}`);
  }

  const users = await seedUsers(tenants);
  console.log(`${users.length} utilisateurs fictifs prêts :`);
  for (const u of users) {
    console.log(`  ${u.email.padEnd(30)} ${u.slugs.join(", ")}`);
  }
}

main()
  .catch((err) => {
    console.error("Seed échoué :", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
