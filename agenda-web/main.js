import { createApp, h } from "vue";
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import frLocale from "@fullcalendar/core/locales/fr";
import { fetchEvents } from "./events.js";

const options = {
  plugins: [dayGridPlugin, timeGridPlugin],
  locale: frLocale,
  initialView: "dayGridMonth",
  headerToolbar: {
    left: "prev,next today",
    center: "title",
    right: "dayGridMonth,timeGridWeek,timeGridDay",
  },
  height: "auto",
  events: (info) => fetchEvents(info.start, info.end),
};

createApp({ render: () => h(FullCalendar, { options }) }).mount("#agendaApp");
