/**
 * Réponses d'erreur sans détail interne : le vrai message part dans les logs du
 * serveur, le client ne reçoit qu'un message générique.
 */

const CLIENT_ERRORS = new Set(["ValidationError", "CastError", "StrictModeError", "BSONError"]);

function internalError(res, err, context) {
  console.error(`${context} :`, err);
  if (!res.headersSent) res.status(500).json({ error: "Erreur interne." });
}

/** Après une écriture Mongoose : doublon → 409, données refusées → 400, sinon 500. */
function writeError(res, err, context, duplicateMessage = "Cet élément existe déjà.") {
  if (res.headersSent) return;
  if (err?.code === 11000) return res.status(409).json({ error: duplicateMessage });
  if (CLIENT_ERRORS.has(err?.name)) return res.status(400).json({ error: "Données invalides." });
  return internalError(res, err, context);
}

/** Dernier filet : toute erreur non attrapée par une route (Express 5 y envoie aussi les async). */
function finalErrorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode;
  if (status === 413) return res.status(413).json({ error: "Requête trop volumineuse." });
  if (status >= 400 && status < 500) return res.status(status).json({ error: "Requête invalide." });
  return internalError(res, err, `${req.method} ${req.path}`);
}

module.exports = { internalError, writeError, finalErrorHandler };
