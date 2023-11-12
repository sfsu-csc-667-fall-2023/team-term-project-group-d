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

// Mount Routes
app.use("/", rootRoutes);
app.use("/user", userRouter);
app.use("/test", require("./routes/test"));

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

// Display Error (End Middleware)
app.use(displayErrors);
