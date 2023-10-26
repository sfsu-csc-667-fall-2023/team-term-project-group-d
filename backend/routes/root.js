const express = require("express");
const router = express.Router();

router.get("/", (_request, response) => {
  response.render("home.ejs");
});

router.get("/login", (_request, response) => {
  response.render("login.ejs");
});

router.get("/register", (_request, response) => {
  response.render("register.ejs");
});

module.exports = router;
