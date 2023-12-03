const db = require("../db/connection");

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

  let lobby;
  try {
    lobby = await db.oneOrNone(getLobbyQuery, [gameId, userId]);
    console.log(JSON.stringify(lobby));

    // if the user is not in the lobby, redirect to home page
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

    res.render("lobby.ejs", {
      gameId: gameId,
      players: players,
      chatMessages: ["hey what is up bro!?"],
    });
  } catch (err) {
    console.error("error getting list of players in lobby ", err);
    return res.status(500).send(`Could not get list of Players in Lobby`);
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

module.exports = { getLobbyUsers, getLobbies, getLobby };
