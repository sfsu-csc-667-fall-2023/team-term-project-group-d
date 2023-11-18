const express = require("express");
const testRouter = express.Router();
const { getGame } = require("../controllers/testControllers");

testRouter.get("/game", getGame);

module.exports = testRouter;
