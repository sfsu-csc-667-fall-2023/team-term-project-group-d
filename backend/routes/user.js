const express = require("express");
const sanitizeMiddleware = require("../middleware/sanitize-input");
const userRouter = express.Router();
const { register, login, logout } = require("../controllers/userControllers");
const { body } = require("express-validator");
const { isAuthorized, notAuthorized } = require("../middleware/auth-guard");

userRouter.post(
  "/register",
  [body("username").trim(), body("email").isEmail().normalizeEmail()],
  sanitizeMiddleware,
  notAuthorized,
  register,
);

userRouter.post(
  "/login",
  [body("usernameOrEmail").trim()],
  sanitizeMiddleware,
  notAuthorized,
  login,
);

userRouter.post("/logout", isAuthorized, logout);

// For testing if sessions working
userRouter.get("/checkauth", (req, res) => {
  if (res.locals.user)
    res.send("Logged in (client session exists for this user)");
  else res.send("Not logged in (client session does NOT exist for this user)");
});

module.exports = userRouter;
