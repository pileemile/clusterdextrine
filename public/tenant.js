const CielTenant = (() => {
  const DEFAULT_COLOR = "#0c74a8";
  const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const requests = new Set();
  const initialPath = globalThis.location?.pathname || "/";
  const pathTenant = tenantFromPath(initialPath);
  const queryTenant = new URLSearchParams(globalThis.location?.search || "").get("tenant");
  let currentTenant =
    pathTenant || (!initialPath.startsWith("/c/") && SLUG_RE.test(queryTenant || "") ? queryTenant : null);
  let generation = 0;

  function tenantFromPath(path) {
    const match = /^\/c\/([^/]+)/.exec(String(path || ""));
    return match && SLUG_RE.test(match[1]) ? match[1] : null;
  }

  function safeColor(color) {
    return typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : DEFAULT_COLOR;
  }

  function url(path) {
    if (!currentTenant) return path;
    const parsed = new URL(path, globalThis.location?.origin || "http://localhost");
    if (parsed.pathname === "/") return `/c/${currentTenant}/${parsed.search}${parsed.hash}`;
    parsed.searchParams.set("tenant", currentTenant);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  }

  function staleRequestError() {
    const error = new Error("La requête appartient à un ancien tenant.");
    error.name = "AbortError";
    return error;
  }

  function assertGeneration(startedAt) {
    if (startedAt !== generation) throw staleRequestError();
  }

  async function api(path, options = {}) {
    const startedAt = generation;
    const controller = new AbortController();
    const originalSignal = options.signal;
    const abortFromOriginal = () => controller.abort(originalSignal.reason);
    if (originalSignal?.aborted) abortFromOriginal();
    else originalSignal?.addEventListener("abort", abortFromOriginal, { once: true });

    const headers = new Headers(options.headers || {});
    if (currentTenant) headers.set("X-Tenant", currentTenant);
    requests.add(controller);

    try {
      const response = await fetch(path, { ...options, headers, signal: controller.signal });
      assertGeneration(startedAt);
      return response;
    } catch (error) {
      if (startedAt !== generation) throw staleRequestError();
      throw error;
    } finally {
      requests.delete(controller);
      originalSignal?.removeEventListener("abort", abortFromOriginal);
    }
  }

  function setTenant(slug) {
    if (slug !== null && !SLUG_RE.test(slug)) return false;
    generation += 1;
    currentTenant = slug;
    for (const controller of requests) controller.abort();
    requests.clear();
    return true;
  }

  return {
    DEFAULT_COLOR,
    isValidSlug: (slug) => typeof slug === "string" && SLUG_RE.test(slug),
    tenantFromPath,
    safeColor,
    url,
    api,
    assertGeneration,
    setTenant,
    get currentTenant() {
      return currentTenant;
    },
    get generation() {
      return generation;
    },
  };
})();

function tenantFromPath(path) {
  return CielTenant.tenantFromPath(path);
}

function safeColor(color) {
  return CielTenant.safeColor(color);
}

function api(path, options) {
  return CielTenant.api(path, options);
}

if (typeof window !== "undefined") window.CielTenant = CielTenant;
if (typeof module !== "undefined" && module.exports) module.exports = CielTenant;