import http from "k6/http";
import { check, sleep, group } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// Seuils calés sur le run CI (20 VUs, 20 s) : p(95) global 31 ms, p(99) 63 ms,
// GET /weather 60 ms, les écritures autour de 25 ms.
// En dessous de la mesure, le job devient rouge et la ligne apparaît dans « Seuils non tenus ».
const ERROR_RATE = "rate<0.01";
const CHECK_RATE = "rate>0.99";

const routes = [
  { name: "GET /weather", check: "GET /weather 200", p95: "p(95)<40" },
  { name: "POST /weather", check: "POST /weather 201", p95: "p(95)<80" },
  { name: "GET /weather/:id", check: "GET /weather/:id 200", p95: "p(95)<80" },
  { name: "PUT /weather/:id", check: "PUT /weather/:id 200", p95: "p(95)<80" },
  { name: "DELETE /weather/:id", check: "DELETE /weather/:id 200", p95: "p(95)<80" },
];

const thresholds = {
  http_req_failed: [ERROR_RATE],
  http_req_duration: ["p(95)<50", "p(99)<40"],
  checks: [CHECK_RATE],
};

for (const route of routes) {
  thresholds[`http_req_failed{name:${route.name}}`] = [ERROR_RATE];
  thresholds[`http_req_duration{name:${route.name}}`] = [route.p95];
  thresholds[`checks{check:${route.check}}`] = [CHECK_RATE];
}

export const options = {
  vus: Number(__ENV.VUS || 100),
  duration: __ENV.DURATION || "45s",
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
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

export default function () {
  const tag = `${__VU}-${__ITER}`;

  group("list", () => {
    const res = http.get(
      `${BASE_URL}/api/weather?page=1&limit=20`,
      params("GET /weather")
    );
    check(res, { "GET /weather 200": (r) => r.status === 200 });
  });

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
