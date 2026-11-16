require("dotenv").config();

process.env.OTEL_SERVICE_NAME ||= "ciel-api";
process.env.OTEL_TRACES_SAMPLER ||= "parentbased_always_on";
process.env.OTEL_METRICS_EXPORTER ||= "none";
process.env.OTEL_LOGS_EXPORTER ||= "none";
process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||= "http://127.0.0.1:4318";
process.env.OTEL_EXPORTER_OTLP_PROTOCOL ||= "http/protobuf";

const version = process.env.GIT_SHA || process.env.OTEL_SERVICE_VERSION || "local";
const resource = process.env.OTEL_RESOURCE_ATTRIBUTES || "";
if (!resource.includes("service.version=")) {
  process.env.OTEL_RESOURCE_ATTRIBUTES = resource
    ? `${resource},service.version=${version}`
    : `service.version=${version}`;
}

const { NodeSDK } = require("@opentelemetry/sdk-node");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");

const sdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": { enabled: false },
      "@opentelemetry/instrumentation-dns": { enabled: false },
      "@opentelemetry/instrumentation-net": { enabled: false },
    }),
  ],
});

sdk.start();

process.once("SIGTERM", () => {
  sdk.shutdown().finally(() => process.exit(0));
});
