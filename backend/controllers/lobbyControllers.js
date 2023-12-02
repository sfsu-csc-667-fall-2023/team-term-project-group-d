const db = require("../db/connection");

const getLobbyUsers = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.session;
  //grab all the players that are in this game
  const players = await db.any(
    `SELECT users.username FROM users
        JOIN game_users ON users.id = game_users.users_id
        JOIN games ON games.id = game_users.game_id
        WHERE games.id = $1`,
    [id],
  );
  console.log(JSON.stringify(players));
  res.render("lobby.ejs", {
    gameId: id,
    players: players,
    chatMessages: ["hey what is up bro!?"],
  });
};

module.exports = { getLobbyUsers };
