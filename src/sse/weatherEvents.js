/**
 * Diffuseur SSE pour synchroniser les écrans sur les changements météo.
 * Contrat aligné sur le TP : ready, weather-updated, keepalive 15s.
 */

const { getTenant } = require("../tenant/context");

const clients = new Map();
const HEARTBEAT_MS = 15_000;

function writeEvent(res, { event, data, id }) {
  if (id != null) res.write(`id: ${id}\n`);
  if (event) res.write(`event: ${event}\n`);
  res.write(`data: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`);
}

function remove(res) {
  if (!clients.has(res)) return;
  clients.delete(res);
  try {
    res.end();
  } catch {
    /* déjà fermé */
  }
}

function sendSafe(res, payload) {
  try {
    writeEvent(res, payload);
  } catch {
    remove(res);
  }
}

let eventSeq = 0;

function subscribe(req, res) {
  const tenant = req.tenant ?? getTenant();
  if (!tenant) {
    res.status(400).json({ error: "Tenant manquant pour le flux d'événements." });
    return res;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  clients.set(res, String(tenant._id));

  sendSafe(res, {
    event: "ready",
    data: { action: "reload" },
    id: ++eventSeq,
  });

  const onClose = () => remove(res);
  req.on("close", onClose);
  req.on("aborted", onClose);
  res.on("error", onClose);

  return res;
}

/**
 * Diffuse un changement. Payload minimal (pas de document complet).
 * @param {{ id: string, action: 'created'|'updated'|'deleted' }} change
 */
function changed(change) {
  const tenant = getTenant();
  if (!tenant) return;
  const tenantId = String(tenant._id);

  const payload = {
    event: "weather-updated",
    data: {
      id: String(change.id),
      action: change.action,
    },
    id: ++eventSeq,
  };
  for (const [res, clientTenantId] of [...clients]) {
    if (clientTenantId === tenantId) sendSafe(res, payload);
  }
}

function heartbeat() {
  for (const res of [...clients.keys()]) {
    try {
      res.write(": keepalive\n\n");
    } catch {
      remove(res);
    }
  }
}

setInterval(heartbeat, HEARTBEAT_MS).unref();

module.exports = { subscribe, changed, clients };
