const CielReleve = (function () {
  const MESSAGES = {
    401: "Votre session a expiré. Reconnectez-vous.",
    404: "Ce relevé est introuvable.",
    409: "Ce relevé est annulé : il n'a plus de fiche.",
    500: "La fiche n'a pas pu être préparée.",
  };
  const FALLBACK = "La fiche n'a pas pu être préparée.";
  const OFFLINE = "Connexion impossible. Réessayez.";
  const REVOKE_AFTER_MS = 60000;

  class ReleveError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  }

  function filenameFrom(header, id) {
    const match = /filename="?([^";]+)"?/.exec(header || "");
    return match ? match[1] : `releve-${id}.pdf`;
  }

  function releveUrl(id, download) {
    const base = `/api/weather/${encodeURIComponent(id)}/releve.pdf`;
    return download ? `${base}?download=true` : base;
  }

  async function fetchReleve(id, download = false) {
    let response;
    try {
      response = await fetch(releveUrl(id, download), {
        credentials: "same-origin",
        headers: { Accept: "application/pdf, application/json" },
      });
    } catch {
      throw new ReleveError(OFFLINE, 0);
    }
    if (!response.ok) throw new ReleveError(MESSAGES[response.status] || FALLBACK, response.status);
    const type = response.headers.get("Content-Type") || "";
    if (!type.startsWith("application/pdf")) throw new ReleveError(FALLBACK, response.status);
    const blob = await response.blob();
    return { blob, name: filenameFrom(response.headers.get("Content-Disposition"), id) };
  }

  async function openReleve(id, browser) {
    const tab = browser.openTab();
    try {
      const { blob } = await fetchReleve(id, false);
      const url = browser.createObjectURL(blob);
      tab.show(url);
      browser.later(() => browser.revokeObjectURL(url), REVOKE_AFTER_MS);
    } catch (err) {
      tab.close();
      throw err;
    }
  }

  async function saveReleve(id, browser) {
    const { blob, name } = await fetchReleve(id, true);
    browser.save(blob, name);
  }

  function realBrowser() {
    return {
      openTab() {
        const tab = window.open("about:blank", "_blank");
        return {
          show(url) {
            if (tab) tab.location.href = url;
          },
          close() {
            if (tab) tab.close();
          },
        };
      },
      createObjectURL(blob) {
        return URL.createObjectURL(blob);
      },
      revokeObjectURL(url) {
        URL.revokeObjectURL(url);
      },
      later(fn, ms) {
        setTimeout(fn, ms);
      },
      save(blob, name) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
      },
    };
  }

  async function onClick(event) {
    const open = event.target.closest("[data-releve-open]");
    const save = event.target.closest("[data-releve-save]");
    const button = open || save;
    if (!button) return;
    const root = button.closest(".detail");
    if (!root || root.dataset.releveBusy === "1") return;
    root.dataset.releveBusy = "1";
    const buttons = root.querySelectorAll("[data-releve-open],[data-releve-save]");
    const label = root.querySelector("[data-releve-label]");
    const alert = root.querySelector("[data-releve-error]");
    buttons.forEach((item) => {
      item.disabled = true;
      item.setAttribute("aria-busy", "true");
    });
    if (label) label.textContent = "Préparation…";
    if (alert) {
      alert.hidden = true;
      alert.textContent = "";
    }
    try {
      const id = button.dataset.releve;
      if (save) await saveReleve(id, realBrowser());
      else await openReleve(id, realBrowser());
    } catch (err) {
      if (alert) {
        alert.textContent = err instanceof ReleveError ? err.message : FALLBACK;
        alert.hidden = false;
      }
    } finally {
      root.dataset.releveBusy = "0";
      buttons.forEach((item) => {
        item.disabled = false;
        item.removeAttribute("aria-busy");
      });
      if (label) label.textContent = "Fiche (PDF)";
    }
  }

  if (typeof document !== "undefined") {
    document.addEventListener("click", onClick);
  }

  return {
    MESSAGES,
    FALLBACK,
    OFFLINE,
    ReleveError,
    filenameFrom,
    fetchReleve,
    openReleve,
    saveReleve,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CielReleve;
}
