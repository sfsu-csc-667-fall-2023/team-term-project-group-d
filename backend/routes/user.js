const express = require("express");
const sanitizeMiddleware = require("../middleware/sanitize-input");
const userRouter = express.Router();
const { register, login } = require("../controllers/userControllers");
const { body } = require("express-validator");

userRouter.post(
  "/register",
  [body("username").trim(), body("email").isEmail().normalizeEmail()],
  sanitizeMiddleware,
  register,
);

userRouter.post(
  "/login",
  [body("usernameOrEmail").trim()],
  sanitizeMiddleware,
  login,
);

module.exports = userRouter;
