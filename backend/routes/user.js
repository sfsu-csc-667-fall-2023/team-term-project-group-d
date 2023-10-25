const express = require("express");
const userRouter = express.Router();

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

userRouter.post("/register", (request, response) => {
  const { username, password } = request.body;
  if (username && password) {
    //TODO: check if this username is availabe in the db
    //if it is then insert the new user into the db
    //else username is not available then redirect to the registerError.ejs page
    response.status(200).send({ username: username, password: password });
  } else {
    response.redirect("/register");
  }
});

module.exports = userRouter;
