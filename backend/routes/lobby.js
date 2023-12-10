const express = require("express");
const lobbyRouter = express.Router();
const {
  getLobbyUsers,
  getLobbies,
  getLobby,
  joinLobby,
  createLobby,
} = require("../controllers/lobbyControllers");

lobbyRouter.get("/:id/users", getLobbyUsers);

lobbyRouter.get("/list", getLobbies);

lobbyRouter.post("/:id/join", joinLobby);

lobbyRouter.post("/create", createLobby);

lobbyRouter.get("/:id", getLobby);

module.exports = lobbyRouter;
