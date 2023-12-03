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
  const userId = req.session.user.id;
  let game, clientHand, playerData, currentCard;

  //get game data
  const getGameQuery = `SELECT * FROM games WHERE id = $1`;
  try {
    game = await db.oneOrNone(getGameQuery, [gameId]);
    if (!game) {
      return res.status(404).send(`Game does not exist`);
    }
    console.log(JSON.stringify(game)); //debug
  } catch (err) {
    console.error("error getting game ", err);
    return res.status(500).send(`Could not get game`);
  }

  //get the player's cards in hand (the colors and symbols and ids of the cards)
  const getPlayerHandQuery = `SELECT * FROM cards WHERE id IN (SELECT card_id FROM game_cards WHERE game_id = $1 AND user_id = $2)`;
  try {
    clientHand = await db.any(getPlayerHandQuery, [gameId, userId]);
    console.log("player hand is: " + JSON.stringify(clientHand)); //debug
  } catch (err) {
    console.error("error getting player hand ", err);
    return res.status(500).send(`Could not get player hand`);
  }

  //get the number of cards in everyone's hand
  const getPlayerData = `SELECT
    u.username AS name,
    u.id,
    COUNT(gc.card_id) as handcount
    FROM users u
    JOIN game_cards gc on u.id = gc.user_id
    WHERE gc.game_id = $1
    AND u.id in (
    SELECT user_id
    FROM game_cards
    WHERE game_id = $1 AND user_id != $2
)
    AND gc.discarded = false
    GROUP BY u.id
    ORDER BY u.id;`;

  try {
    playerData = await db.any(getPlayerData, [gameId, userId]);
    console.log("player data is: " + JSON.stringify(playerData)); //debug
  } catch (err) {
    console.log("error getting player hand size ", err);
    return res.status(500).send(`Could not get player hand size`);
  }
  //get the discard card's color and symbol
  const getDiscardCard = `SELECT * FROM cards WHERE id = $1`;
  try {
    currentCard = await db.one(getDiscardCard, [game.current_card_id]);
  } catch (err) {
    console.log("error getting discard card ", err);
    return res.status(500).send(`Could not get discard card`);
  }

  res.render("game.ejs", {
    gameId: gameId,
    gameName: game.name,
    activePlayerId: game.current_player_id,
    clientHand: clientHand,
    playerList: playerData,
    discardCard: currentCard,
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
  if (lobby.password !== password && lobby.password !== null) {
    return res.status(403).send(`Incorrect password for Lobby`);
  }

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
  let { name, password, max_players } = req.body;
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

    return res.redirect(`/lobby/${gameId}`);
  } catch (err) {
    console.error("error adding user to lobby ", err);
    return res.status(500).send(`Could not add user to lobby`);
  }
};

const startGame = async (req, res) => {
  const gameId = req.body.gameId;
  const userId = req.session.user.id;
  //TODO: check that the user is allowed to start this game
  //user must be in the game_users that correspond to the game.

  const startGameQuery = `CALL start_game($1)`;

  try {
    await db.none(startGameQuery, [gameId]);
    req.app.get("io").emit("game-start", { gameId: gameId });
  } catch (err) {
    console.error("error starting game ", err);
    return res.status(500).send(`Could not start game`);
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

module.exports = {
  playCard,
  getGame,
  joinGame,
  createGame,
  getMyGames,
  startGame,
};
