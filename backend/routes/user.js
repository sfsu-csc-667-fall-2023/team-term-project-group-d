const express = require("express");
const sanitizeMiddleware = require("../middleware/sanitize-input");
const userRouter = express.Router();
const { register, login, logout } = require("../controllers/userControllers");
const { body } = require("express-validator");
const { reqLoggedIn, reqLoggedOut } = require("../middleware/auth-guard");

userRouter.post(
  "/register",
  [body("username").trim(), body("email").isEmail().normalizeEmail()],
  sanitizeMiddleware,
  reqLoggedOut,
  register,
);

userRouter.post(
  "/login",
  [body("usernameOrEmail").trim()],
  sanitizeMiddleware,
  reqLoggedOut,
  login,
);

userRouter.post("/logout", reqLoggedIn, logout);

// TODO: Remove /logout GET when we have a view with logout button calling /user/logout API route
userRouter.get("/logout", reqLoggedIn, logout);

// For testing if sessions working
userRouter.get("/checkauth", (req, res) => {
  if (res.locals.user)
    res.send("Logged in (client session exists for this user)");
  else res.send("Not logged in (client session does NOT exist for this user)");
});

module.exports = userRouter;
