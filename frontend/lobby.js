const contextGameId = Number(document.getElementById("game-id").value);
const contextUserId = Number(document.getElementById("user-id").value);
const startButton = document.getElementById("start-button");

import { io } from "https://cdn.skypack.dev/socket.io-client"; //idk why this is necessary

const socket = io({ query: { gameId: contextGameId, userId: contextUserId } });

const shuffleSound = new Audio("/music/shuffle_sound.m4a");

socket.on("game-start", (data) => {
  //transport the user to the game page
  shuffleSound.volume = 0.5;
  shuffleSound.play();
  setTimeout(() => {
    window.location.href = "/game/" + data.gameId;
  }, 1500);
});

socket.on("player-joined", (newUser) => {
  // Check player doesn't already exist on screen
  if (document.getElementById(`user-${newUser.id}`) != null) return;

  // Append the new user to the list of users
  const userContainer = document.createElement("div");
  userContainer.classList.add("player-card-container");
  userContainer.id = `user-${newUser.id}`;

  const userImg = document.createElement("img");
  userImg.src = newUser.image;
  userImg.alt = newUser.username;
  userImg.classList.add("player-card");

  const nameParagraph = document.createElement("p");
  nameParagraph.innerText = newUser.username;

  userContainer.appendChild(userImg);
  userContainer.appendChild(nameParagraph);

  const parent = document.getElementById("player-container");
  parent.prepend(userContainer);

  // Update the player count
  const playerCount = document.getElementById("current-player-count");
  const maxPlayers = document.getElementById("total-player-count");

  playerCount.innerText = Number(playerCount.innerText) + 1;

  // if (Number(playerCount.innerText) == Number(maxPlayers.innerText)) {
  //   startButton.style.backgroundColor = "green";
  //   startButton.style.color = "yellow";
  // }

  startButton.disabled = false;
});

socket.on("player-left", (missingUser) => {
  // Remove the user from the screen
  document.getElementById(`user-${missingUser.id}`).remove();

  // Update the player count
  const playerCount = document.getElementById("current-player-count");
  playerCount.innerText = Number(playerCount.innerText) - 1;
});

const startGame = async () => {
  const gameId = Number(document.getElementById("game-id").value);
  try {
    const res = await fetch("/game/startGame", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gameId: gameId }),
    });
    if (res.status != 200) {
      alert("Error starting game");
      return;
    } else {
      console.log("Game started successfully. Navigating...");
    }
  } catch (error) {
    console.log(error);
  }
};

startButton.addEventListener("click", startGame);
