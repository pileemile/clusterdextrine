const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Tenant = require("../src/models/Tenant");
const User = require("../src/models/User");
const Membership = require("../src/models/Membership");

const BOTH = "membre@clusterdextrine.test";
const ONLY_A = "autre@clusterdextrine.test";

let mongo;

async function startDb() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  const [a, b] = await Tenant.create([
    { slug: "observatoire-a", name: "Observatoire A", color: "#1f6feb" },
    { slug: "observatoire-b", name: "Observatoire B", color: "#d97706" },
  ]);
  const [both, onlyA] = await User.create([
    { email: BOTH, name: "Membre des deux" },
    { email: ONLY_A, name: "Membre de A" },
  ]);
  await Membership.create([
    { userId: both._id, tenantId: a._id },
    { userId: both._id, tenantId: b._id },
    { userId: onlyA._id, tenantId: a._id },
  ]);
}

async function stopDb() {
  await mongoose.disconnect();
  await mongo.stop();
}

module.exports = { BOTH, ONLY_A, startDb, stopDb };
