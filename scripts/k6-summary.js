#!/usr/bin/env node
const fs = require("fs");

const file = process.argv[2] || "summary.json";
if (!fs.existsSync(file)) {
  console.error(`Missing ${file}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, "utf8"));
const m = data.metrics || {};

function fmtMs(n) {
  if (typeof n !== "number") return String(n);
  return `${n.toFixed(2)} ms`;
}

function fmtPct(n) {
  if (typeof n !== "number") return String(n);
  return `${(n * 100).toFixed(2)}%`;
}

function fmtNum(n) {
  if (typeof n !== "number") return String(n);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function collectChecks(group, acc = {}) {
  for (const [name, c] of Object.entries(group.checks || {})) {
    acc[name] = c;
  }
  for (const child of Object.values(group.groups || {})) {
    collectChecks(child, acc);
  }
  return acc;
}

const duration = m.http_req_duration?.values || {};
const failed = m.http_req_failed?.values || {};
const checks = m.checks?.values || {};
const httpReqs = m.http_reqs?.values || {};
const iterations = m.iterations?.values || {};
const vus = m.vus?.values || {};
const dataRecv = m.data_received?.values || {};

const thresholdLines = Object.entries(m)
  .filter(([, meta]) => meta.thresholds)
  .map(([name, meta]) => {
    const results = Object.entries(meta.thresholds)
      .map(([expr, ok]) => `${ok ? "✅" : "❌"} \`${expr}\``)
      .join(", ");
    return `| ${name} | ${results} |`;
  });

const checkEntries = Object.entries(collectChecks(data.root_group || {}));
const checkLines = checkEntries.map(([name, c]) => {
  const passes = c.passes ?? 0;
  const fails = c.fails ?? 0;
  const total = passes + fails;
  const ok = fails === 0 ? "✅" : "❌";
  return `| ${ok} ${name} | ${passes}/${total} |`;
});

const md = `## k6 load test

| Metric | Value |
| --- | --- |
| VUs | ${fmtNum(vus.value ?? vus.max ?? Number(process.env.VUS || 20))} |
| Duration | ${process.env.DURATION || "20s"} |
| HTTP requests | ${fmtNum(httpReqs.count)} (${fmtNum(httpReqs.rate)}/s) |
| Iterations | ${fmtNum(iterations.count)} |
| Checks passed | ${fmtPct(checks.rate ?? 0)} (${fmtNum(checks.passes)} / ${fmtNum((checks.passes || 0) + (checks.fails || 0))}) |
| HTTP failed | ${fmtPct(failed.rate ?? 0)} |
| Duration avg | ${fmtMs(duration.avg)} |
| Duration p(95) | ${fmtMs(duration["p(95)"])} |
| Duration max | ${fmtMs(duration.max)} |
| Data received | ${fmtNum((dataRecv.count || 0) / 1024)} KB |

### Thresholds

| Metric | Result |
| --- | --- |
${thresholdLines.length ? thresholdLines.join("\n") : "| — | aucun |"}

### Checks

| Check | Passes |
| --- | --- |
${checkLines.length ? checkLines.join("\n") : "| — | aucun |"}
`;

const out = process.env.GITHUB_STEP_SUMMARY;
if (out) {
  fs.appendFileSync(out, md + "\n");
  console.log("Wrote GitHub Job Summary");
} else {
  console.log(md);
}
