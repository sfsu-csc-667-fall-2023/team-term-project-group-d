const connection = require("../db/connection");
const bcrypt = require("bcrypt");

const register = async (request, response) => {
  const { username, password, email } = request.body;
  if (username && password && email) {
    const salt = "batteryAnt"; //TODO find out what this is for...
    const imageUrl = "/"; //TODO: change this to the default image url
    //TODO: check if this username is availabe in the db
    let selectUserQuery =
      "SELECT * FROM users WHERE username = $1 OR email = $2";
    try {
      const result = await connection.query(selectUserQuery, [username, email]);
      if (result.length > 0) {
        console.log(
          `username: ${username} is already taken or email ${email} is already in use`,
        );
        response.send({ error: "username or email is already taken" });
        return;
      }
    } catch (error) {
      console.log("error checking if username is available: " + error);
    }

    bcrypt.hash(password, 10, async (err, hash) => {
      if (err) {
        console.log("error hashing password: " + err);
        response.redirect("/registerError");
      }

      const insertNewUserQuery =
        "INSERT INTO users (username, password, email, salt, profile_image, created_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)";
      try {
        const result = await connection.query(insertNewUserQuery, [
          username,
          hash,
          email,
          salt,
          imageUrl,
        ]);

        response.status(201).redirect("/login");
      } catch (err) {
        console.log("error inserting into db: " + err);
        response.redirect("/registerError");
      }
    });
  } else {
    response.redirect("/register");
  }
};

const login = async (request, response) => {
  const { usernameOrEmail, password } = request.body;

  if (usernameOrEmail && password) {
    const querySelectUser =
      "SELECT * FROM users WHERE (username = $1 OR email = $1)";

    await connection
      .oneOrNone(querySelectUser, [usernameOrEmail])
      .then(async (user) => {
        if (user && (await bcrypt.compare(password, user.password))) {
          // TODO: Define all data from DB we want to pass to views on response.locals, or simply replace this all with 'isLoggedIn: true'
          request.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            profileImage: user.profile_image,
          };

          // TODO: Redirect somewhere after successful login
          response.send("Logged in successful");
          // response.redirect('/some-view');
        } else {
          // TODO: Redirect somewhere after failed login
          response
            .status(401)
            .send("Invalid username/email and password combination");
          // response.render('login', { error: "Invalid username/email and password combination" });
        }
      })
      .catch((err) => {
        console.error(err);
        response.redirect("/login");
      });
  } else {
    response.redirect("/login");
  }
};

module.exports = { register, login };
