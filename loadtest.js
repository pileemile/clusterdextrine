import http from "k6/http";
import { check, sleep, group } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  vus: 100,
  duration: "45s",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"],
  },
};

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

const jsonHeaders = { headers: { "Content-Type": "application/json" } };

export default function () {
  const tag = `${__VU}-${__ITER}`;

  group("list", () => {
    const res = http.get(`${BASE_URL}/api/weather?page=1&limit=20`);
    check(res, { "GET / list 200": (r) => r.status === 200 });
  });

  group("crud", () => {
    const created = http.post(
      `${BASE_URL}/api/weather`,
      payload(tag),
      jsonHeaders
    );
    const okCreate = check(created, {
      "POST 201": (r) => r.status === 201,
    });
    if (!okCreate) return;

    const id = created.json("_id");
    if (!id) return;

    const one = http.get(`${BASE_URL}/api/weather/${id}`);
    check(one, { "GET /:id 200": (r) => r.status === 200 });

    const updated = http.put(
      `${BASE_URL}/api/weather/${id}`,
      JSON.stringify({ callLetters: `UPD-${tag}`, airTemperature: { value: 21 } }),
      jsonHeaders
    );
    check(updated, { "PUT 200": (r) => r.status === 200 });

    const deleted = http.del(`${BASE_URL}/api/weather/${id}`);
    check(deleted, { "DELETE 200": (r) => r.status === 200 });
  });

  sleep(1);
}
