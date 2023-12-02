const express = require("express");
const lobbyRouter = express.Router();
const { getLobbyUsers } = require("../controllers/lobbyControllers");

lobbyRouter.get("/:id", getLobbyUsers);

module.exports = lobbyRouter;
