import { context, propagation, trace } from "@opentelemetry/api";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchSpanProcessor,
  ParentBasedSampler,
  StackContextManager,
  TraceIdRatioBasedSampler,
  TracerProvider,
} from "@opentelemetry/sdk-trace";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

export function retirerSaisie(url) {
  if (typeof url !== "string") return url;
  const query = url.indexOf("?");
  return query === -1 ? url : url.slice(0, query);
}

class RetirerSaisieProcessor {
  onStart(span) {
    const full = span.attributes?.["url.full"];
    if (typeof full === "string" && full.includes("?")) {
      span.setAttribute("url.full", retirerSaisie(full));
    }
  }

  onEnd() {}

  forceFlush() {
    return Promise.resolve();
  }

  shutdown() {
    return Promise.resolve();
  }
}

export function demarrerTraces({ processeur, serviceVersion } = {}) {
  const origin = typeof location !== "undefined" && location.origin ? location.origin : "";
  const provider = new TracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "ciel-web",
      [ATTR_SERVICE_VERSION]: serviceVersion || "local",
    }),
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(1),
    }),
    spanProcessors: [
      new RetirerSaisieProcessor(),
      processeur ||
        new BatchSpanProcessor({
          exporter: new OTLPTraceExporter({ url: `${origin}/otlp/v1/traces` }),
          scheduledDelayMillis: 5000,
        }),
    ],
  });

  trace.setGlobalTracerProvider(provider);
  context.setGlobalContextManager(new StackContextManager().enable());
  propagation.setGlobalPropagator(new W3CTraceContextPropagator());
  registerInstrumentations({
    instrumentations: [new FetchInstrumentation({ ignoreUrls: [/\/otlp\//] })],
    tracerProvider: provider,
  });
  return provider;
}
