const express = require("express");
const lobbyRouter = express.Router();
const { reqLoggedIn } = require("../middleware/auth-guard");

lobbyRouter.post("/create", reqLoggedIn, (req, res) => {
  res.send("WIP");
});

lobbyRouter.post("/join/:id", reqLoggedIn, (req, res) => {
  res.send("WIP");
});

lobbyRouter.post("/leave/:id", reqLoggedIn, (req, res) => {
  res.send("WIP");
});

module.exports = lobbyRouter;
