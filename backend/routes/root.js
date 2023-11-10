const express = require("express");
const router = express.Router();
const { reqLoggedIn, reqLoggedOut } = require("../middleware/auth-guard");

router.get("/", (_request, response) => {
  response.render("home.ejs");
});

router.get("/login", reqLoggedOut, (_request, response) => {
  response.render("login.ejs");
});

router.get("/register", reqLoggedOut, (_request, response) => {
  response.render("register.ejs");
});

module.exports = router;
