//Author: Cleveland Plonsey
//date: 11/9/2023
//Purpose: controllers for user requests
const connection = require("../db/connection");
const bcrypt = require("bcrypt");

const register = async (request, response) => {
  const { username, password, email } = request.body;
  if (username && password && email) {
    const salt = "batteryAnt"; //TODO find out what this is for...
    const imageUrl = "/";
    //TODO: check if this username is availabe in the db
    let q = "SELECT * FROM users WHERE username = $1 OR email = $2";
    try {
      const result = await connection.query(q, [username, email]);
      console.log(result); //debugging
      if (result.length > 0) {
        //username is already taken
        console.log(
          "username " +
            username +
            " is already taken or email " +
            email +
            " is already in use",
        );
        response.send({ error: "username or email is already taken" });
        return;
      }
    } catch (error) {
      console.log("error checking if username is available: " + error);
    }
    //username is available
    console.log("username " + username + " is available");
    //encrypt the password with bcrypt
    bcrypt.hash(password, 10, async (err, hash) => {
      if (err) {
        console.log("error hashing password: " + err);
        response.redirect("/registerError");
      }
      //store the username and hash in the db
      q =
        "INSERT INTO users (username, password, email, salt, profile_image, created_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)";
      try {
        const result = await connection.query(q, [
          username,
          hash,
          email,
          salt,
          imageUrl,
        ]);
        console.log(result); //debugging
        //redirect to the login page
        console.log("success!");
        response.status(201).redirect("/login");
      } catch (err) {
        console.log("error inserting into db: " + err);
        response.redirect("/registerError");
      }
    });
  } else {
    //username or password was not provided
    response.redirect("/register");
  }
};

module.exports = { register };
