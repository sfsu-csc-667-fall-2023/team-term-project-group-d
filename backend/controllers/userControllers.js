const db = require("../db/connection");
const bcrypt = require("bcrypt");
const { createHash } = require("crypto");

const register = async (req, res) => {
  const { username, password, email } = req.body;

  if (username && password && email) {
    const salt = "batteryAnt";
    const selectUserQuery =
      "SELECT email, username FROM users WHERE username = $1 or email = $2";

    try {
      const result = await db.query(selectUserQuery, [username, email]);

      if (result.length > 0) {
        result.forEach((user) => {
          if (user.username === username)
            req.flash("error", "Username is taken");

          if (user.email === email) req.flash("error", "Email is taken");
        });

        return res.redirect("/register");
      }
    } catch (error) {
      console.error(error);

      req.flash("error", "Internal Server Errors");
      return res.redirect("/register");
    }

    bcrypt.hash(password, 10, async (err, hashedPassword) => {
      if (err) {
        console.error("error hashing password: " + err);

        req.flash("error", "Internal Server Errors");
        return res.redirect("/register");
      }

      const imageHash = createHash("sha256").update(email).digest("hex"); // 64 char hash
      const imageURL = `https://robohash.org/${imageHash}`; // 21 + 64 = 85 chars

      const insertNewUserQuery =
        "INSERT INTO users (username, password, email, salt, image) VALUES ($1, $2, $3, $4, $5)";
      try {
        await db.query(insertNewUserQuery, [
          username,
          hashedPassword,
          email,
          salt,
          imageURL,
        ]);

        res.redirect("/login");
      } catch (err) {
        console.error("error inserting into db: " + err);

        req.flash("error", "Internal Server Errors");
        return res.redirect("/register");
      }
    });
  } else {
    return res.redirect("/register");
  }
};

const login = async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  if (usernameOrEmail && password) {
    const querySelectUser =
      "SELECT * FROM users WHERE (username = $1 OR email = $1)";

    await db
      .oneOrNone(querySelectUser, [usernameOrEmail])
      .then(async (user) => {
        if (user && (await bcrypt.compare(password, user.password))) {
          req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            image: user.image,
          };

          return res.redirect("/");
        } else {
          req.flash("error", "Invalid username or password");
          return res.redirect("/login");
        }
      })
      .catch((err) => {
        console.error(err);
        return res.redirect("/login");
      });
  } else {
    req.flash("error", "Must provide both username/email and password");
    return res.redirect("/login");
  }
};

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);

      req.flash("error", "Error logging out");
      return res.redirect("/");
    } else return res.redirect("/login");
  });
};

module.exports = { register, login, logout };
