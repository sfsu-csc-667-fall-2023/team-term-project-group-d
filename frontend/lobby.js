const gameId = Number(document.getElementById("game-id").value);
const startButton = document.getElementById("start-button");

import { io } from "https://cdn.skypack.dev/socket.io-client"; //idk why this is necessary

const socket = io({ query: { id: gameId } });

const shuffleSound = new Audio("/music/shuffle_sound.m4a");

socket.on("game-start", (data) => {
  //transport the user to the game page
  shuffleSound.volume = 0.5;
  shuffleSound.play();
  setTimeout(() => {
    window.location.href = "/game/" + data.gameId;
  }, 1500);
});

socket.on("player-joined", (user) => {
  //append the new user to the list of users
  const userContainer = document.createElement("div");
  userContainer.classList.add("player-card-container");
  const userImg = document.createElement("img");
  userImg.src = user.image;
  userImg.alt = user.username;
  userImg.classList.add("player-card");
  const nameParagraph = document.createElement("p");
  nameParagraph.innerText = user.username;
  userContainer.appendChild(userImg);
  userContainer.appendChild(nameParagraph);
  const parent = document.getElementById("player-container");
  parent.prepend(userContainer);
  //update the player count
  const oldPlayerCount = Number(
    document.getElementById("player-count").innerText.charAt(0),
  );
  const maxPlayers = Number(
    document.getElementById("player-count").innerText.slice(-1),
  );
  document.getElementById("player-count").innerText =
    oldPlayerCount + 1 + " / " + maxPlayers;

  startButton.disabled = false;
});

const startGame = async () => {
  const gameId = Number(document.getElementById("game-id").value);
  try {
    const res = await fetch(`/game/${gameId}/start`, {
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
