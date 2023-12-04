const express = require("express");
const lobbyRouter = express.Router();
const {
  getLobbyUsers,
  getLobbies,
  getLobby,
} = require("../controllers/lobbyControllers");

lobbyRouter.get("/:id/users", getLobbyUsers);

lobbyRouter.get("/list", getLobbies);

lobbyRouter.get("/:id", getLobby);

module.exports = lobbyRouter;
