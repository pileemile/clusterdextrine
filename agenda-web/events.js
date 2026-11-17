export function toCalendarEvent(item) {
  return {
    id: item.id,
    title: item.summary || "(Sans titre)",
    start: item.start.dateTime || item.start.date,
    end: item.end?.dateTime || item.end?.date,
    allDay: !item.start.dateTime,
    description: item.description || "",
  };
}

// Format attendu par <input type="datetime-local"> : 2026-11-20T09:00 en heure locale.
export function toInputValue(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function toGoogleEvent(form) {
  return {
    summary: form.title,
    description: form.description,
    start: { dateTime: new Date(form.start).toISOString() },
    end: { dateTime: new Date(form.end).toISOString() },
  };
}
