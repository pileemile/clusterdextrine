const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ERRORS = {
  auth_required: "Connexion requise.",
  admin_required: "Ce compte n’est pas administrateur.",
  two_factor_setup_required: "Activez la double authentification.",
  two_factor_required: "Saisissez le code de votre application.",
  two_factor_already_enabled: "La double authentification est déjà active.",
  two_factor_not_enrolled: "Générez d’abord le QR code.",
  invalid_two_factor_code: "Code invalide.",
  cannot_demote_self: "Vous ne pouvez pas retirer votre propre rôle.",
  last_admin: "Impossible de retirer le dernier administrateur.",
  tenant_exists: "Ce slug existe déjà.",
  invalid_tenant: "Slug ou nom invalide.",
  "En-tête X-Tenant manquant.": "Session admin hors tenant : rechargez la page.",
};

let cache = { users: [], tenants: [], memberships: [], stats: null };

function renderStats(stats) {
  cache.stats = stats;
  $("statLabos").textContent = String(stats.labos ?? 0);
  $("statWeather").textContent = String(stats.weather ?? 0);
  $("statStations").textContent = String(stats.stations ?? 0);
  $("statListeners").textContent = String(stats.weatherListeners ?? 0);
}

async function refreshStats() {
  renderStats(await api("/api/admin/stats"));
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(ERRORS[body.error] || body.error || `Erreur ${response.status}`);
    err.code = body.error;
    err.status = response.status;
    throw err;
  }
  return body;
}

function showPanel(id) {
  ["gateLogin", "gateDenied", "gate2fa", "dashboard"].forEach((name) => {
    $(name).hidden = name !== id;
  });
  $("adminMain").classList.toggle("admin-main--gate", id !== "dashboard");
}

function report(error) {
  $("error").textContent = error.message || String(error);
  $("error").hidden = false;
}

function clearError() {
  $("error").hidden = true;
  $("error").textContent = "";
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

async function setTab(name) {
  const titles = {
    users: "Utilisateurs",
    memberships: "Appartenances",
    tenants: "Tenants",
    weather: "Relevés",
    logs: "Journal",
  };
  $$("#adminNav [data-tab]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.tab === name));
  });
  $$(".admin__pane").forEach((pane) => {
    pane.hidden = pane.dataset.pane !== name;
  });
  $("adminTitle").textContent = titles[name] || "Administration";
  if (name === "weather" && !$("weatherTable").childElementCount) {
    try {
      renderWeather(await api("/api/admin/weather"));
    } catch (error) {
      report(error);
    }
  }
  if (name === "logs") {
    try {
      renderLogs(await api("/api/admin/logs"));
    } catch (error) {
      report(error);
    }
  }
}

function fillSelect(select, rows, map) {
  select.replaceChildren(
    ...rows.map((row) => {
      const option = document.createElement("option");
      option.value = map.value(row);
      option.textContent = map.label(row);
      return option;
    })
  );
}

function renderUsers() {
  if (!cache.users.length) {
    $("usersTable").innerHTML = `<div class="empty"><h3>Aucun utilisateur</h3></div>`;
    return;
  }
  const selfId = cache.selfId || "";
  $("usersTable").innerHTML = `
    <table class="admin__table">
      <thead><tr><th>E-mail</th><th>Nom</th><th>Rôle</th><th></th></tr></thead>
      <tbody>
        ${cache.users
          .map((user) => {
            const id = esc(user._id);
            const isSelf = String(user._id) === String(selfId);
            const roleBtn =
              user.role === "admin"
                ? isSelf
                  ? ""
                  : `<button class="btn" type="button" data-role="${id}" data-next-role="user">Retirer admin</button>`
                : `<button class="btn" type="button" data-role="${id}" data-next-role="admin">Promouvoir admin</button>`;
            return `
          <tr>
            <td>${esc(user.email)}</td>
            <td>${esc(user.name || "—")}</td>
            <td><span class="admin__badge">${esc(user.role)}</span></td>
            <td class="admin__actions">
              <button class="btn" type="button" data-rename="${id}">Renommer</button>
              ${roleBtn}
            </td>
          </tr>`;
          })
          .join("")}
      </tbody>
    </table>`;
}

