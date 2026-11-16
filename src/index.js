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
const googleRoutes = require("./routes/googleRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Le front est servi par ce même process : aucune origine tierce.
app.use(cors({ origin: false }));

// Même origine que la page : /otlp/ part au collecteur, le préfixe est retiré.
app.use("/otlp", express.raw({ type: () => true, limit: "1mb" }), (req, res) => {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://127.0.0.1:4318";
  const target = new URL(req.url, endpoint.endsWith("/") ? endpoint : `${endpoint}/`);
  const headers = { ...req.headers, host: target.host };
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

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api", (_req, res) => {
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
    },
    swagger: {
      ui: "/api-docs",
      json: "/api-docs.json",
    },
  });
});

setupSwagger(app);
app.use("/api/ab", abRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/google", googleRoutes);

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Front : http://localhost:${PORT}`);
      console.log(`Swagger UI : http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((err) => {
    console.error("Connexion MongoDB échouée:", err.message);
    process.exit(1);
  });
