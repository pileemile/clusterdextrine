const AdminLog = require("../models/AdminLog");

/** Écrit une ligne de journal. Ne bloque jamais la réponse HTTP. */
function log({ level = "info", action, who = "—", detail = "" }) {
  const row = {
    level: ["info", "warn", "error"].includes(level) ? level : "info",
    action: String(action || "inconnu").slice(0, 80),
    who: String(who || "—").slice(0, 120),
    detail: String(detail || "").slice(0, 500),
  };
  AdminLog.create(row).catch((err) => console.error("admin log:", err.message));
}

function whoFrom(req) {
  return req?.user?.email || "—";
}

module.exports = { log, whoFrom };
