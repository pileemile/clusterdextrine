const path = require("path");
const express = require("express");
const { defineConfig } = require("cypress");

// L'API est mockée dans les tests : on sert seulement les fichiers de public/.
module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:4173",
    supportFile: false,
    video: false,
    setupNodeEvents() {
      express().use(express.static(path.join(__dirname, "public"))).listen(4173);
    },
  },
});
