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
  const gameId = req.body.gameId;
  const userId = req.session.user.id;
  //check that the game has enough room
  //make sure you dont exist already
  //make sure the game is inactive
  //grab the game state to check these
  let getGameStateQuery = `SELECT * FROM games WHERE id = $1`;
  try {
    const gameState = await db.one(getGameStateQuery, [gameId]);
    if (gameState.active) {
      res.status(400).json({ message: "Game is already active" });
    }
  } catch (err) {
    console.log("error getting the game state ", err);
  }
  let getLobbySizeQuery = `SELECT COUNT(*) FROM game_users WHERE game_id = $1`;
  try {
    const lobbySize = await db.one(getLobbySizeQuery, [gameId]);
    if (lobbySize.count >= gameState.max_players) {
      res.status(400).json({ message: "Game is full already" });
    }
  } catch (err) {
    console.log("error getting the lobby size");
  }

  let checkUserInGameQuery = `SELECT * FROM game_users WHERE game_id = $1 AND users_id = $2`;
  try {
    const userInGame = await db.one(checkUserInGameQuery, [gameId, userId]);
    if (userInGame) {
      res.status(400).json({ message: "User is already in game" });
    }
  } catch (err) {
    console.log("error checking if user is in game " + err);
  }
  //if we get here, the user is not in the game and the game is not full
  let joinGameQuery = `INSERT INTO game_users (game_id, users_id) VALUES ($1, $2)`;
  try {
    const joinGameResult = await db.none(joinGameQuery, [gameId, userId]);
  } catch (err) {
    console.log("error joining game " + err);
  }
  //get all players in the game_players table  and send it to everyone in the game
  let getPlayersQuery = `SELECT users.username FROM users JOIN game_users ON users.id = game_users.users_id WHERE game_users.game_id = $1`;
  try {
    const playerList = await db.any(getPlayersQuery, [gameId]);
    //emit an event to all users in the lobby that a new user has joined

    req.app.get("io").emit("user-joined", {
      message: `${req.session.user.username} has joined the game`,
      newPlayerList: playerList,
    });
    res.status(200).json({ message: "User joined game" });
  } catch (error) {
    res.status(400).json({ message: "User could not join game" });
  }
};

module.exports = { playCard, getGame, joinGame };
