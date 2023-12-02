const express = require("express");
const gameRouter = express.Router();
const {
  playCard,
  getGame,
  drawCard,
  joinGame,
} = require("../controllers/gameControllers");

gameRouter.post("/:id/card/play", playCard);

gameRouter.get("/:id", getGame);

gameRouter.post("/:id/card/draw", drawCard);

gameRouter.post("/:id/join", joinGame);

module.exports = gameRouter;
