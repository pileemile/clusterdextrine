function today(hour) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

describe("Agenda", () => {
  it("affiche le bouton de connexion si le compte n'est pas connecté", () => {
    cy.intercept("GET", "/api/google/status", { connected: false });
    cy.visit("/agenda.html");

    cy.contains("button", "Connecter Google Calendar").should("be.visible");
    cy.get(".fc").should("not.exist");
  });

  it("affiche les événements Google et permet d'en créer un", () => {
    const events = [
      { id: "1", summary: "Réunion d'équipe", start: { dateTime: today(10) }, end: { dateTime: today(11) } },
    ];
    cy.intercept("GET", "/api/google/status", { connected: true });
    cy.intercept("GET", "/api/google/events*", (req) => req.reply(events)).as("events");
    cy.intercept("POST", "/api/google/events", (req) => {
      const created = { id: "2", ...req.body };
      events.push(created);
      req.reply(201, created);
    }).as("create");

    cy.visit("/agenda.html");
    cy.wait("@events");
    cy.contains("Compte Google connecté");
    cy.contains(".fc-event", "Réunion d'équipe");

    cy.contains("button", "Nouvel événement").click();
    cy.get("#evTitle").type("Dentiste");
    cy.get("#evDescription").type("Penser à la carte vitale");
    cy.contains("button", "Enregistrer").click();

    cy.wait("@create").its("request.body").should((body) => {
      expect(body.summary).to.equal("Dentiste");
      expect(body.description).to.equal("Penser à la carte vitale");
      expect(body.start.dateTime).to.be.a("string");
    });
    cy.get(".modal").should("not.exist");
    cy.contains(".fc-event", "Dentiste");
  });
});
