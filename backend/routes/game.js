const express = require("express");
const gameRouter = express.Router();
const {
  playCard,
  getGameState,
  drawCard,
  joinGame,
  createGame,
  getUsersGames,
  startGame,
  unoChallenge,
} = require("../controllers/gameControllers");

gameRouter.post("/:id/card/:cardId/play", playCard);

gameRouter.post("/create", createGame);

gameRouter.post("/:id/join", joinGame);

gameRouter.get("/getMyGames", getUsersGames);

gameRouter.get("/:id", getGameState);

gameRouter.post("/:id/card/draw", drawCard);

gameRouter.post("/:id/start", startGame);

gameRouter.post("/:id/unoAccuse", unoChallenge);

module.exports = gameRouter;
