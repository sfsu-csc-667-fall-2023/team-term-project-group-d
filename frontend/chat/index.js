import { io } from "socket.io-client";

const chatWindow = document.querySelector("#chat-messages");
const roomId = document.querySelector("#room-id").value;

const chatSocket = io();

//Step 3 Chat: Listen for Socket IO Event and do something with message
chatSocket.on(
  `chat:message:${roomId}`,
  ({ hash, from, timestamp, message }) => {
    const div = document.createElement("div");
    div.classList.add("message");

    const p = document.createElement("p");
    p.innerText = `${from}: ${message}`;

    div.appendChild(p);

    chatWindow.appendChild(div);
  },
);
