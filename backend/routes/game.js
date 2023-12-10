const express = require("express");
const gameRouter = express.Router();
const {
  getGameState,
  getUsersGames,
  startGame,
} = require("../controllers/gameControllers");
const {
  playCard,
  drawCard,
  unoChallenge,
} = require("../controllers/gameActionControllers");

// General Game Routes
gameRouter.get("/getMyGames", getUsersGames);

gameRouter.get("/:id", getGameState);

gameRouter.post("/:id/start", startGame);

// Game Action Routes
gameRouter.post("/:id/card/:cardId/play", playCard);

gameRouter.post("/:id/card/draw", drawCard);

gameRouter.post("/:id/unoChallenge", unoChallenge);

module.exports = gameRouter;
