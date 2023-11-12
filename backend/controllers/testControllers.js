const getGame = async (req, res) => {
  res.render("game.ejs", {
    clientHand: [
      { color: "red", symbol: "draw_two" },
      { color: "yellow", symbol: "three" },
      { color: "red", symbol: "four" },
    ],
    playerList: [
      { name: "cleveland", handSize: 4 },
      { name: "Evan", handSize: 5 },
      { name: "Caimin", handSize: 7 },
    ],
    discardCard: { color: "red", symbol: "draw_two" },
  });
};

module.exports = { getGame };
