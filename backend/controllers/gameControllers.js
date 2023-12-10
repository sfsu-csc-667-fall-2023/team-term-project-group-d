const db = require("../db/connection");

const updateActiveSeat = async (userId, gameId) => {
  const getTotalSeatsQuery = `SELECT COUNT(*) FROM game_users WHERE game_id = $1`;
  const getCurrentSeatAndDirectionQuery = `SELECT game_users.seat, games.direction
   FROM game_users
   JOIN games ON game_users.game_id = games.id
   WHERE game_users.game_id = $1 AND game_users.users_id = $2`;

  const updateCurrentPlayerQuery = `UPDATE games
   SET current_player_id =
  (SELECT users_id FROM game_users WHERE seat = $1 AND game_id = $2)
  WHERE id = $2
  RETURNING current_player_id`;

  const totalSeats = Number((await db.one(getTotalSeatsQuery, [gameId])).count);

  const currentSeatAndDirection = await db.one(
    getCurrentSeatAndDirectionQuery,
    [gameId, userId],
  );

  const addend = currentSeatAndDirection.direction === "clockwise" ? 1 : -1;
  let newSeat = currentSeatAndDirection.seat + addend;

  if (newSeat < 1) {
    newSeat += totalSeats;
  } else {
    newSeat = newSeat > totalSeats ? newSeat - totalSeats : newSeat;
  }

  return (await db.one(updateCurrentPlayerQuery, [newSeat, gameId]))
    .current_player_id;
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
      console.error("No more cards in discard pile or deck, ending game"); //TODO send message and skip player
      return;
    } else {
      const restoreDeckQuery = `UPDATE game_cards SET user_id = NULL, discarded = false WHERE ( discarded = true AND game_id = $1 )`;
      await db.none(restoreDeckQuery, [gameId]);
    }
  }

  const selectIdsQuery = `SELECT card_id FROM game_cards WHERE user_id IS NULL AND game_id = $1 ORDER BY RANDOM() LIMIT $2 `;
  const ids = await db.any(selectIdsQuery, [gameId, drawNumber]);
  const cardIds = ids.map((id) => id.card_id);

  const drawCardsQuery = `UPDATE game_cards SET user_id = $1 
    WHERE game_id = $2 
    AND card_id IN ($3:csv)`;

  await db.any(drawCardsQuery, [currentPlayerId, gameId, cardIds]);

  const getDrawnCardsQuery = `SELECT * FROM cards WHERE id IN ($1:csv)`;
  const drawnCardsData = await db.any(getDrawnCardsQuery, [cardIds]);

  const updatePlayerDeclaredUno =
    "UPDATE game_users SET declared_uno = false WHERE game_id = $1 AND users_id = $2";
  await db.none(updatePlayerDeclaredUno, [gameId, currentPlayerId]);
  return drawnCardsData;
};

const reverseDirection = async (gameId) => {
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
  const getActivePlayerQuery = `SELECT current_player_id FROM games WHERE id = $1`;
  const activeId = await db.one(getActivePlayerQuery, [gameId]);
  return activeId.current_player_id !== userId;
};

