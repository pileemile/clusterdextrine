import http from "k6/http";
import { check, sleep, group } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const CI = __ENV.CI === "true";

// En CI, cinq paliers de VUs. Chacun a son propre résultat dans le récap.
const PALIERS = [10, 20, 30, 100, 200];
const ERROR_RATE = "rate<0.01";
const CHECK_RATE = "rate>0.99";

const crudRoutes = [
  { name: "POST /weather", check: "POST /weather 201", p95: "p(95)<80" },
  { name: "GET /weather/:id", check: "GET /weather/:id 200", p95: "p(95)<80" },
  { name: "PUT /weather/:id", check: "PUT /weather/:id 200", p95: "p(95)<80" },
  { name: "DELETE /weather/:id", check: "DELETE /weather/:id 200", p95: "p(95)<80" },
];

const listRoute = { name: "GET /weather", check: "GET /weather 200", p95: "p(95)<40" };
const routes = CI ? crudRoutes : [listRoute, ...crudRoutes];

const thresholds = {};

function addRouteThresholds(route, palier) {
  const scope = palier ? `palier:${palier},` : "";
  thresholds[`http_req_failed{${scope}name:${route.name}}`] = [ERROR_RATE];
  thresholds[`http_req_duration{${scope}name:${route.name}}`] = [route.p95];
  thresholds[`checks{${scope}check:${route.check}}`] = [CHECK_RATE];
}

if (CI) {
  for (const vus of PALIERS) {
    thresholds[`http_req_failed{palier:${vus}}`] = [ERROR_RATE];
    thresholds[`checks{palier:${vus}}`] = [CHECK_RATE];
    for (const route of crudRoutes) addRouteThresholds(route, vus);
  }
} else {
  thresholds.http_req_failed = [ERROR_RATE];
  thresholds.http_req_duration = ["p(95)<50", "p(99)<40"];
  thresholds.checks = [CHECK_RATE];
  for (const route of routes) addRouteThresholds(route);
}

function palierSeconds() {
  const n = parseInt(__ENV.DURATION || "20s", 10);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

const summaryTrendStats = ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"];

export const options = CI
  ? {
      summaryTrendStats,
      thresholds,
      scenarios: Object.fromEntries(
        PALIERS.map((vus, i) => {
          const sec = palierSeconds();
          return [
            `vu_${vus}`,
            {
              executor: "constant-vus",
              vus,
              duration: `${sec}s`,
              startTime: `${i * (sec + 2)}s`,
              gracefulStop: "1s",
              tags: { palier: String(vus) },
              exec: "crud",
            },
          ];
        })
      ),
    }
  : {
      vus: 35,
      duration: __ENV.DURATION || "45s",
      summaryTrendStats,
      thresholds,
    };

function params(name, json = false) {
  return {
    tags: { name },
    headers: json ? { "Content-Type": "application/json" } : undefined,
  };
}

function payload(suffix) {
  return JSON.stringify({
    st: `K6-${suffix}`,
    callLetters: "K6XX",
    type: "FM-13",
    ts: new Date().toISOString(),
    airTemperature: { value: 18.5 },
    pressure: { value: 1013.2 },
    wind: { speed: { rate: 4.2 } },
  });
}

export function crud() {
  const tag = `${__VU}-${__ITER}`;

  group("crud", () => {
    const created = http.post(
      `${BASE_URL}/api/weather`,
      payload(tag),
      params("POST /weather", true)
    );
    const okCreate = check(created, {
      "POST /weather 201": (r) => r.status === 201,
    });
    if (!okCreate) return;

    const id = created.json("_id");
    if (!id) return;

    const one = http.get(
      `${BASE_URL}/api/weather/${id}`,
      params("GET /weather/:id")
    );
    check(one, { "GET /weather/:id 200": (r) => r.status === 200 });

    const updated = http.put(
      `${BASE_URL}/api/weather/${id}`,
      JSON.stringify({ callLetters: `UPD-${tag}`, airTemperature: { value: 21 } }),
      params("PUT /weather/:id", true)
    );
    check(updated, { "PUT /weather/:id 200": (r) => r.status === 200 });

    const deleted = http.del(
      `${BASE_URL}/api/weather/${id}`,
      null,
      params("DELETE /weather/:id")
    );
    check(deleted, { "DELETE /weather/:id 200": (r) => r.status === 200 });
  });

  sleep(1);
}

export default function () {
  const res = http.get(
    `${BASE_URL}/api/weather?page=1&limit=20`,
    params("GET /weather")
  );
  check(res, { "GET /weather 200": (r) => r.status === 200 });
  crud();
}
