const mongoose = require("mongoose");

// Schéma flexible : les documents officiels ont beaucoup de champs imbriqués.
const weatherSchema = new mongoose.Schema(
  {
    st: String,
    ts: Date,
    callLetters: String,
    type: String,
  },
  {
    collection: "data",
    strict: false,
    versionKey: false,
  }
);

module.exports = mongoose.model("Weather", weatherSchema);
