const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

let client;

function getPrisma() {
  if (client) return client;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL manquant dans .env");
  }
  client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  return client;
}

module.exports = { getPrisma };
