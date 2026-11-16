const test = require("node:test");
const assert = require("node:assert/strict");
const releve = require("../public/releve.js");

function pdfResponse({ status = 200, type = "application/pdf", body = "%PDF", name = "releve-abc.pdf" } = {}) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": type,
      "Content-Disposition": `inline; filename="${name}"`,
    },
  });
}

function problem(status) {
  return new Response(JSON.stringify({ error: "détail technique" }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("le nom vient de Content-Disposition, sinon de l'identifiant", () => {
  assert.equal(releve.filenameFrom('inline; filename="releve-abc.pdf"', "abc"), "releve-abc.pdf");
  assert.equal(releve.filenameFrom("", "abc"), "releve-abc.pdf");
});

test("401, 404 et 409 deviennent une phrase", async (t) => {
  const previous = global.fetch;
  t.after(() => {
    global.fetch = previous;
  });
  for (const status of [401, 404, 409]) {
    global.fetch = async () => problem(status);
    await assert.rejects(releve.fetchReleve("abc"), (err) => {
      assert.equal(err.message, releve.MESSAGES[status]);
      assert.equal(err.status, status);
      assert.equal(err.message.includes("détail"), false);
      return true;
    });
  }
});

test("un 200 qui n'est pas un PDF est refusé", async (t) => {
  const previous = global.fetch;
  t.after(() => {
    global.fetch = previous;
  });
  global.fetch = async () => pdfResponse({ type: "text/html", body: "<html>" });
  await assert.rejects(releve.fetchReleve("abc"), (err) => err.message === releve.FALLBACK && err.status === 200);
});

test("une coupure réseau a sa phrase", async (t) => {
  const previous = global.fetch;
  t.after(() => {
    global.fetch = previous;
  });
  global.fetch = async () => {
    throw new Error("network");
  };
  await assert.rejects(releve.fetchReleve("abc"), (err) => err.message === releve.OFFLINE);
});

test("l'onglet s'ouvre avant l'attente, puis l'URL est révoquée", async (t) => {
  const previous = global.fetch;
  t.after(() => {
    global.fetch = previous;
  });
  const order = [];
  global.fetch = async (url) => {
    order.push(["fetch", url]);
    return pdfResponse();
  };
  let revoke = null;
  const browser = {
    openTab() {
      order.push(["open"]);
      return {
        show(url) {
          order.push(["show", url]);
        },
        close() {
          order.push(["close"]);
        },
      };
    },
    createObjectURL() {
      return "blob:fiche";
    },
    revokeObjectURL(url) {
      revoke = url;
    },
    later(fn) {
      order.push(["later"]);
      fn();
    },
  };
  await releve.openReleve("abc", browser);
  assert.deepEqual(
    order.map((item) => item[0]),
    ["open", "fetch", "show", "later"]
  );
  assert.equal(order[1][1], "/api/weather/abc/releve.pdf");
  assert.equal(revoke, "blob:fiche");
});

test("une erreur referme l'onglet vide", async (t) => {
  const previous = global.fetch;
  t.after(() => {
    global.fetch = previous;
  });
  global.fetch = async () => problem(409);
  let closed = false;
  let shown = false;
  const browser = {
    openTab() {
      return {
        show() {
          shown = true;
        },
        close() {
          closed = true;
        },
      };
    },
  };
  await assert.rejects(releve.openReleve("abc", browser), (err) => err.message === releve.MESSAGES[409]);
  assert.equal(closed, true);
  assert.equal(shown, false);
});

test("enregistrer demande download=true et le nom du serveur", async (t) => {
  const previous = global.fetch;
  t.after(() => {
    global.fetch = previous;
  });
  let called = null;
  global.fetch = async (url) => {
    called = url;
    return pdfResponse({ name: "releve-abc.pdf" });
  };
  let saved = null;
  await releve.saveReleve("abc", {
    save(blob, name) {
      saved = { size: blob.size, name };
    },
  });
  assert.equal(called, "/api/weather/abc/releve.pdf?download=true");
  assert.equal(saved.name, "releve-abc.pdf");
  assert.ok(saved.size > 0);
});
