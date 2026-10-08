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
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return `${n.toFixed(2)} ms`;
}

function fmtPct(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(2)}%`;
}

function fmtNum(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function metricBody(meta) {
  if (!meta || typeof meta !== "object") return {};
  if (meta.values && typeof meta.values === "object") return meta.values;
  return meta;
}

function isTimeMetric(name, meta) {
  if (meta?.contains === "time") return true;
  return /duration|waiting|connecting|blocked|sending|receiving|handshaking/.test(name);
}

function childrenOf(node) {
  if (!node) return [];
  if (Array.isArray(node)) return node;
  return Object.values(node);
}

function collectChecks(group, acc = []) {
  if (!group) return acc;
  for (const c of childrenOf(group.checks)) {
    if (c && c.name) acc.push(c);
  }
  for (const child of childrenOf(group.groups)) {
    collectChecks(child, acc);
  }
  return acc;
}

// --summary-export : `true` = seuil dépassé.
// handleSummary / dashboard : `{ ok: true }` = seuil tenu.
function thresholdOk(result) {
  if (result && typeof result === "object" && "ok" in result) return Boolean(result.ok);
  if (typeof result === "boolean") return !result;
  return false;
}

function parseExpr(expr) {
  const match = String(expr).match(
    /^(p\(\d+(?:\.\d+)?\)|avg|min|med|max|count|rate|value)\s*([<>]=?)\s*(-?\d+(?:\.\d+)?)/
  );
  if (!match) return null;
  return { key: match[1], op: match[2], limit: Number(match[3]) };
}

function measured(name, meta, expr) {
  const parsed = parseExpr(expr);
  if (!parsed) return { text: "—", parsed: null };
  const body = metricBody(meta);
  let raw = body[parsed.key];
  if (raw === undefined && parsed.key === "rate") raw = body.value;
  const time = isTimeMetric(name, meta) && !["rate", "count", "value"].includes(parsed.key);
  const rate =
    parsed.key === "rate" ||
    (parsed.key === "value" && /^(checks|http_req_failed)/.test(name));
  let text = "—";
  if (typeof raw === "number") {
    if (time) text = fmtMs(raw);
    else if (rate) text = fmtPct(raw);
    else text = fmtNum(raw);
  }
  return { text, parsed, raw };
}

function limitText(name, meta, expr) {
  const parsed = parseExpr(expr);
  if (!parsed) return `\`${expr}\``;
  const time = isTimeMetric(name, meta) && !["rate", "count", "value"].includes(parsed.key);
  const rate = parsed.key === "rate" || parsed.key === "value";
  const limit = time ? `${parsed.limit} ms` : rate ? fmtPct(parsed.limit) : fmtNum(parsed.limit);
  const stat = parsed.key === "rate" || parsed.key === "value" ? "taux" : parsed.key;
  return `${stat} ${parsed.op} ${limit}`;
}

function describe(name) {
  const base = name.split("{")[0];
  const tag = (name.match(/\{([^}]+)\}/) || [])[1] || "";
  const target = tag.startsWith("name:")
    ? tag.slice(5)
    : tag.startsWith("check:")
      ? tag.slice(6)
      : "global";
  const kind =
    base === "http_req_failed"
      ? "erreurs HTTP"
      : base === "http_req_duration"
        ? "latence"
        : base === "checks"
          ? "checks"
          : base;
  return { target, kind };
}

const rows = [];
for (const [name, meta] of Object.entries(m)) {
  if (!meta?.thresholds) continue;
  for (const [expr, result] of Object.entries(meta.thresholds)) {
    const ok = thresholdOk(result);
    const { target, kind } = describe(name);
    const measure = measured(name, meta, expr);
    rows.push({
      ok,
      name,
      expr,
      target,
      kind,
      limit: limitText(name, meta, expr),
      measure: measure.text,
    });
  }
}

rows.sort((a, b) => {
  if (a.ok !== b.ok) return a.ok ? 1 : -1;
  const rank = (row) => (row.target === "global" ? 0 : 1);
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  return `${a.target} ${a.kind}`.localeCompare(`${b.target} ${b.kind}`);
});

