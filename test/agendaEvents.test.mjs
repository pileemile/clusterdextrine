import test from "node:test";
import assert from "node:assert/strict";
import { toCalendarEvent, toGoogleEvent, toInputValue } from "../agenda-web/events.js";

test("événement avec horaire", () => {
  const ev = toCalendarEvent({
    id: "a",
    summary: "Réunion",
    start: { dateTime: "2026-11-16T09:00:00+01:00" },
    end: { dateTime: "2026-11-16T10:00:00+01:00" },
  });
  assert.equal(ev.title, "Réunion");
  assert.equal(ev.allDay, false);
  assert.equal(ev.start, "2026-11-16T09:00:00+01:00");
});

test("événement sur la journée", () => {
  const ev = toCalendarEvent({ id: "b", start: { date: "2026-11-20" }, end: { date: "2026-11-21" } });
  assert.equal(ev.allDay, true);
  assert.equal(ev.title, "(Sans titre)");
});

test("formulaire converti au format Google", () => {
  const ev = toGoogleEvent({ title: "Sortie", description: "", start: "2026-11-20T09:00", end: "2026-11-20T10:00" });
  assert.equal(ev.summary, "Sortie");
  assert.equal(ev.start.dateTime, new Date("2026-11-20T09:00").toISOString());
});

test("date locale pour le champ datetime-local", () => {
  assert.equal(toInputValue(new Date(2026, 10, 20, 9, 5)), "2026-11-20T09:05");
});
