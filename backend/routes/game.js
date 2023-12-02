const express = require("express");
const gameRouter = express.Router();
const {
  playCard,
  getGame,
  createGame,
  joinGame,
  getMyGames,
} = require("../controllers/gameControllers");

gameRouter.post("/:id/card/play", playCard);

gameRouter.post("/create", createGame);

gameRouter.post("/:id/join", joinGame);

gameRouter.get("/mine", getMyGames);

gameRouter.get("/:id", getGame);

module.exports = gameRouter;
