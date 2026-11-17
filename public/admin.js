const $ = (id) => document.getElementById(id);

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: "same-origin", ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Erreur ${response.status}`);
  return body;
}

function report(error) {
  $("error").textContent = error.message;
  $("error").hidden = false;
}

function show(id, visible) {
  $(id).hidden = !visible;
}

async function loadDashboard() {
  const [users, tenants] = await Promise.all([api("/api/admin/users"), api("/api/admin/tenants")]);
  $("users").innerHTML = users.map((user) => `<p>${user.email} — ${user.role}</p>`).join("");
  $("tenants").innerHTML = tenants.map((tenant) =>
    `<p><strong>${tenant.slug}</strong> — <span>${tenant.name}</span>
      <button data-edit="${tenant._id}">Modifier</button>
      <button data-delete="${tenant._id}">Supprimer</button></p>`
  ).join("");
  $("users").querySelectorAll("button").forEach((button) => button.addEventListener("click", async () => {
    try {
      await api(`/api/admin/users/${button.dataset.user}`, {
        method: "PATCH",
        body: JSON.stringify({ role: button.dataset.role }),
      });
      await loadDashboard();
    } catch (error) {
      report(error);
    }
  }));
  $("tenants").querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", async () => {
    const name = window.prompt("Nouveau nom du tenant :");
    if (!name) return;
    try {
      await api(`/api/admin/tenants/${button.dataset.edit}`, { method: "PATCH", body: JSON.stringify({ name }) });
      await loadDashboard();
    } catch (error) {
      report(error);
    }
  }));
  $("tenants").querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", async () => {
    if (!window.confirm("Supprimer ce tenant et ses memberships ?")) return;
    try {
      await api(`/api/admin/tenants/${button.dataset.delete}`, { method: "DELETE" });
      await loadDashboard();
    } catch (error) {
      report(error);
    }
  }));
}

async function start() {
  try {
    const user = await api("/api/google/me");
    if (user.role !== "admin") throw new Error("Ce compte n’est pas administrateur.");
    if (!user.twoFactorEnabled) {
      show("two-factor", true);
      $("message").textContent = "Configurez la double authentification.";
    } else {
      $("message").textContent = `Connecté : ${user.email}`;
      show("two-factor", true);
      $("two-factor").querySelector("h2").textContent = "Valider la double authentification";
      $("enroll").hidden = true;
      $("secret").hidden = true;
    }
  } catch (error) {
    $("message").textContent = error.message === "auth_required" ? "Connexion requise." : error.message;
    show("login", true);
  }
}

$("enroll").addEventListener("click", async () => {
  try {
    const result = await api("/api/auth/2fa/enroll", { method: "POST" });
    $("qr").src = result.qrDataUrl;
    $("qr").hidden = false;
    $("secret").textContent = `Secret : ${result.secret}\nURL à importer : ${result.otpauthUrl}`;
  } catch (error) {
    report(error);
  }
});

$("verify").addEventListener("click", async () => {
  try {
    const result = await api("/api/auth/2fa/verify", {
      method: "POST",
      body: JSON.stringify({ code: $("code").value }),
    });
    $("recovery").textContent = result.recoveryCodes.length
      ? `Codes de récupération (à conserver) :\n${result.recoveryCodes.join("\n")}`
      : "";
    show("two-factor", false);
    show("dashboard", true);
    await loadDashboard();
  } catch (error) {
    report(error);
  }
});

$("tenant-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  try {
    await api("/api/admin/tenants", { method: "POST", body: JSON.stringify(data) });
    event.currentTarget.reset();
    await loadDashboard();
  } catch (error) {
    report(error);
  }
});

start();
