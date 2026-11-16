const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const mongoose = require("mongoose");
const Weather = require("../models/Weather");

const COOKIE = "ciel_lecteur";
const COOKIE_MAX_AGE = 390 * 24 * 60 * 60;
const PARIS = "Europe/Paris";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TEMPLATE = path.join(__dirname, "../../templates/releve.html");
const FONT = path.join(__dirname, "../../assets/fonts/DejaVuSans.ttf");
const FONT_BOLD = path.join(__dirname, "../../assets/fonts/DejaVuSans-Bold.ttf");

const MESSAGES = {
  401: "Votre session a expiré. Reconnectez-vous.",
  404: "Ce relevé est introuvable.",
  409: "Ce relevé est annulé : il n'a plus de fiche.",
  500: "La fiche n'a pas pu être préparée.",
};

class ReleveError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function fail(status) {
  return new ReleveError(status, MESSAGES[status]);
}

function readCookie(req, name) {
  const raw = req.headers?.cookie || "";
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

function readerFrom(req) {
  const value = readCookie(req, COOKIE);
  return UUID_RE.test(value || "") ? value : null;
}

function readerCookie(id) {
  return `${COOKIE}=${encodeURIComponent(id)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax`;
}

function attachReader(req, res) {
  if (String(req.path || "").endsWith("/releve.pdf")) return;
  if (readerFrom(req)) return;
  res.append("Set-Cookie", readerCookie(crypto.randomUUID()));
}

function ownedPayload(body, reader) {
  const payload = { ...(body || {}) };
  delete payload.owner;
  if (reader) payload.owner = reader;
  return payload;
}

function filenameFor(id) {
  return `releve-${String(id).replace(/[^a-fA-F0-9]/g, "")}.pdf`;
}

function contentDisposition(download, filename) {
  return `${download ? "attachment" : "inline"}; filename="${filename}"`;
}

function formatDay(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: PARIS,
  }).format(date);
}

function formatTime(date) {
  const list = new Intl.DateTimeFormat("fr-FR", {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: PARIS,
  }).formatToParts(date);
  const hour = list.find((part) => part.type === "hour").value;
  const minute = list.find((part) => part.type === "minute").value;
  return `${Number(hour)} h ${minute}`;
}

function toView(doc, issuedAt = new Date()) {
  const ts = doc.ts ? new Date(doc.ts) : null;
  const known = ts && !Number.isNaN(ts.getTime());
  const coords = Array.isArray(doc.position?.coordinates) ? doc.position.coordinates : [];
  const [lng, lat] = coords;
  const temp = doc.airTemperature?.value;
  const place =
    typeof lat === "number" && typeof lng === "number" ? `${lat}, ${lng}` : "Position inconnue";
  const temperature = typeof temp === "number" && temp < 999.9 ? `${temp} °C` : "Non mesuré";
  return {
    reference: String(doc._id),
    station: doc.callLetters || doc.st || "Station inconnue",
    day: known ? formatDay(ts) : "Date inconnue",
    time: known ? formatTime(ts) : "Heure inconnue",
    place,
    temperature,
    issuedOn: formatDay(issuedAt),
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function decodeHtml(value) {
  return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\n/g, "");
}

function fillTemplate(view) {
  const html = fs.readFileSync(TEMPLATE, "utf8");
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHtml(view[key] ?? ""));
}

function parseTemplate(html) {
  const title = decodeHtml((html.match(/<title>([\s\S]*?)<\/title>/) || [, ""])[1]).trim();
  const body = (html.split("<body>")[1] || "").split("</body>")[0];
  const blocks = [];
  const blocksRe = /<(h1|p)>([\s\S]*?)<\/\1>/g;
  let block;
  while ((block = blocksRe.exec(body))) {
    const parts = [];
    const pieceRe = /<b>([\s\S]*?)<\/b>|([^<]+)/g;
    let piece;
    while ((piece = pieceRe.exec(block[2]))) {
      const text = decodeHtml(piece[1] ?? piece[2]);
      if (text) parts.push({ text, bold: piece[1] != null });
    }
    if (parts.length) blocks.push({ heading: block[1] === "h1", parts });
  }
  return { title, blocks };
}

function renderPdf(view) {
  const { title, blocks } = parseTemplate(fillTemplate(view));
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 56,
      tagged: true,
      lang: "fr",
      displayTitle: true,
      info: { Title: title },
    });
    doc.registerFont("DejaVu", FONT);
    doc.registerFont("DejaVu-Bold", FONT_BOLD);
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.addStructure(
      doc.struct(
        "Document",
        { lang: "fr", title },
        blocks.map((block) =>
          doc.struct(block.heading ? "H1" : "P", () => {
            block.parts.forEach((part, index) => {
              doc
                .font(part.bold || block.heading ? "DejaVu-Bold" : "DejaVu")
                .fontSize(block.heading ? 18 : 12)
                .text(part.text, { continued: index < block.parts.length - 1 });
            });
            doc.moveDown(0.45);
          })
        )
      )
    );
    doc.end();
  });
}

function objectId(id) {
  return mongoose.Types.ObjectId.isValid(id) && String(id).length === 24 ? id : null;
}

async function loadReleve(id, reader, deps = {}) {
  if (!reader) throw fail(401);
  if (!objectId(id)) throw fail(404);
  const findById = deps.findById || ((value) => Weather.findById(value).lean());
  const render = deps.render || renderPdf;
  const doc = await findById(id);
  if (!doc || (doc.owner && String(doc.owner) !== String(reader))) throw fail(404);
  if (doc.status === "CANCELLED") throw fail(409);
  const view = toView(doc);
  const pdf = await render(view);
  return { pdf, filename: filenameFor(id), view };
}

function applyPdfHeaders(res, file, download) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", contentDisposition(download, file.filename));
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Length", String(file.pdf.length));
}

function publicError(err) {
  if (err instanceof ReleveError) return { status: err.status, body: { error: err.message } };
  return { status: 500, body: { error: MESSAGES[500] } };
}

module.exports = {
  COOKIE,
  MESSAGES,
  ReleveError,
  readerFrom,
  attachReader,
  ownedPayload,
  filenameFor,
  contentDisposition,
  formatTime,
  toView,
  fillTemplate,
  renderPdf,
  loadReleve,
  applyPdfHeaders,
  publicError,
};
