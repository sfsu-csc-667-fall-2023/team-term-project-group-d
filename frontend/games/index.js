import { io } from "socket.io-client";

const chatWindow = document.querySelector("#chat-messages");
const gameId = document.querySelector("#gameId").value;

const gameSocket = io({ query: { id: gameId } });

gameSocket.on("game-join", (userName) => {
  console.log(`${userName} has joined the game`);

  const div = document.createElement("div");
  div.classList.add("message");

  const p = document.createElement("p");
  p.innerText = `${userName} has joined the game`;

  div.appendChild(p);

  chatWindow.appendChild(div);
});
