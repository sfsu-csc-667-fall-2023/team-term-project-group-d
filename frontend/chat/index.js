import { io } from "socket.io-client";

const chatWindow = document.querySelector("#chat-messages");

const chatSocket = io();

//Step 3 Chat: Listen for Socket IO Event and do something with message
chatSocket.on("chat:message:0", ({ from, timestamp, message }) => {
  const div = document.createElement("div");
  div.classList.add("message");

  const p = document.createElement("p");
  p.innerText = `${from}: ${message}`;

  div.appendChild(p);

  chatWindow.appendChild(div);
});

//Step 1 Chat: POST message to chat route
document.querySelector("#message").addEventListener("keydown", (event) => {
  if (event.keyCode === 13) {
    const message = event.target.value;

    fetch("/chat/0", {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    event.target.value = "";
  }
});
