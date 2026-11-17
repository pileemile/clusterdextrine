// aislop-ignore-file code-quality/duplicate-block -- OpenAPI responses are intentionally repetitive
const swaggerUi = require("swagger-ui-express");

function jsonSchema(ref) {
  return { "application/json": { schema: { $ref: ref } } };
}

function jsonRes(status, description, ref) {
  return { [status]: { description, content: jsonSchema(ref) } };
}

function idParam(example) {
  return {
    name: "id",
    in: "path",
    required: true,
    schema: example ? { type: "string", example } : { type: "string" },
  };
}

function weatherIdResponses(okStatus, okDesc, okRef, badRequest = "ID invalide") {
  return {
    ...jsonRes(okStatus, okDesc, okRef),
    ...jsonRes(400, badRequest, ERROR),
    ...jsonRes(404, "Introuvable", ERROR),
  };
}

function descOnly(status, description) {
  return { [status]: { description } };
}

const ERROR = "#/components/schemas/Error";
const WEATHER = "#/components/schemas/WeatherReport";
const DELETED = "#/components/schemas/DeleteResponse";
const LIST = "#/components/schemas/WeatherListResponse";

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
            description: "Latitude. Avec lng et km : boîte large. Avec lon et radiusKm : cercle, tri par distance.",
            schema: { type: "number", example: 52.37 },
          },
          {
            name: "lng",
            in: "query",
            description: "Longitude d'une ville. Avec lat, limite aux relevés proches.",
            schema: { type: "number", example: 4.9 },
          },
          {
            name: "lon",
            in: "query",
            description: "Longitude WGS 84, avec lat. De -180 à 180.",
            schema: { type: "number", example: 4.832 },
          },
          {
            name: "radiusKm",
            in: "query",
            description: "Rayon en kilomètres. Défaut 5, maximum 20. Absent avec lng.",
            schema: { type: "number", default: 5, maximum: 20 },
          },
          {
            name: "size",
            in: "query",
            description: "Taille de page de la recherche autour. De 1 à 50, défaut 6.",
            schema: { type: "integer", default: 6 },
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
            schema: {
              type: "string",
              enum: ["ts", "-ts", "temp", "-temp", "pressure", "-pressure", "wind", "-wind"],
            },
          },
        ],
        responses: {
          ...jsonRes(200, "Liste paginée", LIST),
          ...jsonRes(500, "Erreur serveur", ERROR),
        },
      },
      post: {
        tags: ["weather"],
        summary: "Créer un rapport météo",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: WEATHER },
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
          ...jsonRes(201, "Document créé", WEATHER),
          ...jsonRes(400, "Corps invalide", ERROR),
          ...jsonRes(
            409,
            "Un relevé existe déjà pour cette station et cette heure. Aucune conversion n'est comptée.",
            ERROR
          ),
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
    "/api/weather/{id}/releve.pdf": {
      get: {
        tags: ["weather"],
        summary: "Fiche PDF d'un relevé",
        parameters: [
          idParam(),
          {
            name: "download",
            in: "query",
            schema: { type: "boolean", default: false },
            description: "true : attachment. Absent : inline.",
          },
        ],
        responses: {
          200: {
            description: "PDF",
            headers: {
              "Content-Disposition": { schema: { type: "string" } },
              "Cache-Control": { schema: { type: "string", example: "no-store" } },
            },
            content: { "application/pdf": { schema: { type: "string", format: "binary" } } },
          },
          ...jsonRes(401, "Pas de cookie ciel_lecteur", ERROR),
          ...jsonRes(404, "Introuvable, ou relevé d'un autre lecteur", ERROR),
          ...jsonRes(409, "Relevé annulé", ERROR),
          ...jsonRes(500, "Moteur PDF en échec", ERROR),
        },
      },
    },
    "/api/weather/{id}": {
      get: {
        tags: ["weather"],
        summary: "Obtenir un rapport par ID",
        parameters: [idParam("5553a998e4b02cf7151190b8")],
        responses: weatherIdResponses(200, "Document trouvé", WEATHER),
      },
      put: {
        tags: ["weather"],
        summary: "Mettre à jour un rapport",
        parameters: [idParam()],
        requestBody: {
          required: true,
          content: jsonSchema(WEATHER),
        },
        responses: weatherIdResponses(200, "Document mis à jour", WEATHER, "ID ou corps invalide"),
      },
      delete: {
        tags: ["weather"],
        summary: "Supprimer un rapport",
        parameters: [idParam()],
        responses: weatherIdResponses(200, "Supprimé", DELETED),
      },
    },
    "/api/ab/assignment": {
      get: {
        tags: ["ab"],
        summary: "Affecter une variante stable (cookie ab_visitor)",
        responses: descOnly(
          200,
          "Variante A ou B. Cache-Control: no-store. Expérience arrêtée : A, sans nouvelle affectation."
        ),
      },
    },
    "/api/ab/exposure": {
      post: {
        tags: ["ab"],
        summary: "Déclarer la première exposition du visiteur",
        responses: descOnly(204, "Enregistrée, ou déjà enregistrée sans changer la date"),
      },
    },
    "/api/ab/metrics": {
      get: {
        tags: ["ab"],
        summary: "Effectifs et taux par variante",
        responses: descOnly(
          200,
          "assigned, exposed, converted, bookings. rate vaut null si exposed est 0."
        ),
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
            items: { $ref: WEATHER },
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
