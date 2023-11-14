const express = require("express");
const gameRouter = express.Router();
const { playCard, getGame } = require("../controllers/gameControllers");

gameRouter.post("/:id/card/play", playCard);

gameRouter.get("/:id", getGame);

module.exports = gameRouter;
