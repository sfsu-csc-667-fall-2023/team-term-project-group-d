const db = require("../db/connection");

const playCard = async (req, res) => {
  console.log("in playcard");
  const { cardId, color, userId } = req.body;
  const gameId = req.params.id;
  console.log(cardId, color, userId, gameId);
};

//returns the initial game state
const getGame = async (req, res) => {
  const gameId = req.params.id;
  //TODO: query db to get the game row by gameID

  //the object is an example of what the game row from the query should contain.
  //maybe need to use socketio to send the correct hand to each player?
  res.render("game.ejs", {
    clientHand: [
      { color: "red", symbol: "draw_two", id: 1 },
      { color: "yellow", symbol: "three", id: 2 },
      { color: "red", symbol: "four", id: 3 },
    ],
    playerList: [
      { name: "cleveland", handSize: 4, id: 1 },
      { name: "Evan", handSize: 5, id: 2 },
      { name: "Caimin", handSize: 7, id: 3 },
    ],
    discardCard: { color: "red", symbol: "draw_two" },
    chatMessages: ["hey what is up bro!?"], //this message should display all player names in the game.
  });
};

const joinGame = async (req, res) => {
  const { id: gameId } = req.params;
  const { password } = req.body;
  const { id: userId } = req.session.user;

  /**
   * Process to actually join the lobby:
   *
   * 1) Check lobby exists (as a row in games)
   *    - Respond: lobby does not exist
   *    - If active, is a game: redirect to /games/id
   *
   * 2) Check password matches (games.password == password)
   *    - Respond: incorrect password
   *
   * 3) Check game not full (player_count < games.max_players)
   *    - Respond: lobby is full
   *
   * 4) Check user not already in lobby (game_users has a row for game id and user id)
   *    - Redirect to /lobby/id if already in lobby
   *
   * 5) Add user to lobby (add to game_users)
   *
   * 6) Redirect user to /lobby/id
   */

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

    if (!lobby) return res.status(404).send(`Lobby does not exist`);

    if (lobby.active) return res.redirect(`/game/${gameId}`);
  } catch (err) {
    console.error("error occurred getting lobby info ", err);
    return res.status(404).send(`Server error while getting Lobby`);
  }

  // Check password matches
  if (lobby.password !== password && lobby.password !== null)
    return res.status(403).send(`Incorrect password for Lobby`);

  // Check lobby not full
  if (lobby.player_count >= lobby.max_players)
    return res.status(403).send(`Lobby is full`);

  // Check user not already connected to lobby
  try {
    const result = await db.oneOrNone(checkAlreadyJoinedQuery, [
      gameId,
      userId,
    ]);

    // if user already in lobby, redirect to lobby page
    if (result) {
      req.session.errors = "User already in lobby";
      return res.redirect(`/lobby/${gameId}`);
    }
  } catch (err) {
    console.error("error occurred checking if user already in lobby ", err);
    return res
      .status(500)
      .send(`Server error while checking if user already in lobby`);
  }

  // Add user to lobby
  try {
    await db.none(addUserToLobby, [gameId, userId]);
    return res.redirect(`/lobby/${gameId}`);
  } catch (err) {
    console.error("error occurred adding user to lobby ", err);
    return res.status(500).send(`Server error while adding user to lobby`);
  }
};

const createGame = async (req, res) => {
  const { name, password, max_players } = req.body;
  const { id: userId } = req.session.user;

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
    if (err.code == "23505") {
      return res.status(400).send(`Lobby name taken`);
    } else {
      console.error("error creating lobby ", err);
      return res.status(500).send(`User could not create lobby`);
    }
  }

  // Add the user to the game
  try {
    const gameId = lobby.id;
    await db.none(joinLobbyQuery, [userId, gameId]);

    return res.status(200).send(`User created and joined lobby [${gameId}]`);
  } catch (err) {
    console.error("error adding user to lobby ", err);
    return res.status(500).send(`Could not add user to lobby`);
  }
};

const getMyGames = async (req, res) => {
  const { id: userId } = req.session.user;

  // Get list of games (active) user is in
  const getMyGamesQuery = `SELECT g.id, g.name
    FROM games g
    LEFT JOIN game_users gu ON g.id = gu.game_id
    WHERE (g.active = true)
    AND (gu.users_id = $1)
    ORDER BY g.id`;

  try {
    const games = await db.any(getMyGamesQuery, [userId]);
    res.status(200).json(games);
  } catch (err) {
    console.error("error getting user's games ", err);
    res.status(500).send("Server error getting list of games");
  }
};

module.exports = { playCard, getGame, joinGame, createGame, getMyGames };
