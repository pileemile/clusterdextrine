const swaggerUi = require("swagger-ui-express");

const spec = {
  openapi: "3.0.3",
  info: {
    title: "API sample_weatherdata",
    description:
      "CRUD sur la collection MongoDB officielle `sample_weatherdata.data` (rapports météo).",
    version: "1.0.0",
  },
  servers: [{ url: "http://localhost:3000", description: "Local" }],
  tags: [
    { name: "weather", description: "Rapports météo" },
    { name: "ab", description: "Test A/B du libellé « Nouveau relevé »" },
  ],
  paths: {
    "/api/weather": {
      get: {
        tags: ["weather"],
        summary: "Lister les rapports météo",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: "st",
            in: "query",
            description: "Filtrer par identifiant de station",
            schema: { type: "string", example: "x+47600-047900" },
          },
          {
            name: "q",
            in: "query",
            description: "Recherche partielle (insensible à la casse) sur `st` et `callLetters`",
            schema: { type: "string", example: "VCSZ" },
          },
          {
            name: "lat",
            in: "query",
            description: "Latitude d'une ville. Avec lng, limite aux relevés proches.",
            schema: { type: "number", example: 52.37 },
          },
          {
            name: "lng",
            in: "query",
            description: "Longitude d'une ville. Avec lat, limite aux relevés proches.",
            schema: { type: "number", example: 4.9 },
          },
          {
            name: "km",
            in: "query",
            description: "Rayon en kilomètres autour de lat/lng. Défaut 400, maximum 800.",
            schema: { type: "number", default: 400 },
          },
          {
            name: "sort",
            in: "query",
            description:
              "Tri : `ts`, `temp`, `pressure`, `wind` (préfixe `-` = décroissant). Les valeurs non mesurées sont exclues.",
            schema: {
              type: "string",
              enum: ["ts", "-ts", "temp", "-temp", "pressure", "-pressure", "wind", "-wind"],
            },
          },
        ],
        responses: {
          200: {
            description: "Liste paginée",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WeatherListResponse" },
              },
            },
          },
          500: {
            description: "Erreur serveur",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      post: {
        tags: ["weather"],
        summary: "Créer un rapport météo",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WeatherReport" },
              example: {
                st: "x+47600-047900",
                ts: "1984-03-05T13:00:00.000Z",
                callLetters: "VCSZ",
                type: "FM-13",
                airTemperature: { value: 4.8, quality: "1" },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Document créé",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WeatherReport" },
              },
            },
          },
          400: {
            description: "Corps invalide",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          409: {
            description: "Un relevé existe déjà pour cette station et cette heure. Aucune conversion n'est comptée.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
        parameters: [
          {
            name: "X-AB-Measure",
            in: "header",
            required: false,
            description: "Présent (1) seulement si le visiteur est dans l'expérience. N'autorise pas à choisir A ou B.",
            schema: { type: "string", example: "1" },
          },
        ],
      },
    },
    "/api/weather/{id}": {
      get: {
        tags: ["weather"],
        summary: "Obtenir un rapport par ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", example: "5553a998e4b02cf7151190b8" },
          },
        ],
        responses: {
          200: {
            description: "Document trouvé",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WeatherReport" },
              },
            },
          },
          400: {
            description: "ID invalide",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          404: {
            description: "Introuvable",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      put: {
        tags: ["weather"],
        summary: "Mettre à jour un rapport",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WeatherReport" },
            },
          },
        },
        responses: {
          200: {
            description: "Document mis à jour",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WeatherReport" },
              },
            },
          },
          400: {
            description: "ID ou corps invalide",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          404: {
            description: "Introuvable",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["weather"],
        summary: "Supprimer un rapport",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Supprimé",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DeleteResponse" },
              },
            },
          },
          400: {
            description: "ID invalide",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          404: {
            description: "Introuvable",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/ab/assignment": {
      get: {
        tags: ["ab"],
        summary: "Affecter une variante stable (cookie ab_visitor)",
        responses: {
          200: {
            description: "Variante A ou B. Cache-Control: no-store. Expérience arrêtée : A, sans nouvelle affectation.",
          },
        },
      },
    },
    "/api/ab/exposure": {
      post: {
        tags: ["ab"],
        summary: "Déclarer la première exposition du visiteur",
        responses: {
          204: { description: "Enregistrée, ou déjà enregistrée sans changer la date" },
        },
      },
    },
    "/api/ab/metrics": {
      get: {
        tags: ["ab"],
        summary: "Effectifs et taux par variante",
        responses: {
          200: {
            description: "assigned, exposed, converted, bookings. rate vaut null si exposed est 0.",
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
      DeleteResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "Supprimé" },
          id: { type: "string" },
        },
      },
      WeatherListResponse: {
        type: "object",
        properties: {
          page: { type: "integer" },
          limit: { type: "integer" },
          total: { type: "integer" },
          pages: { type: "integer" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/WeatherReport" },
          },
        },
      },
      WeatherReport: {
        type: "object",
        description: "Document météo (schéma flexible, champs imbriqués possibles).",
        additionalProperties: true,
        properties: {
          _id: { type: "string" },
          st: { type: "string" },
          ts: { type: "string", format: "date-time" },
          callLetters: { type: "string" },
          type: { type: "string", example: "FM-13" },
          elevation: { type: "number" },
          position: {
            type: "object",
            properties: {
              type: { type: "string", example: "Point" },
              coordinates: {
                type: "array",
                items: { type: "number" },
                minItems: 2,
                maxItems: 2,
              },
            },
          },
          airTemperature: {
            type: "object",
            properties: {
              value: { type: "number" },
              quality: { type: "string" },
            },
          },
        },
      },
    },
  },
};

function setupSwagger(app) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec));
  app.get("/api-docs.json", (_req, res) => res.json(spec));
}

module.exports = { setupSwagger, spec };
