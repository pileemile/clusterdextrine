require("./instrumentation");
require("dotenv").config();
const http = require("http");
const path = require("path");
const express = require("express");
const cors = require("cors");
const { trace } = require("@opentelemetry/api");
const { connectDB } = require("./config/db");
const { setupSwagger } = require("./config/swagger");
const { attachReader } = require("./pdf/releve");
const weatherRoutes = require("./routes/weatherRoutes");
const abRoutes = require("./routes/abRoutes");
const tenantRoutes = require("./routes/tenantRoutes");
const { tenantMiddleware, requireMemberToWrite } = require("./tenant/middleware");
const googleRoutes = require("./routes/googleRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const logRoutes = require("./routes/logRoutes");
const {
  apiLimiter,
  writeLimiter,
  loginLimiter,
  twoFactorLimiter,
  telemetryLimiter,
} = require("./security/rateLimits");
const { securityHeaders } = require("./security/headers");
const { finalErrorHandler } = require("./security/errors");

// Documentation de l'API (Swagger et liste des routes) : désactivée par défaut,
// elle donne à un attaquant la carte de toutes les routes. API_DOCS=on dans .env pour l'activer.
const API_DOCS = process.env.API_DOCS === "on";

const app = express();
const PORT = process.env.PORT || 3000;

// Le front est servi par ce même process : aucune origine tierce.
app.use(cors({ origin: false }));

if (API_DOCS) setupSwagger(app);
app.use(securityHeaders());
// Même origine que la page : /otlp/ part au collecteur, le préfixe est retiré.
app.use("/otlp", telemetryLimiter, express.raw({ type: () => true, limit: "1mb" }), (req, res) => {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://127.0.0.1:4318";
  const target = new URL(req.url, endpoint.endsWith("/") ? endpoint : `${endpoint}/`);
  const headers = { ...req.headers, host: target.host };
  delete headers.cookie;
  delete headers.authorization;
  if (Buffer.isBuffer(req.body)) headers["content-length"] = String(Buffer.byteLength(req.body));
  const proxyReq = http.request(target, { method: req.method, headers }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on("error", () => {
    if (!res.headersSent) res.status(502).end();
  });
  proxyReq.end(Buffer.isBuffer(req.body) ? req.body : undefined);
});

app.use((req, res, next) => {
  attachReader(req, res);
  next();
});

app.use((req, res, next) => {
  const span = trace.getActiveSpan();
  const traceId = span?.spanContext().traceId;
  if (traceId && !/^0+$/.test(traceId)) res.setHeader("X-Trace-Id", traceId);
  next();
});

app.use("/api", apiLimiter, writeLimiter);
app.use(["/api/google/auth", "/api/google/callback"], loginLimiter);
app.use("/api/auth/2fa/verify", twoFactorLimiter);

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/c/:slug{/*rest}", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.get("/api", (_req, res, next) => {
  if (!API_DOCS) return next();
  res.json({
    name: "API sample_weatherdata",
    collection: "data",
    endpoints: {
      list: "GET /api/weather?page=1&limit=20&st=&q=&sort=-temp",
      nearby: "GET /api/weather?lat=&lon=&radiusKm=5&page=0&size=6",
      one: "GET /api/weather/:id",
      releve: "GET /api/weather/:id/releve.pdf?download=true",
      events: "GET /api/weather/events (SSE)",
      create: "POST /api/weather",
      update: "PUT /api/weather/:id",
      delete: "DELETE /api/weather/:id",
      abAssignment: "GET /api/ab/assignment",
      abExposure: "POST /api/ab/exposure",
      abMetrics: "GET /api/ab/metrics",
      googleAuth: "GET /api/google/auth",
      googleStatus: "GET /api/google/status",
      googleDisconnect: "DELETE /api/google/disconnect",
      googleEvents: "GET /api/google/events?timeMin=&timeMax=",
      googleCreateEvent: "POST /api/google/events",
      googleUpdateEvent: "PATCH /api/google/events/:id",
      googleDeleteEvent: "DELETE /api/google/events/:id",
    },
    swagger: {
      ui: "/api-docs",
      json: "/api-docs.json",
    },
  });
});

app.use("/api/tenants", tenantRoutes);
app.use("/api/google", googleRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ab", tenantMiddleware, abRoutes);
app.use("/api/weather", tenantMiddleware, requireMemberToWrite, weatherRoutes);

app.use("/api", (_req, res) => res.status(404).json({ error: "Route introuvable." }));
app.use(finalErrorHandler);

if (require.main === module) {
  connectDB()
    .then(async () => {
      const User = require("./models/User");
      await User.syncIndexes();
      app.listen(PORT, () => {
        console.log(`Front : http://localhost:${PORT}`);
        if (API_DOCS) console.log(`Swagger UI : http://localhost:${PORT}/api-docs`);
      });
    })
    .catch((err) => {
      console.error("Connexion MongoDB échouée:", err.message);
      process.exit(1);
    });
}

module.exports = app;
