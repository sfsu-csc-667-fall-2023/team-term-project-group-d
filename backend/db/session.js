// Postgres
const db = require("./connection");

// Express Session in Postgres
const expressSession = require("express-session");
const pgSession = require("connect-pg-simple")(expressSession);

// Session Configuration
const sessionConfig = expressSession({
  store: new pgSession({
    pool: db.$pool,
    createTableIfMissing: true,
  }),
  secret: process.env.COOKIE_SECRET || "csc667-team-d",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: parseInt(process.env.COOKIE_MAX_AGE) || 10 * 24 * 60 * 60 * 1000,
  },
});

// Set local user data taken from a client's session.user created on login
const setLocalUserData = (req, res, next) => {
  if (req.session.user) res.locals.user = req.session.user;
  else res.locals.user = null;

  next();
};

module.exports = { sessionConfig, setLocalUserData };
