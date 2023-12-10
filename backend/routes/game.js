const express = require("express");
const gameRouter = express.Router();
const {
  playCard,
  getGame,
  drawCard,
  joinGame,
  createGame,
  getMyGames,
  startGame,
  unoAccuse,
} = require("../controllers/gameControllers");

gameRouter.post("/:id/card/play", playCard);

gameRouter.post("/create", createGame);

gameRouter.post("/:id/join", joinGame);

gameRouter.get("/getMyGames", getMyGames);

gameRouter.get("/:id", getGame);

gameRouter.post("/:id/card/draw", drawCard);

gameRouter.post("/:id/start", startGame);

gameRouter.post("/:id/unoAccuse", unoAccuse);

module.exports = gameRouter;
