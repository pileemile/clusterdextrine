const test = require("node:test");
const assert = require("node:assert/strict");
const { extractText, getDocumentProxy } = require("unpdf");
const {
  MESSAGES,
  filenameFor,
  fillTemplate,
  loadReleve,
  publicError,
  renderPdf,
  toView,
} = require("../src/pdf/releve");

const READER = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";
const ID = "6553a998e4b02cf7151190b8";

function flat(value) {
  return String(value).replace(/[\u00a0\u202f]/g, " ").replace(/\s+/g, " ").trim();
}

function sample(ts = "2026-11-24T08:30:00.000Z") {
  return {
    _id: ID,
    callLetters: "Hélène Durand",
    ts,
    position: { coordinates: [2.35, 48.85] },
    airTemperature: { value: 4.2 },
    owner: READER,
  };
}

test("heure de Paris, hiver et été", () => {
  const issued = new Date("2026-11-24T12:00:00.000Z");
  const winter = toView(sample("2026-11-24T08:30:00.000Z"), issued);
  const summer = toView(sample("2026-07-07T07:30:00.000Z"), issued);
  assert.equal(winter.time, "9 h 30");
  assert.equal(summer.time, "9 h 30");
  assert.match(flat(winter.day), /mardi 24 novembre 2026/);
});

test("le nom de fichier ne contient que l'identifiant", () => {
  const name = filenameFor(ID);
  assert.equal(name, "releve-6553a998e4b02cf7151190b8.pdf");
  assert.equal(name.includes("Hélène"), false);
  assert.equal(name.includes("2026"), false);
});

test("le modèle échappe le texte", () => {
  const html = fillTemplate(toView({ ...sample(), callLetters: "A<b>B" }));
  assert.equal(html.includes("<b>B"), false);
  assert.match(html, /A&lt;b&gt;B/);
});

test("le PDF contient l'accent, l'heure de Paris, une page A4 et la police", async () => {
  const pdf = await renderPdf(toView(sample(), new Date("2026-11-24T12:00:00.000Z")));
  const proxy = await getDocumentProxy(new Uint8Array(pdf));
  const extracted = await extractText(proxy, { mergePages: true });
  const text = flat(extracted.text);
  const page = await proxy.getPage(1);
  const box = page.view;
  const raw = pdf.toString("latin1");

  assert.equal(extracted.totalPages, 1);
  assert.match(text, /Hélène Durand/);
  assert.match(text, /9 h 30/);
  assert.match(text, /mardi 24 novembre 2026/);
  assert.equal(Math.round(box[2] - box[0]), 595);
  assert.equal(Math.round(box[3] - box[1]), 842);
  assert.match(raw, /DejaVuSans/);
  assert.match(raw, /StructTreeRoot/);
});

test("401, 404 d'un autre lecteur et 409 ne fabriquent pas de PDF", async () => {
  let renders = 0;
  const render = async () => {
    renders += 1;
    return Buffer.from("%PDF");
  };
  const findById = async () => sample();

  await assert.rejects(loadReleve(ID, null, { findById, render }), (err) => err.status === 401);
  await assert.rejects(loadReleve("pas-un-id", READER, { findById, render }), (err) => err.status === 404);
  await assert.rejects(
    loadReleve(ID, OTHER, {
      findById: async () => sample(),
      render,
    }),
    (err) => err.status === 404 && err.message === MESSAGES[404]
  );
  await assert.rejects(
    loadReleve(ID, READER, {
      findById: async () => ({ ...sample(), status: "CANCELLED" }),
      render,
    }),
    (err) => err.status === 409 && err.message === MESSAGES[409]
  );
  assert.equal(renders, 0);
});

test("une erreur du moteur devient 500 sans le détail", () => {
  const out = publicError(new Error("stack interne"));
  assert.equal(out.status, 500);
  assert.equal(out.body.error, MESSAGES[500]);
  assert.equal(JSON.stringify(out.body).includes("stack"), false);
});
