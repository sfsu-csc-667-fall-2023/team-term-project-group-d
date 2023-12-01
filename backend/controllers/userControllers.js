const connection = require("../db/connection");
const bcrypt = require("bcrypt");

const register = async (req, res) => {
  const { username, password, email } = req.body;
  if (username && password && email) {
    const salt = "batteryAnt"; //TODO find out what this is for...
    const imageUrl = "/"; //TODO: change this to the default image url
    const selectUserQuery =
      "SELECT * FROM users WHERE username = $1 or email = $2";
    try {
      const result = await connection.query(selectUserQuery, [username, email]);
      const errors = [];
      if (result.length > 0) {
        result.forEach((user) => {
          if (user.username === username) {
            errors.push("username is taken");
          }

          if (user.email === email) {
            errors.push("email is taken");
          }
        });

        req.session.errors = errors.join("\n");
        return res.redirect("/register");
      }
    } catch (error) {
      console.error(error);

      req.session.errors = "Internal Server Errors";
      return res.redirect("/register");
    }

    bcrypt.hash(password, 10, async (err, hash) => {
      if (err) {
        console.error("error hashing password: " + err);

        req.session.errors = "Internal Server Errors";
        return res.redirect("/register");
      }

      const insertNewUserQuery =
        "INSERT INTO users (username, password, email, salt, profile_image, created_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)";
      try {
        await connection.query(insertNewUserQuery, [
          username,
          hash,
          email,
          salt,
          imageUrl,
        ]);

        res.redirect("/login");
      } catch (err) {
        console.error("error inserting into db: " + err);

        req.session.errors = "Internal Server Error";
        return res.redirect("/register");
      }
    });
  } else {
    req.session.errors = null;
    return res.redirect("/register");
  }
};

const login = async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  if (usernameOrEmail && password) {
    const querySelectUser =
      "SELECT * FROM users WHERE (username = $1 OR email = $1)";

    await connection
      .oneOrNone(querySelectUser, [usernameOrEmail])
      .then(async (user) => {
        if (user && (await bcrypt.compare(password, user.password))) {
          // TODO: Define all data from DB we want to pass to views on response.locals, or simply replace this all with 'isLoggedIn: true'
          req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
          };

          req.session.messages = null;
          return res.redirect("/");
        } else {
          req.session.errors = "Invalid username or password";
          return res.redirect("/login");
        }
      })
      .catch((err) => {
        console.error(err);
        return res.redirect("/login");
      });
  } else {
    req.session.errors = "Must provide both username/email and password";
    return res.redirect("/login");
  }
};

const logout = (request, response) => {
  request.session.destroy((err) => {
    if (err) {
      console.error(err);
      // Todo: A proper redirect or something after failed logout
      response.send("Error occurred");
    } else response.redirect("/login");
  });
};

module.exports = { register, login, logout };
