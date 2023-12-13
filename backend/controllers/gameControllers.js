const db = require("../db/connection");
const { StatusCodes } = require("http-status-codes");

const getGameState = async (req, res) => {
  const { id: gameId } = req.params;
  const { id: userId } = req.session.user;
  let game, clientHand, playerList, currentCard;

  const getGameQuery = `SELECT * FROM games WHERE id = $1`;
  try {
    game = await db.oneOrNone(getGameQuery, [gameId]);
    if (!game) {
      return res.status(404).send(`Game does not exist`);
    }
  } catch (err) {
    console.error("error getting game ", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(`Could not get game`);
  }

  //get the player's cards in hand (the colors and symbols and ids of the cards)
  const getPlayerHandQuery = `SELECT * FROM cards WHERE id IN 
                                    (SELECT card_id FROM game_cards WHERE game_id = $1 AND user_id = $2 AND discarded = false)`;
  try {
    clientHand = await db.any(getPlayerHandQuery, [gameId, userId]);
  } catch (err) {
    console.error("error getting player hand ", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(`Could not get player hand`);
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
    playerList = await db.any(getPlayerData, [gameId, userId]);
  } catch (err) {
    console.error("error getting player hand size ", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(`Could not get player hand size`);
  }

  const getDiscardCardQuery = `SELECT * FROM cards WHERE id = $1`;
  try {
    currentCard = await db.one(getDiscardCardQuery, [game.current_card_id]);
  } catch (err) {
    console.error("error getting discard card ", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(`Could not get discard card`);
  }

  currentCard.color = game.active_color;

  res.render("game.ejs", {
    gameId,
    gameName: game.name,
    clientId: userId,
    activePlayerId: game.current_player_id,
    clientHand,
    playerList,
    discardCard: currentCard,
    chatMessages: ["Welcome to the Game!"],
  });
};

const startGame = async (req, res) => {
  const { id: gameId } = req.params;
  const { id: userId } = req.session.user;

  const startGameQuery = `CALL start_game($1)`;

  try {
    await db.none(startGameQuery, [gameId]);
    req.app
      .get("io")
      .to(gameId.toString())
      .emit("game-start", { gameId, userId });
  } catch (err) {
    console.error("error starting game", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(`Could not start game`);
  }
};

const getUsersGames = async (req, res) => {
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
    res.status(StatusCodes.OK).json(games);
  } catch (err) {
    console.error("error getting user's games", err);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send("Server error getting list of games");
  }
};

module.exports = {
  getGameState,
  getUsersGames,
  startGame,
};
