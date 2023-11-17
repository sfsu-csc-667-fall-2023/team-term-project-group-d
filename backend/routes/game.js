const express = require("express");
const gameRouter = express.Router();
const { reqLoggedIn } = require("../middleware/auth-guard");

gameRouter.get("/:id", reqLoggedIn, (req, res) => {
  res.send("WIP");
});

gameRouter.post("/:id/card/play", reqLoggedIn, (req, res) => {
  res.send("WIP");
});

gameRouter.get("/:id/gethand/:id", reqLoggedIn, (req, res) => {
  res.send("WIP");
});

gameRouter.post("/:id/card/draw", reqLoggedIn, (req, res) => {
  res.send("WIP");
});

gameRouter.get("/:id/card/checkuno", reqLoggedIn, (req, res) => {
  res.send("WIP");
});

module.exports = gameRouter;
