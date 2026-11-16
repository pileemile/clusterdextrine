require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../src/config/db");
const Tenant = require("../src/models/Tenant");

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

async function main() {
  await connectDB();
  await Tenant.init();

  const tenants = await seedTenants();
  console.log(`${tenants.length} tenants prêts :`);
  for (const t of tenants) {
    console.log(`  ${t.slug.padEnd(20)} ${t._id}  ${t.name}`);
  }
}

main()
  .catch((err) => {
    console.error("Seed échoué :", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
