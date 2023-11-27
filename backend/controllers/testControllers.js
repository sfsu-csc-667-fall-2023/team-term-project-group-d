const getGame = async (req, res) => {
  res.render("game.ejs", {
    gameId: 1,
    clientHand: [
      { color: "red", symbol: "draw_two", id: 1 },
      { color: "yellow", symbol: "three", id: 2 },
      { color: "red", symbol: "four", id: 3 },
      { color: "wild", symbol: "wild", id: 4 },
    ],
    playerList: [
      { name: "cleveland", handSize: 4 },
      { name: "Evan", handSize: 5 },
      { name: "Caimin", handSize: 7 },
    ],
    discardCard: { color: "red", symbol: "draw_two" },
    chatMessages: ["hey what is up bro!?"],
  });
};

module.exports = { getGame };
