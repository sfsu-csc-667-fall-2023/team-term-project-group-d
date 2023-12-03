import { io } from "socket.io-client";

const chatWindow = document.querySelector("#chat-messages");
const lobbyId = document.querySelector("#lobbyId").value;

const lobbySocket = io({ query: { id: lobbyId } });

lobbySocket.on("lobby-join", (userName) => {
  console.log(`${userName} has joined the lobby`);

  const div = document.createElement("div");
  div.classList.add("message");

  const p = document.createElement("p");
  p.innerText = `${userName} has joined the lobby`;

  div.appendChild(p);

  chatWindow.appendChild(div);
});
