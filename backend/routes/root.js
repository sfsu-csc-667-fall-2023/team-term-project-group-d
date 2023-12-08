const express = require("express");
const router = express.Router();
const { notAuthorized } = require("../middleware/auth-guard");

router.get("/", (_request, response) => {
  response.render("home.ejs");
});

router.get("/login", notAuthorized, (_request, response) => {
  response.render("login.ejs");
});

router.get("/register", notAuthorized, (_request, response) => {
  response.render("register.ejs");
});

module.exports = router;
