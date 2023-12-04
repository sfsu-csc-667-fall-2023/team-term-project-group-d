const express = require("express");
const gameRouter = express.Router();
const {
  playCard,
  getGame,
  drawCard,
  joinGame,
  createGame,
  joinGame,
  getMyGames,
  startGame,
} = require("../controllers/gameControllers");

gameRouter.post("/:id/card/play", playCard);

gameRouter.post("/create", createGame);

gameRouter.post("/:id/join", joinGame);

gameRouter.get("/mine", getMyGames);

gameRouter.get("/:id", getGame);

gameRouter.post("/:id/card/draw", drawCard);

gameRouter.post("/startGame", startGame);

module.exports = gameRouter;
