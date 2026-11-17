const { AsyncLocalStorage } = require("node:async_hooks");

/**
 * Tenant courant, pour la duree d'une requete
 */
const storage = new AsyncLocalStorage();

function runWithTenant(tenant, fn) {
  return storage.run(tenant, fn);
}
function getTenant() {
  return storage.getStore() ?? null;
}

module.exports = { runWithTenant, getTenant };