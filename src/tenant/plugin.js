const { getTenant } = require("./context");

const READS = ["find", "findOne", "countDocuments", "distinct"];
const WRITES = [
  "findOneAndUpdate",
  "findOneAndReplace",
  "findOneAndDelete",
  "updateOne",
  "updateMany",
  "replaceOne",
  "deleteOne",
  "deleteMany",
];

function currentTenantId() {
  const tenant = getTenant();
  if (!tenant) {
    throw new Error("Aucun tenant dans le contexte : requête refusée.");
  }
  return tenant._id;
}

function stripTenantId(update) {
  if (!update || Array.isArray(update)) return;
  delete update.tenantId;
  for (const op of ["$set", "$setOnInsert", "$unset", "$rename"]) {
    if (update[op]) delete update[op].tenantId;
  }
}

function tenantPlugin(schema, { sharedReads = false } = {}) {
  schema.pre(READS, function () {
    const tenantId = currentTenantId();
    if (sharedReads) {
      this.and([{ $or: [{ tenantId }, { tenantId: { $exists: false } }] }]);
    } else {
      this.where({ tenantId });
    }
  });

  schema.pre(WRITES, function () {
    this.where({ tenantId: currentTenantId() });
    stripTenantId(this.getUpdate());
  });

  schema.pre("save", function () {
    const tenantId = currentTenantId();
    if (this.isNew) {
      this.tenantId = tenantId; // écrase toute valeur venue du corps de la requête
    } else if (!this.tenantId || !this.tenantId.equals(tenantId)) {
      throw new Error("Document d'un autre tenant : enregistrement refusé.");
    }
  });

  schema.pre("insertMany", function (docs) {
    const tenantId = currentTenantId();
    for (const doc of [].concat(docs)) doc.tenantId = tenantId;
  });
  schema.pre("estimatedDocumentCount", function () {
    throw new Error("estimatedDocumentCount ignore le tenant : utiliser countDocuments.");
  });
}

module.exports = { tenantPlugin };
