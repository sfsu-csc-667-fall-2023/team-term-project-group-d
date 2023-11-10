const express = require("express");
const sanitizeMiddleware = require("../middleware/sanitize-input");
const userRouter = express.Router();
const { register } = require("../controllers/userControllers");
const { body } = require("express-validator");

userRouter.post("/login", (request, response) => {
  const { username, password } = request.body;
  if (username && password) {
    //TODO: change this to actually checking the db to see if the user exists
    //if the user does exist then set the cookie/session and redirect to the home page
    response.status(200).send({ username: username, password: password });
  } else {
    response.redirect("/login");
  }
});

userRouter.post(
  "/register",
  [body("username").trim(), body("email").isEmail().normalizeEmail()],
  sanitizeMiddleware,
  register,
);

module.exports = userRouter;
