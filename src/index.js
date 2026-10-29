require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./config/db");
const { setupSwagger } = require("./config/swagger");
const weatherRoutes = require("./routes/weatherRoutes");
const abRoutes = require("./routes/abRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Le front est servi par ce même process : aucune origine tierce.
app.use(cors({ origin: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api", (_req, res) => {
  res.json({
    name: "API sample_weatherdata",
    collection: "data",
    endpoints: {
      list: "GET /api/weather?page=1&limit=20&st=&q=&sort=-temp",
      one: "GET /api/weather/:id",
      events: "GET /api/weather/events (SSE)",
      create: "POST /api/weather",
      update: "PUT /api/weather/:id",
      delete: "DELETE /api/weather/:id",
      abAssignment: "GET /api/ab/assignment",
      abExposure: "POST /api/ab/exposure",
      abMetrics: "GET /api/ab/metrics",
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
