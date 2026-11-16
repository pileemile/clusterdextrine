(function () {
  const RADIUS_KM = 5;
  const btn = document.getElementById("nearbyBtn");
  const form = document.getElementById("nearbyForm");
  if (!btn || !form || typeof CielGeo === "undefined") return;

  const msg = document.getElementById("nearbyMsg");
  const list = document.getElementById("nearbyList");
  const mapEl = document.getElementById("nearbyMap");
  let map;
  let page = 0;
  let center = null;
  let activeRequest = null;

  function showMessage(text) {
    if (!text) {
      msg.hidden = true;
      msg.textContent = "";
      return;
    }
    msg.hidden = false;
    msg.textContent = text;
  }

  function formatAccuracy(accuracyM) {
    if (typeof accuracyM !== "number" || accuracyM <= 1000) return "";
    return ` Précision d'environ ${Math.round(accuracyM / 1000)} km.`;
  }

  function showMap(origin, items) {
    if (!window.L) {
      mapEl.hidden = true;
      return;
    }
    mapEl.hidden = false;
    if (map) {
      map.remove();
      map = null;
    }
    const view = [origin.lat, origin.lon];
    map = L.map(mapEl);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    L.circle(view, { radius: RADIUS_KM * 1000, color: "#0c74a8", weight: 1 }).addTo(map);
    for (const item of items) {
      if (!Number.isFinite(item.latitude) || !Number.isFinite(item.longitude)) continue;
      const name = item.callLetters || item.st || "Relevé";
      L.circleMarker([item.latitude, item.longitude], { radius: 6, color: "#0c74a8" }).bindTooltip(name).addTo(map);
    }
    const drawn = map;
    const place = () => {
      if (map !== drawn) return;
      drawn.invalidateSize();
      drawn.setView(view, 12);
    };
    place();
    requestAnimationFrame(place);
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  function render(data, note) {
    const items = data.items || [];
    const rows = items
      .map((item) => {
        const name = item.callLetters || item.st || "Relevé";
        const key = String(item.callLetters || "").trim().length >= 2 ? item.callLetters : item.st;
        const href = CielTenant.url(key ? `/?q=${encodeURIComponent(key)}` : "/");
        return `<li><a href="${esc(href)}">${esc(name)}</a> <span>${esc(CielGeo.formatDistance(item.distanceKm))}</span></li>`;
      })
      .join("");
    const pages = Math.ceil((data.total || 0) / data.size);
    const pager =
      pages > 1
        ? `<p><button type="button" data-nearby-page="${page - 1}" ${page <= 0 ? "disabled" : ""}>Page précédente</button>
           <button type="button" data-nearby-page="${page + 1}" ${page + 1 >= pages ? "disabled" : ""}>Page suivante</button></p>`
        : "";
    list.innerHTML = items.length
      ? `<p>${esc(note)} ${data.total} relevé${data.total > 1 ? "s" : ""}, à vol d'oiseau.</p><ol>${rows}</ol>${pager}`
      : `<p>${esc(note)} Aucun relevé à moins de ${RADIUS_KM} km, à vol d'oiseau.</p>`;
    showMap(center, items);
  }

  async function load(origin, note, requestGeneration) {
    CielTenant.assertGeneration(requestGeneration);
    center = { lat: origin.lat, lon: origin.lon };
    const params = CielGeo.nearbyParams(origin.lat, origin.lon, RADIUS_KM, page, 6);
    const response = await api(`/api/weather?${params}`, {
      headers: { Accept: "application/json" },
      signal: activeRequest?.signal,
    });
    const data = await response.json().catch(() => ({}));
    CielTenant.assertGeneration(requestGeneration);
    if (!response.ok) throw new Error(data.error || "Recherche impossible.");
    render(data, note);
  }

  async function run(task, busyLabel) {
    const requestGeneration = CielTenant.generation;
    activeRequest?.abort();
    activeRequest = new AbortController();
    showMessage("");
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    const previous = btn.textContent;
    btn.textContent = busyLabel;
    try {
      await task(requestGeneration);
    } catch (err) {
      if (requestGeneration !== CielTenant.generation) return;
      list.innerHTML = "";
      mapEl.hidden = true;
      showMessage(err.message);
    } finally {
      if (requestGeneration === CielTenant.generation) {
        activeRequest = null;
        btn.disabled = false;
        btn.removeAttribute("aria-busy");
        btn.textContent = previous;
      }
    }
  }

  document.addEventListener("tenantchange", () => {
    activeRequest?.abort();
    activeRequest = null;
    center = null;
    page = 0;
    list.innerHTML = "";
    mapEl.hidden = true;
    showMessage("");
    if (map) {
      map.remove();
      map = null;
    }
    btn.disabled = false;
    btn.removeAttribute("aria-busy");
    btn.textContent = "Autour de moi (5 km)";
  });

  btn.addEventListener("click", () => {
    page = 0;
    run(async (requestGeneration) => {
      const position = await CielGeo.getPosition({
        secure: window.isSecureContext,
        geolocation: navigator.geolocation,
      });
      await load(position, `Autour de cette position.${formatAccuracy(position.accuracyM)}`, requestGeneration);
    }, "Localisation…");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    page = 0;
    const query = new FormData(form).get("address");
    run(async (requestGeneration) => {
      const hit = await CielGeo.geocode(String(query || ""), fetch);
      CielTenant.assertGeneration(requestGeneration);
      await load(hit, hit.label, requestGeneration);
    }, "Recherche…");
  });

  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-nearby-page]");
    if (!button || button.disabled || !center) return;
    page = Number(button.dataset.nearbyPage);
    run((requestGeneration) => load(center, "Même centre.", requestGeneration), "Recherche…");
  });
})();