const drawCard = async (req, res) => {
  const userId = req.session.user.id;
  const gameId = req.params.id;
  let activePlayerId, drawnCard, activePlayerHandSize;

  if (await isOutOfTurn(gameId, userId)) {
    console.error("Player is trying to move out of turn");
    return res.status(400).send("It's not your turn, bucko");
  }

  try {
    drawnCard = await drawCards(userId, gameId, 1);
  } catch (error) {
    console.error("Error in drawing card " + error);
    return res.status(500).send("Error in drawing card " + error);
  }

  try {
    activePlayerId = await updateActiveSeat(userId, gameId);
    const getNextPlayerHandSize = `SELECT COUNT(*) FROM game_cards WHERE game_id = $1 AND user_id = $2 AND discarded = false`;
    try {
      activePlayerHandSize = await db.one(getNextPlayerHandSize, [
        gameId,
        activePlayerId,
      ]);
    } catch (err) {
      console.error("error getting next player hand size ", err);
      return res.status(500).send(`Could not get next player hand size`);
    }
    req.app
      .get("io")
      .to(gameId + "")
      .emit("card-drawn", {
        gameId: gameId,
        clientId: userId,
        activePlayerId: activePlayerId,
        activePlayerHandSize: activePlayerHandSize.count,
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

const isWin = async (gameId, userId) => {
  const getHandCount = `SELECT COUNT(card_id) FROM game_cards WHERE game_id = $1 AND user_id = $2 AND discarded = false`;
  const handCount = await db.one(getHandCount, [gameId, userId]);
  return handCount.count === "0";
};

const playCard = async (req, res) => {
  let { cardId, color, symbol, isDeclared } = req.body;
  const userId = req.session.user.id;
  const gameId = req.params.id;

  if (await isOutOfTurn(gameId, userId)) {
    console.error("Player is trying to move out of turn");
    return res.status(400).send("It's not your turn, bucko");
  }

  try {
    const isValid = await isValidMove(color, symbol, gameId);
    if (!isValid) {
      return res.status(400).send("Player move not valid \n");
    }
  } catch (error) {
    console.error("Could not determine if valid move \n" + error);
    return res.status(500).send("Could not determine if valid move \n" + error);
  }

  const playCardQuery = `UPDATE games SET current_card_id = $1, active_color = $2 WHERE id = $3`;
  const updatePlayerHandQuery = `UPDATE game_cards 
  SET discarded = true
  WHERE game_id = $1 AND card_id = $2 AND user_id = $3 RETURNING card_id`;
  const updatePlayerDeclaredUno =
    "UPDATE game_users SET declared_uno = true WHERE game_id = $1 AND users_id = $2";
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

  if (isDeclared) {
    try {
      await db.none(updatePlayerDeclaredUno, [gameId, userId]);
    } catch (error) {
      console.log("Error updating player declared uno", error);
      return res.status(500).send("Error updating player declared uno" + error);
    }
  }

  let activePlayerId;
  try {
    activePlayerId = await updateActiveSeat(userId, gameId);
  } catch (error) {
    console.error("Error in updating active seat " + error);
    return res.status(500).send("Error in updating active seat " + error);
  }

  let cards;
  switch (symbol) {
    case "draw_two":
      try {
        const getCurrentPlayerQuery = `SELECT current_player_id FROM games WHERE id = $1`;
        const currentPlayerId = await db.one(getCurrentPlayerQuery, [gameId]);
        cards = await drawCards(currentPlayerId.current_player_id, gameId, 2);
        req.app.get("io").to(gameId.toString()).emit("cards-drawn", {
          gameId: gameId,
          cards,
          currentPlayerId: currentPlayerId.current_player_id,
        });
      } catch (error) {
        console.error("Error updating game_cards", error);
        return res.status(500).send("Error updating game_cards " + error);
      }
      break;
    case "wild_draw_four":
      try {
        const getCurrentPlayerQuery = `SELECT current_player_id FROM games WHERE id = $1`;
        const currentPlayerId = await db.one(getCurrentPlayerQuery, [gameId]);
        console.log("current player id", currentPlayerId);
        cards = await drawCards(currentPlayerId.current_player_id, gameId, 4);

        req.app.get("io").to(gameId.toString()).emit("cards-drawn", {
          gameId: gameId,
          cards,
          currentPlayerId: currentPlayerId.current_player_id,
        });
      } catch (error) {
        console.error("Error updating game_cards", error);
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
        console.error(
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
  const getNextPlayerHandSize = `SELECT COUNT(*) FROM game_cards WHERE game_id = $1 AND user_id = $2 AND discarded = false`;
  let nextPlayerHandSize;
  try {
    nextPlayerHandSize = await db.one(getNextPlayerHandSize, [
      gameId,
      activePlayerId,
    ]);
  } catch (err) {
    console.error("error getting next player hand size ", err);
    return res.status(500).send(`Could not get next player hand size`);
  }

  //update everyone in game with the new card played
  req.app.get("io").to(gameId.toString()).emit("card-played", {
    gameId: gameId,
    color: color,
    symbol: symbol,
    clientId: userId,
    cardId: cardId,
    activePlayerId: activePlayerId,
    activePlayerHandSize: nextPlayerHandSize.count,
  });

  //check the win condition
  try {
    if (await isWin(gameId, userId)) {
      req.app
        .get("io")
        .to(gameId.toString())
        .emit("is-win", { winnerName: req.session.user.username });
      return res.status(200).send("Success!");
    }
  } catch (err) {
    console.error("error checking win condition ", err);
    return res.status(500).send(`Could not check win condition`);
  }
};

/**
 *  returns the initial game state
 */
const getGame = async (req, res) => {
  const gameId = req.params.id;
  const userId = req.session.user.id;
  let game, clientHand, playerData, currentCard;

  const getGameQuery = `SELECT * FROM games WHERE id = $1`;
  try {
    game = await db.oneOrNone(getGameQuery, [gameId]);
    if (!game) {
      return res.status(404).send(`Game does not exist`);
    }
    console.log(JSON.stringify(game));
  } catch (err) {
    console.error("error getting game ", err);
    return res.status(500).send(`Could not get game`);
  }

  //get the player's cards in hand (the colors and symbols and ids of the cards)
  const getPlayerHandQuery = `SELECT * FROM cards WHERE id IN 
                                    (SELECT card_id FROM game_cards WHERE game_id = $1 AND user_id = $2 AND discarded = false)`;
  try {
    clientHand = await db.any(getPlayerHandQuery, [gameId, userId]);
    console.log("player hand is: ", JSON.stringify(clientHand));
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
  } catch (err) {
    console.error("error getting player hand size ", err);
    return res.status(500).send(`Could not get player hand size`);
  }

  const getDiscardCardQuery = `SELECT * FROM cards WHERE id = $1`;
  try {
    currentCard = await db.one(getDiscardCardQuery, [game.current_card_id]);
  } catch (err) {
    console.log("error getting discard card ", err);
    return res.status(500).send(`Could not get discard card`);
  }

  currentCard.color = game.active_color;

  res.render("game.ejs", {
    gameId: gameId,
    gameName: game.name,
    clientId: userId,
    activePlayerId: game.current_player_id,
    clientHand: clientHand,
    playerList: playerData,
    discardCard: currentCard,
    chatMessages: ["Welcome to the Game!"],
  });
};

const joinGame = async (req, res) => {
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
      return res.status(404).send(`Lobby does not exist`);
    }

    if (lobby.active) {
      return res.redirect(`/game/${gameId}`);
    }
  } catch (err) {
    console.error("error occurred getting lobby info ", err);
    return res.status(404).send(`Server error while getting Lobby`);
  }

  if (lobby.password !== password && lobby.password !== null) {
    return res.status(403).send(`Incorrect password for Lobby`);
  }

  if (lobby.player_count >= lobby.max_players) {
    return res.status(403).send(`Lobby is full`);
  }

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
    req.app
      .get("io")
      .to(gameId + "")
      .emit("player-joined", {
        username: req.session.user.username,
        image: req.session.user.image,
      });
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
    if (err.code === "23505") {
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

    req.app.get("io").emit("lobby-created", {
      id: gameId,
      name,
      max_players,
      has_password: password != null,
      player_count: 1,
    });

    return res.redirect(`/lobby/${gameId}`);
  } catch (err) {
    console.error("error adding user to lobby ", err);
    return res.status(500).send(`Could not add user to lobby`);
  }
};

const startGame = async (req, res) => {
  const { id: gameId } = req.params;
  const { id: userId } = req.session.user;
  //TODO: check that the user is allowed to start this game
  //  1. Anyone within the lobby can start the game
  //  2. You should not be able to start the game if only person is in the lobby

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

const unoAccuse = async (req, res) => {
  const userId = req.session.user.id;
  console.log("the user id is: " + userId);
  const gameId = req.params.id;
  const getCurrentPlayerQuery = `SELECT current_player_id FROM games WHERE id = $1`;
  let currentPlayerId;
  try {
    currentPlayerId = (await db.one(getCurrentPlayerQuery, [gameId]))
      .current_player_id;
  } catch (err) {
    console.error("error getting current player id ", err);
    return res.status(500).send(`Could not get current player id`);
  }
  //check if any player has 1 card in hand and if they havent declared uno
  const doesAnyoneHaveUnoQuery = `  SELECT users_id 
  FROM game_users 
  WHERE game_id = $1
  AND declared_uno = false
  AND users_id IN
  (SELECT user_id
  FROM game_cards
  WHERE game_id = $1
    AND user_id != $2
    AND discarded = false
  GROUP BY user_id
  HAVING COUNT(*) = 1);`;
  let unoIds;
  try {
    unoIds = (await db.any(doesAnyoneHaveUnoQuery, [gameId, userId])).map(
      (userId) => userId.users_id,
    );
    console.log("uno ids are: ", unoIds);
  } catch (err) {
    console.error("error getting uno ids ", err);
    return res.status(500).send(`Could not get uno ids`);
  }
  let cards;
  //make every player with uno draw 2 cards
  try {
    for (let i = 0; i < unoIds.length; i++) {
      cards = await drawCards(unoIds[i], gameId, 2);
      console.log(cards);
      req.app.get("io").to(gameId.toString()).emit("cards-drawn", {
        gameId: gameId,
        cards,
        currentPlayerId: unoIds[i],
      });
    }
  } catch (err) {
    console.log("Error updating game_cards", err);
    return res.status(500).send("Error updating game_cards " + err);
  }
  return res.status(200).send("Success!");
};

module.exports = {
  playCard,
  getGame,
  joinGame,
  drawCard,
  createGame,
  getMyGames,
  startGame,
  unoAccuse,
};
