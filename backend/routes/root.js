const express = require("express");
const router = express.Router();

router.get("/", (_request, response) => {
  const teamLetter = "D";
  const teamMembers = [
    "Ahmar Huda",
    "Caimin Rybolt-O'Keefe",
    "Cleveland Plonsey",
    "Evan Giampaoli",
  ];

  response.render("root", { teamLetter, teamMembers });
});

router.get("/login", (_request, response) => {
  response.render("login.ejs");
});

router.get("/register", (_request, response) => {
  response.render("register.ejs");
});

module.exports = router;
