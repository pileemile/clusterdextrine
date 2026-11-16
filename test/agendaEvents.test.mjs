import test from "node:test";
import assert from "node:assert/strict";
import { toCalendarEvent } from "../agenda-web/events.js";

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