const failed = rows.filter((row) => !row.ok);
const verdict = failed.length
  ? `**Résultat : échec** — ${failed.length} seuil${failed.length > 1 ? "s" : ""} non tenu${failed.length > 1 ? "s" : ""} sur ${rows.length}.`
  : `**Résultat : ok** — ${rows.length} seuil${rows.length > 1 ? "s" : ""} tenu${rows.length > 1 ? "s" : ""}.`;

const failedBlock = failed.length
  ? failed
      .map((row) => `- ❌ **${row.target}** · ${row.kind} — mesure ${row.measure}, seuil ${row.limit}`)
      .join("\n")
  : "_Aucun._";

const thresholdTable = rows.length
  ? rows
      .map(
        (row) =>
          `| ${row.ok ? "✅" : "❌"} | ${row.target} | ${row.kind} | ${row.limit} | ${row.measure} |`
      )
      .join("\n")
  : "| — | — | — | aucun seuil | — |";

const checkLines = collectChecks(data.root_group).map((c) => {
  const passes = c.passes ?? 0;
  const fails = c.fails ?? 0;
  const total = passes + fails;
  return `| ${fails === 0 ? "✅" : "❌"} | ${c.name} | ${passes}/${total} |`;
});

const duration = metricBody(m.http_req_duration);
const failedRate = metricBody(m.http_req_failed);
const checks = metricBody(m.checks);
const httpReqs = metricBody(m.http_reqs);
const iterations = metricBody(m.iterations);
const vus = metricBody(m.vus);
const dataRecv = metricBody(m.data_received);
const httpFailed = failedRate.rate ?? failedRate.value;
const checksRate = checks.rate ?? checks.value;

const md = `## Test de charge k6

${verdict}

### Seuils non tenus

${failedBlock}

### Seuils

| | Cible | Critère | Seuil | Mesure |
| --- | --- | --- | --- | --- |
${thresholdTable}

### Checks

| | Check | Réussites |
| --- | --- | --- |
${checkLines.length ? checkLines.join("\n") : "| — | aucun | — |"}

### Mesures

| Métrique | Valeur |
| --- | --- |
| VUs | ${fmtNum(vus.max ?? vus.value ?? Number(process.env.VUS))} |
| Durée | ${process.env.DURATION || "—"} |
| Requêtes HTTP | ${fmtNum(httpReqs.count)} (${fmtNum(httpReqs.rate)}/s) |
| Itérations | ${fmtNum(iterations.count)} |
| Checks réussis | ${fmtPct(checksRate ?? 0)} (${fmtNum(checks.passes)} / ${fmtNum((checks.passes || 0) + (checks.fails || 0))}) |
| Erreurs HTTP | ${fmtPct(httpFailed ?? 0)} |
| Latence moyenne | ${fmtMs(duration.avg)} |
| Latence p(95) | ${fmtMs(duration["p(95)"])} |
| Latence p(99) | ${fmtMs(duration["p(99)"])} |
| Latence max | ${fmtMs(duration.max)} |
| Données reçues | ${fmtNum((dataRecv.count || 0) / 1024)} KB |
`;

for (const row of failed) {
  const line = `Seuil non tenu: ${row.target} · ${row.kind} — mesure ${row.measure}, seuil ${row.limit}`;
  console.error(line);
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::error title=Seuil k6::${line}`);
  }
}

const out = process.env.GITHUB_STEP_SUMMARY;
if (out) {
  fs.appendFileSync(out, md + "\n");
  console.log("Wrote GitHub Job Summary");
} else {
  console.log(md);
}

if (failed.length) {
  const title = `Test de charge en échec : ${failed
    .map((row) => `${row.target} (${row.kind})`)
    .join(", ")}`.slice(0, 240);
  fs.writeFileSync("k6-failure-title.txt", `${title}\n`);
  fs.writeFileSync("k6-failure.md", md);
  process.exit(1);
}
