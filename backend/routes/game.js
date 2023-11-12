const express = require("express");
const gameRouter = express.Router();
const { playCard } = require("../controllers/gameControllers");

gameRouter.post("/:id/card/play", playCard);

module.exports = gameRouter;
