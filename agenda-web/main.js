import { createApp, ref, reactive, onMounted } from "vue";
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from "@fullcalendar/core/locales/fr";
import { useGoogleCalendar } from "./useGoogleCalendar.js";
import { toInputValue, toGoogleEvent } from "./events.js";

const HOUR = 60 * 60 * 1000;

const template = `
  <p v-if="checking" class="agenda__info">Chargement…</p>

  <div v-else-if="!connected" class="agenda__connect">
    <p>Connectez votre compte Google pour voir et gérer vos événements.</p>
    <button class="btn btn--primary" type="button" @click="connect">Connecter Google Calendar</button>
    <p v-if="error" class="agenda__error" role="alert">{{ error }}</p>
  </div>

  <template v-else>
    <div class="agenda__bar">
      <p class="agenda__account">Compte Google connecté</p>
      <p v-if="loading" class="agenda__info">Chargement des événements…</p>
      <div class="agenda__actions">
        <button class="btn btn--primary" type="button" @click="openNew(new Date())">Nouvel événement</button>
        <button class="btn" type="button" @click="logout">Déconnexion</button>
      </div>
    </div>
    <p v-if="notice" class="agenda__notice">{{ notice }}</p>
    <p v-if="error && !form.open" class="agenda__error" role="alert">{{ error }}</p>
    <FullCalendar ref="calendar" :options="options" />
  </template>

  <div v-if="form.open" class="modal" @click.self="form.open = false">
    <form class="modal__box" @submit.prevent="save">
      <h2>{{ form.id ? "Modifier l'événement" : "Nouvel événement" }}</h2>
      <div class="field">
        <label for="evTitle">Titre</label>
        <input id="evTitle" v-model="form.title" required />
      </div>
      <div class="form__grid">
        <div class="field">
          <label for="evStart">Début</label>
          <input id="evStart" type="datetime-local" v-model="form.start" required />
        </div>
        <div class="field">
          <label for="evEnd">Fin</label>
          <input id="evEnd" type="datetime-local" v-model="form.end" required />
        </div>
      </div>
      <div class="field">
        <label for="evDescription">Description</label>
        <textarea id="evDescription" v-model="form.description" rows="3"></textarea>
      </div>
      <p v-if="error" class="agenda__error" role="alert">{{ error }}</p>
      <div class="modal__actions">
        <button v-if="form.id" class="btn modal__delete" type="button" :disabled="saving" @click="remove">Supprimer</button>
        <button class="btn" type="button" @click="form.open = false">Annuler</button>
        <button class="btn btn--primary" type="submit" :disabled="saving">Enregistrer</button>
      </div>
    </form>
  </div>
`;

const App = {
  components: { FullCalendar },
  template,
  setup() {
    const google = useGoogleCalendar();
    const { error } = google;
    const calendar = ref(null);
    const checking = ref(true);
    const loading = ref(false);
    const saving = ref(false);
    const notice = ref("");
    const form = reactive({ open: false, id: null, title: "", start: "", end: "", description: "" });

    function openNew(date) {
      error.value = "";
      Object.assign(form, {
        open: true,
        id: null,
        title: "",
        start: toInputValue(date),
        end: toInputValue(date.getTime() + HOUR),
        description: "",
      });
    }

    function openEdit(event) {
      error.value = "";
      Object.assign(form, {
        open: true,
        id: event.id,
        title: event.title,
        start: toInputValue(event.start),
        end: toInputValue(event.end || event.start.getTime() + HOUR),
        description: event.extendedProps.description,
      });
    }

    function refresh() {
      calendar.value.getApi().refetchEvents();
    }

    async function save() {
      if (new Date(form.end) <= new Date(form.start)) {
        error.value = "La fin doit être après le début.";
        return;
      }
      saving.value = true;
      try {
        const event = toGoogleEvent(form);
        if (form.id) await google.updateEvent(form.id, event);
        else await google.createEvent(event);
        form.open = false;
        refresh();
      } catch {
        // message déjà affiché par le composable
      } finally {
        saving.value = false;
      }
    }

    async function remove() {
      if (!confirm("Supprimer cet événement ?")) return;
      saving.value = true;
      try {
        await google.deleteEvent(form.id);
        form.open = false;
        refresh();
      } catch {
        // message déjà affiché par le composable
      } finally {
        saving.value = false;
      }
    }

    async function logout() {
      await google.disconnect().catch(() => {});
    }

    const options = {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      locale: frLocale,
      initialView: window.innerWidth < 720 ? "timeGridDay" : "dayGridMonth",
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay",
      },
      height: "auto",
      events: (info) => google.listEvents(info.start, info.end),
      loading: (isLoading) => {
        loading.value = isLoading;
      },
      dateClick: (info) => openNew(info.date),
      eventClick: (info) => openEdit(info.event),
    };

    onMounted(async () => {
      await google.checkStatus().catch(() => {});
      checking.value = false;

      const result = new URLSearchParams(window.location.search).get("google");
      if (result === "connected") notice.value = "Google Agenda est connecté.";
      if (result === "refused") error.value = "La connexion à Google a été refusée.";
      if (result) history.replaceState(null, "", window.location.pathname);
    });

    return { ...google, calendar, checking, loading, saving, notice, form, options, openNew, save, remove, logout };
  },
};

createApp(App).mount("#agendaApp");
