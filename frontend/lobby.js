const gameId = Number(document.getElementById("game-id").value);

//setup socket to listen for game start
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

const startButton = document.getElementById("start-button");
startButton.addEventListener("click", startGame);
