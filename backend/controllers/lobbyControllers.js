const db = require("../db/connection");
const { logMessageToChat } = require("../helpers/logToChat");
const { StatusCodes } = require("http-status-codes");

const getLobbyUsers = async (req, res) => {
  const { id: gameId } = req.params;
  const { id: userId } = req.session.user;
  //grab all the players that are in this game
  const players = await db.any(
    `SELECT users.username FROM users
        JOIN game_users ON users.id = game_users.users_id
        JOIN games ON games.id = game_users.game_id
        WHERE games.id = $1`,
    [gameId],
  );
  console.log(JSON.stringify(players));
  res.render("lobby.ejs", {
    gameId: gameId,
    players: players,
    chatMessages: ["hey what is up bro!?"],
  });
};

const getLobby = async (req, res) => {
  const { id: gameId } = req.params;
  const { id: userId } = req.session.user;

  const getLobbyQuery = `SELECT id, name, active
    FROM games
    WHERE (id = $1)
    AND EXISTS (
        SELECT game_id
        FROM game_users
        WHERE users_id = $2
        AND game_id = $1
    )`;

  const playerListQuery = `SELECT u.username, u.image FROM users u 
    LEFT JOIN game_users gu ON u.id = gu.users_id 
    WHERE (gu.game_id = $1)`;

  const getMaxPlayersQuery = `SELECT max_players FROM games WHERE id = $1`;

  let lobby;
  try {
    lobby = await db.oneOrNone(getLobbyQuery, [gameId, userId]);
    console.log(JSON.stringify(lobby));

    // if the user is not in the lobby, redirect to attempt to add them to the lobby on joinLobby
    if (!lobby) return res.render("joinLobby", { id: gameId });
  } catch (err) {
    console.error("error connecting to lobby ", err);
    return res.status(500).send(`Could not connect to Lobby`);
  }

  // if lobby is actually a game (is active), redirect to game page
  if (lobby.active) return res.redirect("/game/" + gameId);

  // try to render the lobby
  try {
    const players = await db.any(playerListQuery, [gameId]);
    const maxPlayers = await db.one(getMaxPlayersQuery, [gameId]);
    res.render("lobby.ejs", {
      maxPlayers: maxPlayers.max_players,
      gameName: lobby.name,
      gameId: gameId,
      players: players,
      chatMessages: ["hey what is up bro!?"],
    });
  } catch (err) {
    console.error(
      "error getting list of players or max players in lobby ",
      err,
    );
    return res
      .status(500)
      .send(`Could not get list of Players or the max players in Lobby`);
  }
};

/**
 * get lobbies (inactive games) the user is not in
 * @returns games { id, name, max_players, player_count, has_password }
 */
const getLobbies = async (req, res) => {
  const { id: userId } = req.session.user;

  const getLobbiesQuery = `SELECT
      g.id, g.name, g.max_players,
      COUNT(gu.users_id) AS player_count,
      CASE
        WHEN g.password IS NOT NULL or g.password != '' THEN true
        ELSE false
      END AS has_password
    FROM games g
    LEFT JOIN game_users gu ON g.id = gu.game_id
    WHERE (g.active = false)
    AND g.id NOT IN (
      SELECT game_id
      FROM game_users
      WHERE users_id = $1
    )
    GROUP BY g.id, g.name, g.max_players
    ORDER BY g.id ASC`;

  try {
    const lobbies = await db.any(getLobbiesQuery, [userId]);
    res.status(200).json(lobbies);
  } catch (err) {
    console.error("error getting lobbies ", err);
    res.status(500).send(`Could not get list of Lobbies`);
  }
};

const createLobby = async (req, res) => {
  const { name, max_players } = req.body;
  let { password } = req.body;
  const { id: userId } = req.session.user;

  password = password === "" ? null : password;
  const createLobbyQuery = `INSERT INTO games (name, password, max_players)
      VALUES ($1, $2, $3)
    RETURNING id`;

  const joinLobbyQuery = `INSERT INTO game_users (users_id, game_id)
    VALUES ($1, $2)`;

  // Create a lobby
  let lobby;
  try {
    lobby = await db.one(createLobbyQuery, [name, password, max_players]);
  } catch (err) {
    // If error was due to unique column value constraint for games.name
    if (err.code === "23505") {
      return res.status(StatusCodes.CONFLICT).send(`Lobby name taken`);
    } else {
      console.error("error creating lobby", err);
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(`User could not create lobby`);
    }
  }

  // Add the user to the game
  try {
    const gameId = lobby.id;
    await db.none(joinLobbyQuery, [userId, gameId]);

    req.app.get("io").emit("lobby-created", {
      id: gameId,
      name,
      max_players,
      has_password: password != null,
      player_count: 1,
    });

    return res.redirect(`/lobby/${gameId}`);
  } catch (err) {
    console.error("error adding user to lobby", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(`Could not add user to lobby`);
  }
};

const joinLobby = async (req, res) => {
  const { id: gameId } = req.params;
  const { password } = req.body;
  const { id: userId } = req.session.user;

  // Get the lobby if it exists { id, password, max players, player count }
  const getLobbyQuery = `SELECT
      g.id, g.password, g.max_players,
      COUNT(gu.users_id) AS player_count
    FROM games g
    LEFT JOIN game_users gu ON g.id = gu.game_id
    WHERE (g.id = $1)
    GROUP BY g.id`;

  // Get lobby id if user already in that lobby
  const checkAlreadyJoinedQuery = `SELECT game_id FROM game_users
    WHERE (game_id = $1)
    AND (users_id = $2)`;

  const addUserToLobby = `INSERT INTO game_users (game_id, users_id) VALUES ($1, $2)`;

  // Check the lobby exists
  let lobby;
  try {
    lobby = await db.oneOrNone(getLobbyQuery, [gameId]);

    if (!lobby) {
      return res.status(StatusCodes.NOT_FOUND).send(`Lobby does not exist`);
    }

    if (lobby.active) {
      return res.redirect(`/game/${gameId}`);
    }
  } catch (err) {
    console.error("error occurred getting lobby info ", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(`Server error while getting Lobby`);
  }

  if (lobby.password !== password && lobby.password !== null) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .send(`Incorrect password for Lobby`);
  }

  if (lobby.player_count >= lobby.max_players) {
    return res.status(StatusCodes.CONFLICT).send(`Lobby is full`);
  }

  // Check user not already connected to lobby
  try {
    const isInLobby = await db.oneOrNone(checkAlreadyJoinedQuery, [
      gameId,
      userId,
    ]);

    // if user already in lobby, redirect to lobby page
    if (isInLobby) {
      req.session.errors = "User already in lobby";
      return res.redirect(`/lobby/${gameId}`);
    }
  } catch (err) {
    console.error("error occurred checking if user already in lobby", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(`Server error while checking if user already in lobby`);
  }

  // Add user to lobby
  try {
    await db.none(addUserToLobby, [gameId, userId]);
    req.app
      .get("io")
      .to(gameId + "")
      .emit("player-joined", {
        username: req.session.user.username,
        image: req.session.user.image,
      });
    logMessageToChat(
      req,
      gameId,
      `${req.session.user.username} joined the game`,
    );
    return res.redirect(`/lobby/${gameId}`);
  } catch (err) {
    console.error("error occurred adding user to lobby", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(`Server error while adding user to lobby`);
  }
};

module.exports = {
  getLobbyUsers,
  getLobbies,
  getLobby,
  createLobby,
  joinLobby,
};
