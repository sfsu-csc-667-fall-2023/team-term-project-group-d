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

const db = require("./db/connection");

//Socket IO
const io = new Server(httpServer);
io.engine.use(sessionConfig);
app.set("io", io);

io.on("connection", (socket) => {
  if (socket.handshake.query.gameId != undefined) {
    // join the game room
    socket.join(socket.handshake.query.gameId + "");
  }
  //join your own room
  socket.join(socket.request.session.id);

  socket.on("disconnect", async () => {
    if (socket.handshake.query.userId !== undefined) {
      const { gameId, userId } = socket.handshake.query;

      const removePlayerQuery = `DELETE FROM game_users
        WHERE users_id = $1
        AND game_id = $2
        AND EXISTS (
          SELECT id
          FROM games
          WHERE id = $2
          AND active = false
        )`;

      const deleteEmptyLobbyQuery = `DELETE FROM games
        WHERE id IN (
            SELECT game_id
            FROM game_users
            WHERE game_id = $1
            GROUP BY game_id
            HAVING COUNT(users_id) = 0
        )`;

      await db.none(removePlayerQuery, [userId, gameId]);

      io.to(gameId + "").emit("player-left", { id: userId });

      await db.none(deleteEmptyLobbyQuery, [gameId]);
    }
  });
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
