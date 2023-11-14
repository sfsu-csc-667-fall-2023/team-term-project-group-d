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

module.exports = { playCard, getGame };
