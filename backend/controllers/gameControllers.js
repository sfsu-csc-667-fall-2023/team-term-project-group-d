const db = require("../db/connection");

const updateActiveSeat = async (userId, gameId) => {
  const getTotalSeats = `SELECT COUNT(*) FROM game_users WHERE game_id = $1`;
  const getCurrentSeatandDirection = `SELECT game_users.seat, games.direction
   FROM game_users
   JOIN games ON game_users.game_id = games.id
   WHERE game_users.game_id = $1 AND game_users.users_id = $2`;

  const updateCurrentPlayer = `UPDATE games
   SET current_player_id =
  (SELECT users_id FROM game_users WHERE seat = $1 AND game_id = $2)
  WHERE id = $2
  RETURNING current_player_id`;

  const totalSeats = Number((await db.one(getTotalSeats, [gameId])).count);

  const currentSeatandDirection = await db.one(getCurrentSeatandDirection, [
    gameId,
    userId,
  ]);

  const addend = currentSeatandDirection.direction === "clockwise" ? 1 : -1;
  let newSeat = currentSeatandDirection.seat + addend;

  if (newSeat < 1) {
    newSeat += totalSeats;
  } else {
    newSeat = newSeat > totalSeats ? newSeat - totalSeats : newSeat;
  }

  return (await db.one(updateCurrentPlayer, [newSeat, gameId]))
    .current_player_id; //throws if no rows updated
};

const drawCards = async (currentPlayerId, gameId, drawNumber) => {
  const getDeckCountQuery = `SELECT COUNT(*) FROM game_cards WHERE game_id = $1 AND user_id IS NULL`;

  const deckCount = await db.oneOrNone(getDeckCountQuery, [gameId]);

  if (!deckCount || Number(deckCount.count) < drawNumber) {
    const getDiscardCountQuery = `SELECT COUNT(*) FROM game_cards WHERE game_id = $1 AND discarded = true`;
    const discardCount = await db.oneOrNone(getDiscardCountQuery, [
      gameId,
      currentPlayerId,
    ]);
    console.log(deckCount);
    if (!discardCount || discardCount.count < drawNumber) {
      console.log("No more cards in discard pile or deck, ending game"); //TODO send message with socket io
      return;
    } else {
      const restoreDeckQuery = `UPDATE game_cards SET user_id = NULL, discarded = false WHERE ( discarded = true AND game_id = $1 )`;
      await db.none(restoreDeckQuery, [gameId]);
    }
  }

  const drawCardsQuery = `UPDATE game_cards SET user_id = $1 
    WHERE game_id = $2 
    AND card_id IN (SELECT card_id FROM game_cards WHERE user_id IS NULL ORDER BY RANDOM() LIMIT $3 ) RETURNING card_id`;

  const drawnCards = await db.any(drawCardsQuery, [
    currentPlayerId,
    gameId,
    drawNumber,
  ]);
  const getDrawnCardsQuery = `SELECT * FROM cards WHERE id IN ($1)`;
  const drawnCardsData = await db.any(getDrawnCardsQuery, [
    ...drawnCards.map((card) => card.card_id).join(","),
  ]);
  console.log("drawing cards: " + JSON.stringify(drawnCardsData));
  return drawnCardsData;
};

const reverseDirection = async (gameId) => {
  //SELECT current_direction of the game
  //Then reverse the direction then update the game's direction to the reverse direction

  const gameDirectionQuery = `UPDATE games
   SET direction = (
      CASE
          WHEN (SELECT direction FROM games WHERE id = $1) = 'clockwise'::directions THEN 'counterclockwise'::directions
          ELSE 'clockwise'::directions
      END
   )
   WHERE id = $1`;

  await db.none(gameDirectionQuery, [gameId]);
};

const isValidMove = async (color, symbol, gameId) => {
  if (symbol === "wild" || symbol === "wild_draw_four") {
    return true;
  }

  const activeCardAndColorQuery = `SELECT c.symbol, g.active_color 
     FROM games g 
     JOIN cards c ON g.current_card_id = c.id 
     WHERE g.id = $1`;

  const symbolAndColor = await db.one(activeCardAndColorQuery, [gameId]);
  return (
    symbolAndColor.active_color === color || symbolAndColor.symbol === symbol
  );
};

const isOutOfTurn = async (gameId, userId) => {
  const getActivePlayer = `SELECT current_player_id FROM games WHERE id = $1`;
  const activeId = await db.one(getActivePlayer, [gameId]);
  return activeId.current_player_id !== userId;
};

