require("dotenv").config();

const path = require("path");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

// Express
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "static")));

// Postgres
const db = require("./db/connection");

// Express Session in Postgres
const expressSession = require("express-session");
const pgSession = require("connect-pg-simple")(expressSession);

// Session Tracking
app.use(
  expressSession({
    store: new pgSession({
      pool: db.$pool,
      createTableIfMissing: true,
    }),
    secret: process.env.COOKIE_SECRET || "csc667-team-d",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: parseInt(process.env.COOKIE_MAX_AGE) || 10 * 24 * 60 * 60 * 1000,
    },
  }),
);

// Route Imports
const rootRoutes = require("./routes/root");
const userRouter = require("./routes/user");

// Middleware Imports
const { displayErrors } = require("./middleware/display-errors");

if (process.env.NODE_ENV == "development") {
  const livereload = require("livereload");
  const connectLiveReload = require("connect-livereload");

  const liveReloadServer = livereload.createServer();
  liveReloadServer.watch(path.join(__dirname, "static"));
  liveReloadServer.server.once("connection", () => {
    setTimeout(() => {
      liveReloadServer.refresh("/");
    }, 100);
  });

  app.use(connectLiveReload());
}

app.use((req, res, next) => {
  if (req.session.user) res.locals.user = req.session.user;

  next();
});

// Mount Routes
app.use("/", rootRoutes);
app.use("/user", userRouter);

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

// Display Error (End Middleware)
app.use(displayErrors);
