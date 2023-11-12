const playCard = async (req, res) => {
  console.log("in playcard");
  const { cardId, color, userId } = req.body;
  const gameId = req.params.id;
  console.log(cardId, color, userId, gameId);
};

module.exports = { playCard };
