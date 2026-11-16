# Traces — Ciel

Jaeger : http://127.0.0.1:16686 — services `ciel-api`, `ciel-web`.

## Instrumentation

| | |
| --- | --- |
| Back | `src/instrumentation.js` — `ciel-api`, `parentbased_always_on`, OTLP `http://127.0.0.1:4318`, métriques et logs off. `service.version` = `local` |
| Collecteur | `observabilite/collector.yaml` — OTLP `:4318`, `attributes/sante` (supprime `url.query`, `enduser.id`), `transform/saisie` (retire `?…`), export Jaeger |
| Front | `public/tracing.js` — `ciel-web`, lots / 5 s vers `/otlp/v1/traces`, `traceparent` W3C, `url.full` sans requête |
| Relais | `src/index.js` — `/otlp/` → collecteur. Réponses : `X-Trace-Id` |
| Métier | `POST /api/weather` → span `ciel.releve` : `ciel.station.id`, `ciel.reading.id`. Pas de nom, pas d’e-mail, pas de saisie |

Trace métier `c7063f96fff974b8c0ebcbf01b023848` — `ciel.releve` 47 ms, `ciel.station.id=OTELTP`, `ciel.reading.id=6afac2b58d3a0cc7315a70f8`.

## Propagation

Trace `c8f516efc13a93dea7c6d15c5a0e7079`

- `ciel-web` `GET` `59a1a010e68cec55` — 33 ms — parent : aucun — `url.full=http://127.0.0.1:3000/api/weather`
- `ciel-api` `GET /api/weather` `61b5ff2a2ada9e3b` — parent : `59a1a010e68cec55`

Playwright : non fait (pas de `e2e/trace.spec.ts`).

## T1 — recherche 2 lettres > 1 s

Jaeger : `ciel-api`, `GET /api/weather`, min 500 ms.  
Trace `679e2c81cccc57b7481c7dc6a4688241`

| Span | Durée |
| --- | --- |
| `GET /api/weather` | 1326,6 ms |
| `request handler - /api/weather/` | 1324,5 ms |
| `countDocuments data` | 108,0 ms |
| `find data` | 92,8 ms / 82,5 ms |

Coupable : API, `labDelayMs` + `sleep`, `src/routes/weatherRoutes.js:29` et `:75` (1 200 ms si `q` fait 2 caractères).  
Piste : retirer le délai. Équipe API.

## T2 — liste, trop de requêtes base

Jaeger : `ciel-api`, `GET /api/weather`.  
Trace `77953ac00abff896a05e3fba9874ba65` — total 26,8 ms.

Spans base : `find data` ×2, `countDocuments data`, `aggregate $cmd`.

Coupable : API, `Weather.find` + `Weather.countDocuments`, `src/routes/weatherRoutes.js:108`.  
Piste : ne plus compter à chaque page. Équipe API.

## T3 — service indisponible

Trace `5cd7266b061af66ce791b77a7398f524` — `GET /api/weather` 184,7 ms, Error, HTTP 503. Pas de span Mongo.

Exception sur `request handler - /api/weather/` :

- `exception.type` = `Error`
- `exception.message` = `Service temporairement indisponible (simulation lab).`
- `exception.stacktrace` = `src/routes/weatherRoutes.js:66`

Coupable : API, branche `q=erreur`, `weatherRoutes.js:63`.  
Piste : retirer la branche. Équipe API.

## Tests

`npm test` — 8 tests, 8 pass, 0 fail.

`sh tests/verifier_traces.sh`

```
OK  Jaeger propose ciel-api
OK  Jaeger propose ciel-web
OK  une trace ciel-api contient un span de base
Bilan : 3 OK, 0 ÉCHEC
```
