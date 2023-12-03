/// Get List of Lobbies
// Game List container
const gameList = document.getElementById("game-list");

const getLobbies = async () => {
  try {
    const res = await fetch(`/lobby/list`);
    const json = await res.json();

    // game { id, name, player_count, max_players, has_password }
    return json;
  } catch (error) {
    console.log(error);
    return [];
  }
};

const displayGameInList = (game) => {
  const outerDiv = document.createElement("div");
  outerDiv.classList.add("available-game");
  outerDiv.id = `game-${game.id}`;

  const idParagraph = document.createElement("p");
  idParagraph.innerText = game.id;

  const nameParagraph = document.createElement("p");
  nameParagraph.innerText = game.name + (game.has_password ? "🔒" : "");

  const lobbySizeParagraph = document.createElement("p");
  lobbySizeParagraph.innerText = `Players : ${game.player_count}/${game.max_players}`;

  const joinButton = document.createElement("button");
  joinButton.addEventListener("click", async () => {
    if (game.has_password) {
      generateProtectedGameForm(game.id, game.name);
    } else {
      await joinGame(game.id, "");
    }
  });
  joinButton.innerText = "Join";

  const innerDiv = document.createElement("div");
  innerDiv.classList.add("game-info");

  outerDiv.appendChild(idParagraph);
  innerDiv.appendChild(nameParagraph);
  innerDiv.appendChild(lobbySizeParagraph);
  outerDiv.appendChild(innerDiv);
  outerDiv.appendChild(joinButton);

  gameList.appendChild(outerDiv);
};

// Get All Lobbies on page load
var games = [];
(async () => {
  games = await getLobbies();

  games.forEach((game) => displayGameInList(game));
})();

const buttonListRefresh = document.getElementById("list-refresh-button");
buttonListRefresh.addEventListener("click", async () => {
  games = await getLobbies();

  gameList.innerHTML = ""; // empty list body

  games.forEach((game) => displayGameInList(game));
  displayFilteredList();
});

/// Join Game
const joinGame = async (gameId, password) => {
  try {
    const res = await fetch(`/game/${gameId}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      console.log(res);
      const container = document.getElementById("error-message-container");
      const errorMessage = document.getElementById("error-message-p");
      errorMessage.innerText = await res.text();
    }

    if (res.redirected) window.location.href = res.url;
  } catch (error) {
    console.log(error);
  }
};

const generateProtectedGameForm = async (id, name) => {
  const title = document.getElementById("protected-game-form-title");
  title.innerText = `Join Game : ${name}`;

  const button = document.getElementById("protected-game-form-button");
  button.addEventListener("click", async () => {
    const password = document.getElementById("password").value;
    await joinGame(id, password);
  });

  const formContainer = document.getElementById("protected-game-popup");
  formContainer.style.display = "flex";
};

const closeProtectedGameFormButton = document.getElementById(
  "close-protected-game-form",
);
closeProtectedGameFormButton.addEventListener("click", () => {
  const createGameForm = document.getElementById("protected-game-popup");
  createGameForm.style.display = "none";
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
formCreateFormButton.addEventListener("click", async (e) => {
  e.preventDefault();

  const name = document.getElementById("create-game-name").value;
  const password = document.getElementById("create-game-password").value;
  const max_players = document.getElementById("create-game-max-players").value;

  try {
    const res = await fetch("/game/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, password, max_players }),
    });
    let message = await res.text();
    console.log(message);

    if (res.redirected) window.location.href = res.url;
  } catch (error) {
    console.log(error);
  }
});

/// Lobby List Filtering
// Lobby List Filters
const buttonListFilterAll = document.getElementById("list-filter-all");
const buttonListFilterHideFull = document.getElementById(
  "list-filter-hide-full",
);
const buttonListFilterPublic = document.getElementById("list-filter-public");
const buttonListFilterPrivate = document.getElementById("list-filter-private");

// Default filter states (on page refresh / load)
buttonListFilterAll.checked = true;
buttonListFilterHideFull.checked = false;
buttonListFilterPublic.checked = true;
buttonListFilterPrivate.checked = true;

const displayFilteredList = () => {
  const hideFull = buttonListFilterHideFull.checked;
  const showPublic = buttonListFilterPublic.checked;
  const showPrivate = buttonListFilterPrivate.checked;

  games.forEach((game) => {
    const gameContainer = document.getElementById(`game-${game.id}`);

    if (hideFull && game.player_count == game.max_players)
      gameContainer.style.display = "none";
    else if (
      (!showPrivate && game.has_password) ||
      (!showPublic && !game.has_password)
    )
      gameContainer.style.display = "none";
    else gameContainer.style.display = "flex";
  });
};

buttonListFilterAll.addEventListener("change", (event) => {
  if (event.target.checked) {
    buttonListFilterHideFull.checked = false;
    buttonListFilterPublic.checked = true;
    buttonListFilterPrivate.checked = true;

    displayFilteredList();
  }
});

buttonListFilterHideFull.addEventListener("change", (event) => {
  if (event.target.checked) buttonListFilterAll.checked = false;

  displayFilteredList();
});

buttonListFilterPublic.addEventListener("change", (event) => {
  if (!event.target.checked) buttonListFilterAll.checked = false;

  displayFilteredList();
});

buttonListFilterPrivate.addEventListener("change", (event) => {
  if (!event.target.checked) buttonListFilterAll.checked = false;

  displayFilteredList();
});
