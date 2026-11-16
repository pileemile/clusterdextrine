export function toCalendarEvent(item) {
  return {
    id: item.id,
    title: item.summary || "(Sans titre)",
    start: item.start.dateTime || item.start.date,
    end: item.end?.dateTime || item.end?.date,
    allDay: !item.start.dateTime,
    url: item.htmlLink,
  };
}

export async function fetchEvents(start, end) {
  const params = new URLSearchParams({ timeMin: start.toISOString(), timeMax: end.toISOString() });
  const res = await fetch(`/api/google/events?${params}`);
  if (!res.ok) throw new Error("Impossible de charger l'agenda");
  const items = await res.json();
  return items.map(toCalendarEvent);
}
