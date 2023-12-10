const express = require("express");
const router = express.Router();
const { notAuthorized } = require("../middleware/auth-guard");

router.get("/", (req, res) => {
  res.render("home.ejs");
});

router.get("/login", notAuthorized, (req, res) => {
  res.render("login.ejs", {
    messages: req.flash("error"),
  });
});

router.get("/register", notAuthorized, (req, res) => {
  res.render("register.ejs", {
    messages: req.flash("error"),
  });
});

module.exports = router;