function renderMemberships() {
  fillSelect($("membershipUser"), cache.users, {
    value: (u) => u._id,
    label: (u) => u.email,
  });
  fillSelect($("membershipTenant"), cache.tenants, {
    value: (t) => t._id,
    label: (t) => `${t.name} (${t.slug})`,
  });

  if (!cache.memberships.length) {
    $("membershipsTable").innerHTML = `<div class="empty"><h3>Aucune appartenance</h3></div>`;
    return;
  }

  $("membershipsTable").innerHTML = `
    <table class="admin__table">
      <thead><tr><th>Utilisateur</th><th>Tenant</th><th></th></tr></thead>
      <tbody>
        ${cache.memberships
          .map((row) => {
            const user = row.userId?.email || row.userId;
            const tenant = row.tenantId?.slug || row.tenantId;
            const userId = row.userId?._id || row.userId;
            const tenantId = row.tenantId?._id || row.tenantId;
            return `
            <tr>
              <td>${esc(user)}</td>
              <td>${esc(tenant)}</td>
              <td class="admin__actions">
                <button class="btn" type="button" data-unmember-user="${esc(userId)}" data-unmember-tenant="${esc(tenantId)}">Retirer</button>
              </td>
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>`;
}

function renderTenants() {
  if (!cache.tenants.length) {
    $("tenantsTable").innerHTML = `<div class="empty"><h3>Aucun tenant</h3></div>`;
    return;
  }
  $("tenantsTable").innerHTML = `
    <table class="admin__table">
      <thead><tr><th></th><th>Slug</th><th>Nom</th><th></th></tr></thead>
      <tbody>
        ${cache.tenants
          .map(
            (tenant) => `
          <tr>
            <td><span class="admin__swatch" style="background:${esc(tenant.color || "#6b7280")}"></span></td>
            <td><code>${esc(tenant.slug)}</code></td>
            <td>${esc(tenant.name)}</td>
            <td class="admin__actions">
              <button class="btn" type="button" data-edit-tenant="${esc(tenant._id)}">Renommer</button>
              <button class="btn" type="button" data-delete-tenant="${esc(tenant._id)}">Supprimer</button>
            </td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

function renderWeather(rows) {
  if (!rows.length) {
    $("weatherTable").innerHTML = `<div class="empty"><h3>Aucun relevé</h3></div>`;
    return;
  }
  $("weatherTable").innerHTML = `
    <table class="admin__table">
      <thead><tr><th>Station</th><th>Date</th><th>Tenant</th><th></th></tr></thead>
      <tbody>
        ${rows
          .slice(0, 200)
          .map((doc) => {
            const id = String(doc._id);
            const ts = doc.ts ? new Date(doc.ts).toLocaleString("fr-FR") : "—";
            return `
            <tr>
              <td>${esc(doc.callLetters || doc.st || "—")}</td>
              <td>${esc(ts)}</td>
              <td>${doc.tenantId ? esc(String(doc.tenantId)) : "<em>partagé</em>"}</td>
              <td class="admin__actions">
                <button class="btn" type="button" data-delete-weather="${esc(id)}">Supprimer</button>
              </td>
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>`;
}

function renderLogs(rows) {
  if (!rows.length) {
    $("logsTable").innerHTML = `<div class="empty"><h3>Aucun événement</h3><p>Les connexions, relevés et actions admin apparaîtront ici.</p></div>`;
    return;
  }
  $("logsTable").innerHTML = `
    <table class="admin__table">
      <thead><tr><th>Date</th><th>Niveau</th><th>Action</th><th>Qui</th><th>Détail</th></tr></thead>
      <tbody>
        ${rows
          .map((row) => {
            const level = row.level || "info";
            const badge =
              level === "error" ? "admin__badge admin__badge--error" : level === "warn" ? "admin__badge admin__badge--warn" : "admin__badge";
            const at = row.at ? new Date(row.at).toLocaleString("fr-FR") : "—";
            return `
            <tr>
              <td>${esc(at)}</td>
              <td><span class="${badge}">${esc(level)}</span></td>
              <td><code>${esc(row.action)}</code></td>
              <td>${esc(row.who || "—")}</td>
              <td>${esc(row.detail || "")}</td>
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>`;
}

async function loadDashboard() {
  const [users, tenants, memberships, stats] = await Promise.all([
    api("/api/admin/users"),
    api("/api/admin/tenants"),
    api("/api/admin/memberships"),
    api("/api/admin/stats"),
  ]);
  cache = { ...cache, users, tenants, memberships, stats };
  renderStats(stats);
  renderUsers();
  renderMemberships();
  renderTenants();
  showPanel("dashboard");
  $("adminNav").hidden = false;
  $("adminWho").hidden = false;
  $("adminSub").textContent = "Gestion des comptes, tenants et données.";
  await setTab("users");
}

async function open2fa({ setup }) {
  showPanel("gate2fa");
  $("enrollBlock").hidden = !setup;
  $("twoFactorTitle").textContent = setup ? "Activer la double authentification" : "Code de vérification";
  $("twoFactorLead").textContent = setup
    ? "Générez un QR code, scannez-le dans votre application, puis validez le code."
    : "Saisissez le code à 6 chiffres de votre application d’authentification.";
  $("qr").hidden = true;
  $("secret").hidden = true;
  $("recovery").hidden = true;
  $("code").value = "";
  $("code").focus();
}

async function start() {
  clearError();
  try {
    const user = await api("/api/google/me");
    cache.selfId = user._id;
    $("adminWho").textContent = user.email;
    $("adminSub").textContent = "Backoffice : utilisateurs, tenants, appartenances et relevés.";

    if (user.role !== "admin") {
      $("deniedText").textContent = "Ce compte n’est pas administrateur.";
      showPanel("gateDenied");
      return;
    }

    if (!user.twoFactorEnabled) {
      await open2fa({ setup: true });
      return;
    }

    try {
      await api("/api/admin/users");
      await loadDashboard();
    } catch (error) {
      if (error.code === "two_factor_required" || error.status === 401) {
        await open2fa({ setup: false });
        return;
      }
      throw error;
    }
  } catch (error) {
    if (error.code === "auth_required" || error.status === 401) {
      $("adminSub").textContent = "Connexion administrateur requise.";
      showPanel("gateLogin");
      return;
    }
    report(error);
    showPanel("gateLogin");
  }
}

$("enrollBtn").addEventListener("click", async () => {
  clearError();
  try {
    const result = await api("/api/auth/2fa/enroll", { method: "POST" });
    $("qr").src = result.qrDataUrl;
    $("qr").hidden = false;
    $("secret").hidden = false;
    $("secret").textContent = `Secret : ${result.secret}\n${result.otpauthUrl}`;
  } catch (error) {
    report(error);
  }
});

$("verifyForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();
  try {
    const result = await api("/api/auth/2fa/verify", {
      method: "POST",
      body: JSON.stringify({ code: $("code").value.trim() }),
    });
    if (result.recoveryCodes?.length) {
      $("recovery").hidden = false;
      $("recovery").textContent = `Codes de récupération (à conserver) :\n${result.recoveryCodes.join("\n")}`;
    }
    await loadDashboard();
  } catch (error) {
    report(error);
  }
});

$$("#adminNav [data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    clearError();
    setTab(btn.dataset.tab);
  });
});

$("refreshUsers").addEventListener("click", async () => {
  clearError();
  try {
    cache.users = await api("/api/admin/users");
    renderUsers();
  } catch (error) {
    report(error);
  }
});

$("usersTable").addEventListener("click", async (event) => {
  const rename = event.target.closest("[data-rename]");
  const roleBtn = event.target.closest("[data-role]");
  clearError();
  try {
    if (rename) {
      const name = window.prompt("Nouveau nom :");
      if (!name) return;
      await api(`/api/admin/users/${rename.dataset.rename}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
    } else if (roleBtn) {
      const next = roleBtn.dataset.nextRole;
      const label = next === "admin" ? "Promouvoir cet utilisateur administrateur ?" : "Retirer le rôle administrateur ?";
      if (!window.confirm(label)) return;
      await api(`/api/admin/users/${roleBtn.dataset.role}`, {
        method: "PATCH",
        body: JSON.stringify({ role: next }),
      });
    } else {
      return;
    }
    cache.users = await api("/api/admin/users");
    renderUsers();
  } catch (error) {
    report(error);
  }
});

$("membershipForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  try {
    await api("/api/admin/memberships", { method: "POST", body: JSON.stringify(data) });
    cache.memberships = await api("/api/admin/memberships");
    renderMemberships();
  } catch (error) {
    report(error);
  }
});

