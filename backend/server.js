require("dotenv").config();

const path = require("path");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const { createServer } = require("http");
const { Server } = require("socket.io");

// Express
const express = require("express");
const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "static")));
app.use(express.static("frontend"));
app.enable("trust proxy");

// Middleware Imports
const { sessionConfig, setLocalUserData } = require("./db/session");
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

// Session Setup (Start Middleware)
app.use(sessionConfig);
app.use(setLocalUserData);

//Socket IO
const io = new Server(httpServer);
io.engine.use(sessionConfig);
app.set("io", io);

io.on("connection", (socket) => {
  if (socket.handshake.query != undefined) {
    // join the game room
    socket.join(socket.handshake.query.id + "");
  }
  //join your own room
  socket.join(socket.request.session.id);
});

// Mount Routes
const Routes = require("./routes");
const { reqLoggedIn } = require("./middleware/auth-guard");

app.use("/", Routes.root);
app.use("/user", Routes.user);
app.use("/chat", reqLoggedIn, Routes.chat);
app.use("/lobby", reqLoggedIn, Routes.lobby, Routes.chat);
app.use("/game", reqLoggedIn, Routes.game, Routes.chat);

app.use("/test", require("./routes/test"));

httpServer.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

// Display Error (End Middleware)
app.use(displayErrors);
