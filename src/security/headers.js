const helmet = require("helmet");

/**
 * En-têtes de sécurité (helmet) et Content Security Policy.
 * La CSP liste tout ce que les pages chargent ; le reste est bloqué par le navigateur.
 */

// L'agenda embarque le compilateur de templates Vue, qui utilise new Function :
// eval n'est autorisé que sur cette page.
const EVAL_PAGES = new Set(["/agenda.html"]);

function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false, // pas d'upgrade-insecure-requests : l'app tourne aussi en http sur le réseau local
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"], // pas d'intégration dans une iframe (clickjacking)
        formAction: ["'self'"],
        scriptSrc: ["'self'", "https://unpkg.com", (req) => (EVAL_PAGES.has(req.path) ? "'unsafe-eval'" : "'self'")],
        scriptSrcAttr: ["'none'"], // aucun onclick="..." dans le HTML
        // 'unsafe-inline' pour les attributs style="..." (Leaflet, boussole) et les styles de FullCalendar
        styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"], // data: : icônes de FullCalendar
        imgSrc: ["'self'", "data:", "https://tile.openstreetmap.org", "https://unpkg.com"],
        connectSrc: ["'self'", "https://data.geopf.fr"],
      },
    },
    // OpenStreetMap refuse les tuiles sans Referer : on envoie l'origine, pas l'URL complète.
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  });
}

module.exports = { securityHeaders };