$("membershipsTable").addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-unmember-user]");
  if (!btn) return;
  if (!window.confirm("Retirer cette appartenance ?")) return;
  clearError();
  try {
    await api(`/api/admin/memberships/${btn.dataset.unmemberUser}/${btn.dataset.unmemberTenant}`, {
      method: "DELETE",
    });
    cache.memberships = await api("/api/admin/memberships");
    renderMemberships();
  } catch (error) {
    report(error);
  }
});

$("tenantForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  try {
    await api("/api/admin/tenants", { method: "POST", body: JSON.stringify(data) });
    event.currentTarget.reset();
    $("tenantColor").value = "#0c74a8";
    cache.tenants = await api("/api/admin/tenants");
    renderTenants();
    renderMemberships();
    await refreshStats();
  } catch (error) {
    report(error);
  }
});

$("tenantsTable").addEventListener("click", async (event) => {
  const edit = event.target.closest("[data-edit-tenant]");
  const del = event.target.closest("[data-delete-tenant]");
  clearError();
  try {
    if (edit) {
      const name = window.prompt("Nouveau nom du tenant :");
      if (!name) return;
      await api(`/api/admin/tenants/${edit.dataset.editTenant}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      cache.tenants = await api("/api/admin/tenants");
      renderTenants();
      renderMemberships();
    }
    if (del) {
      if (!window.confirm("Supprimer ce tenant et ses appartenances ?")) return;
      await api(`/api/admin/tenants/${del.dataset.deleteTenant}`, { method: "DELETE" });
      cache.tenants = await api("/api/admin/tenants");
      cache.memberships = await api("/api/admin/memberships");
      renderTenants();
      renderMemberships();
      await refreshStats();
    }
  } catch (error) {
    report(error);
  }
});

$("refreshWeather").addEventListener("click", async () => {
  clearError();
  try {
    renderWeather(await api("/api/admin/weather"));
    await refreshStats();
  } catch (error) {
    report(error);
  }
});

$("refreshLogs").addEventListener("click", async () => {
  clearError();
  try {
    renderLogs(await api("/api/admin/logs"));
  } catch (error) {
    report(error);
  }
});

$("weatherTable").addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-delete-weather]");
  if (!btn) return;
  if (!window.confirm("Supprimer ce relevé ?")) return;
  clearError();
  try {
    await api(`/api/admin/weather/${btn.dataset.deleteWeather}`, { method: "DELETE" });
    renderWeather(await api("/api/admin/weather"));
    await refreshStats();
  } catch (error) {
    report(error);
  }
});

start();
