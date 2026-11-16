import assert from "node:assert/strict";
import test from "node:test";
import { InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace";
import { demarrerTraces, retirerSaisie } from "./tracing.js";

test("la saisie d'une recherche ne reste pas dans url.full", () => {
  assert.equal(
    retirerSaisie("http://127.0.0.1:3000/api/weather?q=secret"),
    "http://127.0.0.1:3000/api/weather"
  );
  assert.equal(retirerSaisie("http://127.0.0.1:3000/api/weather"), "http://127.0.0.1:3000/api/weather");
});

test("un fetch de la même origine porte un traceparent échantillonné", async () => {
  const recus = [];
  globalThis.location = { origin: "http://127.0.0.1:3000" };
  globalThis.fetch = async (_url, init) => {
    recus.push(new Headers(init?.headers));
    return {
      status: 200,
      statusText: "OK",
      url: "http://127.0.0.1:3000/api/weather?q=secret",
      headers: new Headers(),
      clone() {
        return { body: null };
      },
    };
  };

  const exporter = new InMemorySpanExporter();
  demarrerTraces({ processeur: new SimpleSpanProcessor({ exporter }) });
  await fetch("http://127.0.0.1:3000/api/weather?q=secret");
  await new Promise((resolve) => setTimeout(resolve, 400));

  assert.match(recus[0].get("traceparent") || "", /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  const spans = exporter.getFinishedSpans();
  const web = spans.find((span) => span.attributes["url.full"]);
  assert.ok(web);
  assert.equal(String(web.attributes["url.full"]).includes("secret"), false);
  assert.equal(String(web.attributes["url.full"]).includes("?"), false);
});
