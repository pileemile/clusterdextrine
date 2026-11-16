const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Tenant = require("../src/models/Tenant");

let mongo;

async function startDb() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Tenant.create([
    { slug: "observatoire-a", name: "Observatoire A", color: "#1f6feb" },
    { slug: "observatoire-b", name: "Observatoire B", color: "#d97706" },
  ]);
}

async function stopDb() {
  await mongoose.disconnect();
  await mongo.stop();
}

module.exports = { startDb, stopDb };
