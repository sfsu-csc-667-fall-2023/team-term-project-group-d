//get all the players that are in the lobby
const startGame = async () => {
  try {
    const res = await fetch("/game/startGame", { gameId: gameId });
  } catch (error) {
    console.log(error);
  }
};

const startButton = document.getElementById("start-button");
startButton.addEventListener("click", startGame);
