const { rateLimit } = require("express-rate-limit");

/**
 * Limites de débit, par adresse IP.
 *
 * Pas de app.set("trust proxy") : sans proxy devant l'app, l'activer permettrait
 * à un attaquant de changer d'IP à volonté avec un faux en-tête X-Forwarded-For.
 * Le stockage est en mémoire : les compteurs repartent à zéro au redémarrage.
 */

const MINUTE = 60 * 1000;
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function limiter({ windowMs, limit, ...options }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8", // en-tête RateLimit : le client sait quand réessayer
    legacyHeaders: false,
    message: { error: "Trop de requêtes, réessayez dans un instant." },
    ...options,
  });
}

/** Toute l'API. Le flux SSE est une connexion longue : il n'est pas compté. */
const apiLimiter = limiter({
  windowMs: MINUTE,
  limit: 120,
  skip: (req) => req.path.endsWith("/events") && req.method === "GET",
});

/** Écritures (création, modification, suppression), en plus de la limite générale. */
const writeLimiter = limiter({
  windowMs: MINUTE,
  limit: 30,
  skip: (req) => !WRITE_METHODS.has(req.method),
});

/** Connexion Google (début et retour OAuth). */
const loginLimiter = limiter({ windowMs: 15 * MINUTE, limit: 10 });

/**
 * Code 2FA : 6 chiffres, devinable sans limite. Seuls les échecs comptent,
 * donc un administrateur qui se trompe une fois n'est pas bloqué.
 */
const twoFactorLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 5,
  skipSuccessfulRequests: true,
  message: { error: "too_many_attempts" },
});

/** Proxy de télémétrie vers le collecteur : évite de s'en servir pour l'inonder. */
const telemetryLimiter = limiter({ windowMs: MINUTE, limit: 60 });

module.exports = { apiLimiter, writeLimiter, loginLimiter, twoFactorLimiter, telemetryLimiter };
