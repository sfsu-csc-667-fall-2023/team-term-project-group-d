// TODO : request list of available games
const games = [
  {
    id: 1,
    name: "Test",
    max_players: 4,
    lobby_size: 1,
  },
  {
    id: 2,
    name: "Test again",
    max_players: 4,
    lobby_size: 2,
  },
  {
    id: 3,
    name: "Test again again",
    max_players: 4,
    lobby_size: 3,
  },
];

const joinGame = async (gameId) => {
  try {
    const res = await fetch("/game/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gameId: gameId }),
    });
    const json = await res.json();
    console.log(json);
  } catch (error) {
    console.log(error);
  }
};

games.forEach((game) => {
  const outerDiv = document.createElement("div");
  outerDiv.classList.add("available-game");

  const idParagraph = document.createElement("p");
  idParagraph.innerText = game.id;

  const nameParagraph = document.createElement("p");
  nameParagraph.innerText = game.name;

  const lobbySizeParagraph = document.createElement("p");
  lobbySizeParagraph.innerText = `Players : ${game.lobby_size}/${game.max_players}`;

  const joinButton = document.createElement("button");
  joinButton.addEventListener("click", () => {
    joinGame(game.id);
  });
  joinButton.innerText = "Join";

  const innerDiv = document.createElement("div");
  innerDiv.classList.add("game-info");

  outerDiv.appendChild(idParagraph);
  innerDiv.appendChild(nameParagraph);
  innerDiv.appendChild(lobbySizeParagraph);
  outerDiv.appendChild(innerDiv);
  outerDiv.appendChild(joinButton);

  document.getElementById("game-list-container").appendChild(outerDiv);
});

const menuCreateGameButton = document.getElementById("create-game-button");
menuCreateGameButton.addEventListener("click", () => {
  const createGameForm = document.getElementById("popup-container");
  createGameForm.style.display = "flex";
});

const closeCreateGameFormButton = document.getElementById("close-popup");
closeCreateGameFormButton.addEventListener("click", () => {
  const createGameForm = document.getElementById("popup-container");
  createGameForm.style.display = "none";
});

const formCreateFormButton = document.getElementById("form-create-game");
formCreateFormButton.addEventListener("click", (e) => {
  e.preventDefault();
  alert("TODO : fix this form & create the game");
});
