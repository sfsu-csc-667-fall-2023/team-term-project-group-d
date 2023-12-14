import { io } from "socket.io-client";

const chatWindow = document.querySelector("#chat-messages");
const roomId = document.querySelector("#room-id").value;

const chatSocket = io();

//Step 3 Chat: Listen for Socket IO Event and do something with message
chatSocket.on(
  `chat:message:${roomId}`,
  ({ image, from, timestamp, message }) => {
    console.log(roomId);
    const div = document.createElement("div");
    div.classList.add("message");

    const p = document.createElement("p");

    if (from === "SYSTEM") {
      p.classList.add("system-message");

      const colors = ["Red", "Green", "Yellow", "Blue"];
      for (let word of message.split(" ")) {
        if (colors.includes(word)) {
          const span = document.createElement("span");
          span.innerText = ` ${word} `;
          span.classList.add(word.toLowerCase());

          p.appendChild(span);
        } else p.innerHTML += ` ${word}`;
      }
    } else p.innerHTML = `${from}: ${message}`;

    div.appendChild(p);

    chatWindow.appendChild(div);

    chatWindow.scrollTop = chatWindow.scrollHeight;
  },
);
