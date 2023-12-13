const db = require("../db/connection");

/**
 * Update the active seat in specfied game
 * @param {string | number} userId
 * @param {string | number} gameId
 * @returns {string} current_player_id
 */
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

/**
 * Helper function that draws {drawNumber} cards in specified game
 * @param {string | number} currentPlayerId
 * @param {string | number} gameId
 * @param {number} drawNumber
 * @returns {cards[]} cards {color, symbol, id}
 */
const drawCards = async (currentPlayerId, gameId, drawNumber) => {
  const getDeckCountQuery = `SELECT COUNT(*) FROM game_cards WHERE game_id = $1 AND user_id IS NULL`;

  const deckCount = await db.oneOrNone(getDeckCountQuery, [gameId]);

  if (!deckCount || Number(deckCount.count) < drawNumber) {
    const getDiscardCountQuery = `SELECT COUNT(*) FROM game_cards WHERE game_id = $1 AND discarded = true`;
    const discardCount = await db.oneOrNone(getDiscardCountQuery, [
      gameId,
      currentPlayerId,
    ]);
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

/**
 * Reverse the direction of the specified game and return the new direction
 * @param {string | number} gameId
 * @returns {string}
 */
const reverseDirection = async (gameId) => {
  const gameDirectionQuery = `UPDATE games
   SET direction = (
      CASE
          WHEN (SELECT direction FROM games WHERE id = $1) = 'clockwise'::directions THEN 'counterclockwise'::directions
          ELSE 'clockwise'::directions
      END
   )
   WHERE id = $1
   RETURNING direction`;

  return (await db.one(gameDirectionQuery, [gameId])).direction;
};

/**
 * Checks if the move being attempted is valid
 * @param {string} color
 * @param {string} symbol
 * @param {string | number} gameId
 * @returns {boolean}
 */
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

/**
 * Check if the user sending the request is attempting to play out of turn (not their turn)
 * @param {string | number} gameId
 * @param {string | number} userId
 * @returns {boolean}
 */
const isOutOfTurn = async (gameId, userId) => {
  const getActivePlayerQuery = `SELECT current_player_id FROM games WHERE id = $1`;
  const activeId = await db.one(getActivePlayerQuery, [gameId]);
  return activeId.current_player_id !== userId;
};

/**
 * Checks if the win conditions have been met by the specified user in the specified game
 * @param {string | number} gameId
 * @param {string | number} userId
 * @returns boolean
 */
const isWin = async (gameId, userId) => {
  const getHandCount = `SELECT COUNT(card_id) FROM game_cards WHERE game_id = $1 AND user_id = $2 AND discarded = false`;
  const handCount = await db.one(getHandCount, [gameId, userId]);
  return handCount.count === "0";
};

module.exports = {
  updateActiveSeat,
  drawCards,
  reverseDirection,
  isValidMove,
  isOutOfTurn,
  isWin,
};
