const db = require("../db/connection");

const updateActiveSeat = async (userId, gameId) => {
  //Get seat of current player from game_users
  //Get lobby size from games and direction
  //Increment or decrement seat depending on direction
  //Update seat in game_users

  const getTotalSeats = `SELECT COUNT(*) FROM game_users WHERE game_id = $1`;
  const getCurrentSeatandDirection = `SELECT game_users.seat, games.direction
   FROM game_users
   JOIN games ON game_users.game_id = games.id
   WHERE game_users.game_id = $1 AND game_users.users_id = $2`;

  const updateCurrentPlayer = `UPDATE games SET current_player_id = (SELECT users_id FROM game_users WHERE seat = $1 AND game_id = $2) WHERE id = $2`;

  const totalSeats = Number((await db.one(getTotalSeats, [gameId])).count);
  console.log(totalSeats);
  console.log(userId);
  const currentSeatandDirection = await db.one(getCurrentSeatandDirection, [
    gameId,
    userId,
  ]);
  console.log(currentSeatandDirection);
  //calculate next seat
  //clockwise add
  //counter clockwise substrack

  const addend = currentSeatandDirection.direction === "clockwise" ? 1 : -1;
  let newSeat = currentSeatandDirection.seat + addend;
  console.log(typeof newSeat);
  if (newSeat < 0) {
    newSeat = totalSeats - 1;
  } else {
    console.log("Before newseat :", newSeat);
    console.log("Total Seats :", totalSeats);
    newSeat = newSeat > totalSeats ? newSeat - totalSeats : newSeat;
    console.log("After newseat :", newSeat);
  }

  await db.none(updateCurrentPlayer, [newSeat, gameId]);
  console.log("WE DID IT YAY"); //TODO Remove debug :(
};

const drawCards = async (currentPlayerId, gameId, drawNumber) => {
  /**
   * Query games_card table for count WHERE player_id IS null
   * If game_cards count < drawNumber{
   *    query game_cards count WHERE player_id IS -1
   *    if(this.count < drawNumber){
   *      display end of game
   *    }
   *    else{
   *      updategameCards SET player_id = null WHERE player_id = -1
   *    }
   * }
   * 
   * grab top card of deck
   * by order by random WHERE user_id = NULL
   * UPDATE game_cards SET user_id = currentPlayerId
   * WHERE game_id = game_id AND card_id = cardId

   */

  const getDeckCountQuery = `SELECT COUNT(*) FROM game_cards WHERE game_id = $1 AND user_id IS NULL`;

  const deckCount = await db.oneOrNone(getDeckCountQuery, [gameId]);

  console.log(deckCount.count);

  if (!deckCount || Number(deckCount.count) < drawNumber) {
    const getDiscardCountQuery = `SELECT COUNT(*) FROM game_cards WHERE game_id = $1 AND user_id = -1`;
    const discardCount = await db.oneOrNone(getDiscardCountQuery, [
      gameId,
      currentPlayerId,
    ]);
    console.log(deckCount);
    if (!discardCount || discardCount.count < drawNumber) {
      console.log("No more cards in discard pile or deck, ending game"); //TODO send message with socket io
      return;
    } else {
      console.log("In restore deck");
      const restoreDeckQuery = `UPDATE game_cards SET user_id = NULL WHERE user_id = -1 AND game_id = $1`;
      await db.none(restoreDeckQuery, [gameId]);
    }
  }

  const drawCardsQuery = `UPDATE game_cards SET user_id = $1 
    WHERE game_id = $2 
    AND card_id IN (SELECT card_id FROM game_cards WHERE user_id IS NULL ORDER BY RANDOM() LIMIT $3)`;

  await db.none(drawCardsQuery, [currentPlayerId, gameId, drawNumber]);
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
  console.log(symbolAndColor);
  console.log(symbol + " " + color);
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

  if (await isOutOfTurn(gameId, userId)) {
    console.log("Player is trying to move out of turn");
    return res.status(400).send("It's not your turn bucko");
  }

  try {
    await drawCards(userId, gameId, 1);
  } catch (error) {
    console.log("Error in drawing card " + error);
    return res.status(500).send("Error in drawing card " + error);
  }

  try {
    await updateActiveSeat(userId, gameId);
    return res.status(200).send();
  } catch (error) {
    console.log("Error in updating active seat " + error);
    return res.status(500).send("Error in updating active seat " + error);
  }
};

const playCard = async (req, res) => {
  let { cardId, color, symbol } = req.body;
  const userId = req.session.user.id;
  const gameId = req.params.id;

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
  const updatePlayerHandQuery = `UPDATE game_cards SET user_id = -1 WHERE game_id = $1 AND card_id = $2 AND user_id = $3 RETURNING card_id`;

  try {
    const card = await db.oneOrNone(updatePlayerHandQuery, [
      gameId,
      cardId,
      userId,
    ]);
    console.log(`$card: ${JSON.stringify(card)}`);
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
    await updateActiveSeat(userId, gameId);
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
        console.log("next player id = ", nextPlayerId);
        await updateActiveSeat(nextPlayerId, gameId);
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
  return res.status(200).send("Success!");
};

//returns the initial game state
const getGame = async (req, res) => {
  const gameId = req.params.id;
  //TODO: query db to get the game row by gameID

  //the object is an example of what the game row from the query should contain.
  //maybe need to use socketio to send the correct hand to each player?
  res.render("game.ejs", {
    gameId: gameId,
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
  const gameId = req.params.id;
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

module.exports = { playCard, getGame, joinGame, drawCard };
