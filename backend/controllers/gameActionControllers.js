const db = require("../db/connection");
const { StatusCodes } = require("http-status-codes");

const {
  updateActiveSeat,
  drawCards,
  reverseDirection,
  isValidMove,
  isOutOfTurn,
  isWin,
} = require("../helpers/gameActionHelpers");
const { logMessageToChat } = require("../helpers/logToChat");

const drawCard = async (req, res) => {
  const { id: userId, username } = req.session.user;
  const { id: gameId } = req.params;
  let activePlayerId, drawnCard, activePlayerHandSize;

  if (await isOutOfTurn(gameId, userId)) {
    console.error("Player is trying to move out of turn");
    return res.status(400).send("It's not your turn, bucko");
  }

  try {
    drawnCard = await drawCards(userId, gameId, 1);
  } catch (error) {
    console.error("Error in drawing card " + error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send("Error in drawing card " + error);
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
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send(`Could not get next player hand size`);
    }
    req.app.get("io").to(gameId.toString()).emit("card-drawn", {
      gameId: gameId,
      clientId: userId,
      activePlayerId: activePlayerId,
      activePlayerHandSize: activePlayerHandSize.count,
      drawnSymbol: drawnCard[0].symbol,
      drawnColor: drawnCard[0].color,
      drawnId: drawnCard[0].id,
    });
    logMessageToChat(req, gameId, `${username} drew a card`);
    return res.status(StatusCodes.OK).send();
  } catch (error) {
    console.error("Error in updating active seat " + error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send("Error in updating active seat " + error);
  }
};

const playCard = async (req, res) => {
  let { color, symbol, isDeclared } = req.body;
  const { id: gameId, cardId } = req.params;
  const { id: userId, username } = req.session.user;

  if (await isOutOfTurn(gameId, userId)) {
    console.error("Player is trying to move out of turn");
    return res.status(403).send("It's not your turn, bucko");
  }

  try {
    const isValid = await isValidMove(color, symbol, gameId);
    if (!isValid) {
      return res.status(StatusCodes.FORBIDDEN).send("Player move not valid\n");
    }
  } catch (error) {
    console.error("Could not determine if valid move " + error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send("Could not determine if valid move " + error);
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
      return res.status(StatusCodes.FORBIDDEN).send("Don't cheat :/");
    }

    if (card.card_id !== Number(cardId)) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send("Something went terribly wrong ;(");
    }
  } catch (error) {
    console.error("Could not update player hand", error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(`Could not update player hand ${error}`);
  }

  try {
    await db.none(playCardQuery, [cardId, color, gameId]);
  } catch (error) {
    console.error("Could not update active card", error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(`Could not update active card ${error}`);
  }

  logMessageToChat(
    req,
    gameId,
    `${username} played a ${color.at(0).toUpperCase() + color.slice(1)} ${symbol
      .split("_")
      .map((word) => word.at(0).toUpperCase() + word.slice(1))
      .join(" ")}`,
  );

  if (symbol === "reverse") {
    try {
      const newDirection = await reverseDirection(gameId);
      logMessageToChat(
        req,
        gameId,
        `${username} changed the direction to go ${newDirection}!`,
      );
    } catch (error) {
      console.error("Error reversing direction", error);
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send("Error reversing direction" + error);
    }
  }

  if (isDeclared) {
    try {
      await db.none(updatePlayerDeclaredUno, [gameId, userId]);
    } catch (error) {
      console.error("Error updating player declared uno", error);
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .send("Error updating player declared uno" + error);
    }
  }

  let activePlayerId;
  try {
    activePlayerId = await updateActiveSeat(userId, gameId);
  } catch (error) {
    console.error("Error in updating active seat " + error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send("Error in updating active seat " + error);
  }

  let cards;
  switch (symbol) {
    case "draw_two":
      try {
        const getCurrentPlayerQuery = `SELECT current_player_id FROM games WHERE id = $1`;
        const currentPlayerId = await db.one(getCurrentPlayerQuery, [gameId]);
        cards = await drawCards(currentPlayerId.current_player_id, gameId, 2);

        const nextPlayerId = (await db.one(getCurrentPlayerQuery, [gameId]))
          .current_player_id;
        activePlayerId = await updateActiveSeat(nextPlayerId, gameId);

        const getNextPlayerUsernameQuery = `SELECT username FROM users WHERE id = $1`;
        const nextPlayerUsername = (
          await db.one(getNextPlayerUsernameQuery, [nextPlayerId])
        ).username;
        logMessageToChat(
          req,
          gameId,
          `${username} made ${nextPlayerUsername} draw 2 cards!`,
        );

        req.app.get("io").to(gameId.toString()).emit("cards-drawn", {
          gameId: gameId,
          cards,
          currentPlayerId: currentPlayerId.current_player_id,
        });
      } catch (error) {
        console.error("Error updating game_cards", error);
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .send("Error updating game_cards " + error);
      }
      break;
    case "wild_draw_four":
      try {
        const getCurrentPlayerQuery = `SELECT current_player_id FROM games WHERE id = $1`;
        const currentPlayerId = await db.one(getCurrentPlayerQuery, [gameId]);
        cards = await drawCards(currentPlayerId.current_player_id, gameId, 4);

        const nextPlayerId = (await db.one(getCurrentPlayerQuery, [gameId]))
          .current_player_id;
        activePlayerId = await updateActiveSeat(nextPlayerId, gameId);

        const getNextPlayerUsernameQuery = `SELECT username FROM users WHERE id = $1`;
        const nextPlayerUsername = (
          await db.one(getNextPlayerUsernameQuery, [nextPlayerId])
        ).username;
        logMessageToChat(
          req,
          gameId,
          `${username} made ${nextPlayerUsername} draw 4 cards!`,
        );

        req.app.get("io").to(gameId.toString()).emit("cards-drawn", {
          gameId: gameId,
          cards,
          currentPlayerId: currentPlayerId.current_player_id,
        });
      } catch (error) {
        console.error("Error updating game_cards", error);
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .send("Error updating game_cards " + error);
      }
      break;
    case "skip":
      try {
        const getCurrentPlayerQuery = `SELECT current_player_id FROM games WHERE id = $1`;
        const nextPlayerId = (await db.one(getCurrentPlayerQuery, [gameId]))
          .current_player_id;
        activePlayerId = await updateActiveSeat(nextPlayerId, gameId);

        const getNextPlayerUsernameQuery = `SELECT username FROM users WHERE id = $1`;
        const nextPlayerUsername = (
          await db.one(getNextPlayerUsernameQuery, [nextPlayerId])
        ).username;
        logMessageToChat(
          req,
          gameId,
          `${username} skipped ${nextPlayerUsername}!`,
        );
      } catch (error) {
        console.error(
          "Could not get total seats or current seat and direction",
          error,
        );
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
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
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(`Could not get next player hand size`);
  }

  //update everyone in game with the new card played
  req.app.get("io").to(gameId.toString()).emit("card-played", {
    gameId,
    color,
    symbol,
    clientId: userId,
    cardId,
    activePlayerId,
    activePlayerHandSize: nextPlayerHandSize.count,
  });
  try {
    if (await isWin(gameId, userId)) {
      req.app
        .get("io")
        .to(gameId.toString())
        .emit("is-win", { winnerName: username });
      logMessageToChat(req, gameId, `${username} won!`);
    }

    return res.status(StatusCodes.OK).send("Success!");
  } catch (err) {
    console.error("error checking win condition ", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(`Could not check win condition`);
  }
};

const unoChallenge = async (req, res) => {
  const { id: gameId } = req.params;
  const { id: userId } = req.session.user;

  const getCurrentPlayerQuery = `SELECT current_player_id FROM games WHERE id = $1`;
  let currentPlayerId;
  try {
    (await db.one(getCurrentPlayerQuery, [gameId])).current_player_id;
  } catch (err) {
    console.error("error getting current player id", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(`Could not get current player id`);
  }
  const doesAnyoneHaveUnoQuery = `SELECT users_id 
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
  } catch (err) {
    console.error("error getting uno ids", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(`Could not get uno ids`);
  }
  let cards;
  //make every player with uno draw 2 cards
  try {
    for (const id of unoIds) {
      cards = await drawCards(id, gameId, 2);
      req.app.get("io").to(gameId.toString()).emit("cards-drawn", {
        gameId: gameId,
        cards,
        currentPlayerId: id,
      });
    }
  } catch (err) {
    console.error("Error updating game_cards", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send("Error updating game_cards " + err);
  }

  return res.status(StatusCodes.OK).send("Success!");
};

module.exports = {
  playCard,
  drawCard,
  unoChallenge,
};
