import { ref } from "vue";
import { toCalendarEvent } from "./events.js";

const MESSAGES = {
  not_connected: "Compte Google non connecté.",
  revoked: "L'accès à Google Agenda a été retiré, reconnectez-vous.",
  quota: "Trop de requêtes vers Google, réessayez dans un instant.",
  bad_request: "Google a refusé l'événement, vérifiez les dates.",
};

async function request(url, options = {}) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(MESSAGES[body.error] || "Le serveur ne répond pas correctement.");
    err.code = body.error;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

export function useGoogleCalendar() {
  const connected = ref(false);
  const error = ref("");

  async function call(url, options) {
    error.value = "";
    try {
      return await request(url, options);
    } catch (err) {
      if (err.code === "not_connected" || err.code === "revoked") connected.value = false;
      error.value = err.message;
      throw err;
    }
  }

  async function checkStatus() {
    const status = await call("/api/google/status");
    connected.value = status.connected;
  }

  function connect() {
    window.location.href = "/api/google/auth";
  }

  async function disconnect() {
    await call("/api/google/disconnect", { method: "DELETE" });
    connected.value = false;
  }

  async function listEvents(start, end) {
    const params = new URLSearchParams({ timeMin: start.toISOString(), timeMax: end.toISOString() });
    const items = await call(`/api/google/events?${params}`);
    return items.map(toCalendarEvent);
  }

  function createEvent(event) {
    return call("/api/google/events", { method: "POST", body: JSON.stringify(event) });
  }

  function updateEvent(id, event) {
    return call(`/api/google/events/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(event) });
  }

  function deleteEvent(id) {
    return call(`/api/google/events/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  return { connected, error, checkStatus, connect, disconnect, listEvents, createEvent, updateEvent, deleteEvent };
}
