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

// For testing if sessions working
userRouter.get("/checkauth", (req, res) => {
  if (res.locals.user)
    res.send("Logged in (client session exists for this user)");
  else res.send("Not logged in (client session does NOT exist for this user)");
});

module.exports = userRouter;