const drawCard = async (req, res) => {
  const userId = req.session.user.id;
  const gameId = req.params.id;
  let activePlayerId, drawnCard;

  if (await isOutOfTurn(gameId, userId)) {
    console.log("Player is trying to move out of turn");
    return res.status(400).send("It's not your turn bucko");
  }

  try {
    drawnCard = await drawCards(userId, gameId, 1);
  } catch (error) {
    console.log("Error in drawing card " + error);
    return res.status(500).send("Error in drawing card " + error);
  }

  try {
    activePlayerId = await updateActiveSeat(userId, gameId);

    req.app
      .get("io")
      .to(gameId + "")
      .emit("card-drawn", {
        gameId: gameId,
        //TODO: must do two emits. One will send the card drawn to the player who drew it
        //the other will send the updated hand count to all other players
        clientId: userId,
        activePlayerId: activePlayerId,
        drawnSymbol: drawnCard[0].symbol,
        drawnColor: drawnCard[0].color,
        drawnId: drawnCard[0].id,
      });
    return res.status(200).send();
  } catch (error) {
    console.log("Error in updating active seat " + error);
    return res.status(500).send("Error in updating active seat " + error);
  }
};

const playCard = async (req, res) => {
  let { cardId, color, symbol } = req.body;
  console.log("symbol: ", symbol);
  const userId = req.session.user.id;
  const gameId = req.params.id;
  let activePlayerId;

  if (await isOutOfTurn(gameId, userId)) {
    console.log("Player is trying to move out of turn");
    return res.status(400).send("It's not your turn bucko");
  }

  try {
    const isVaild = await isValidMove(color, symbol, gameId);
    if (!isVaild) {
      return res.status(400).send("Player move not valid \n");
    }
  } catch (error) {
    console.log("Could not determine if valid move \n" + error);
    return res.status(500).send("Could not determine if valid move \n" + error);
  }

  const playCardQuery = `UPDATE games SET current_card_id = $1, active_color = $2 WHERE id = $3`;
  const updatePlayerHandQuery = `UPDATE game_cards 
  SET discarded = true
  WHERE game_id = $1 AND card_id = $2 AND user_id = $3 RETURNING card_id`;

  try {
    const card = await db.oneOrNone(updatePlayerHandQuery, [
      gameId,
      cardId,
      userId,
    ]);
    //check if card played is in players hand
    if (!card) {
      return res.status(400).send("Don't cheat :/");
    }

    if (card.card_id !== Number(cardId)) {
      return res.status(500).send("Something went terribly wrong ;(");
    }
  } catch (error) {
    console.log("Could not update player hand", error);
    return res.status(500).send(`Could not update player hand ${error}`);
  }

  try {
    await db.none(playCardQuery, [cardId, color, gameId]);
  } catch (error) {
    console.log("Could not update active card", error);
    return res.status(500).send(`Could not update active card ${error}`);
  }

  if (symbol === "reverse") {
    try {
      await reverseDirection(gameId);
    } catch (error) {
      console.log("Error reversing direction", error);
      return res.status(500).send("Error reversing direction" + error);
    }
  }

  try {
    activePlayerId = await updateActiveSeat(userId, gameId);
  } catch (error) {
    console.log("Error in updating active seat " + error);
    return res.status(500).send("Error in updating active seat " + error);
  }

  switch (symbol) {
    case "draw_two":
      try {
        const getCurrentPlayerQuery = `SELECT current_player_id FROM games WHERE id = $1`;
        const currentPlayerId = await db.one(getCurrentPlayerQuery, [gameId]);
        await drawCards(currentPlayerId.current_player_id, gameId, 2);
      } catch (error) {
        console.log("Error updating game_cards", error);
        return res.status(500).send("Error updating game_cards " + error);
      }
      break;
    case "wild_draw_four":
      try {
        const getCurrentPlayerQuery = `SELECT current_player_id FROM games WHERE id = $1`;
        const currentPlayerId = await db.one(getCurrentPlayerQuery, [gameId]);
        await drawCards(currentPlayerId.current_player_id, gameId, 4);
      } catch (error) {
        console.log("Error updating game_cards", error);
        return res.status(500).send("Error updating game_cards " + error);
      }
      break;
    case "skip":
      try {
        const getCurrentPlayerQuery = `SELECT current_player_id FROM games WHERE id = $1`;
        const nextPlayerId = (await db.one(getCurrentPlayerQuery, [gameId]))
          .current_player_id;
        activePlayerId = await updateActiveSeat(nextPlayerId, gameId);
      } catch (error) {
        console.log(
          "Could not get total seats or current seat and direction",
          error,
        );
        return res
          .status(500)
          .send(
            "Could not get total seats or current seat and direction " + error,
          );
      }
      break;
    default:
      break;
  }
  req.app
    .get("io")
    .to(gameId + "")
    .emit("card-played", {
      gameId: gameId,
      color: color,
      symbol: symbol,
      clientId: userId,
      cardId: cardId,
      activePlayerId: activePlayerId,
    });
  return res.status(200).send("Success!");
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
    clientId: userId,
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
    req.app
      .get("io")
      .to(gameId + "")
      .emit("game-start", { gameId: gameId, userId: userId });
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
  drawCard,
  createGame,
  getMyGames,
  startGame,
};
