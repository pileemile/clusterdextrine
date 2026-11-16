const { GoogleError } = require("./errors");

const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const QUOTA_REASONS = new Set(["rateLimitExceeded", "userRateLimitExceeded"]);

async function toError(res) {
  const body = await res.json().catch(() => ({}));
  const reason = body.error?.errors?.[0]?.reason;
  if (res.status === 429 || (res.status === 403 && QUOTA_REASONS.has(reason))) {
    return new GoogleError("quota", 429, res.headers.get("retry-after"));
  }
  if (res.status === 400) return new GoogleError("bad_request", 400);
  return new GoogleError("google_error", 502);
}

function createCalendar(store) {
  function send(token, url, init) {
    return fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  }

  async function call(userId, url, init = {}) {
    let res = await send(await store.accessTokenFor(userId), url, init);
    if (res.status === 401) {
      // Token refusé avant l'échéance prévue : on retente une seule fois avec un token neuf.
      res = await send(await store.forceRefresh(userId), url, init);
      if (res.status === 401) {
        await store.remove(userId);
        throw new GoogleError("revoked", 401);
      }
    }
    if (!res.ok) throw await toError(res);
    if (res.status === 204) return null;
    return res.json();
  }

  async function listEvents(userId, { timeMin, timeMax } = {}) {
    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "50",
      timeMin: timeMin || new Date().toISOString(),
    });
    if (timeMax) params.set("timeMax", timeMax);
    const page = await call(userId, `${EVENTS_URL}?${params}`);
    return page.items ?? [];
  }

  function createEvent(userId, event) {
    return call(userId, EVENTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  }

  function updateEvent(userId, id, event) {
    return call(userId, `${EVENTS_URL}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  }

  function deleteEvent(userId, id) {
    return call(userId, `${EVENTS_URL}/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  return { listEvents, createEvent, updateEvent, deleteEvent };
}

module.exports = { createCalendar };
