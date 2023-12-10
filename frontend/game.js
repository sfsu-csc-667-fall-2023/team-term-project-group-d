const gameId = Number(document.getElementById("game-id").value);
const clientId = Number(document.getElementById("client-id").value);
const client = document.getElementsByClassName("client-hand")[0];

import { io } from "https://cdn.skypack.dev/socket.io-client"; //idk why this is necessary

//sound effect that plays when anyone plays a card
const playSound = new Audio("/music/play_card.m4a");

const hideButtons = () => {
  document.getElementById("play-button").classList.add("hidden");
  document.getElementById("draw-button").classList.add("hidden");
};
const showButtons = () => {
  document.getElementById("play-button").classList.remove("hidden");
  document.getElementById("draw-button").classList.remove("hidden");
};

const updateTurnDisplay = (clientId, activePlayerId, activePlayerHandSize) => {
  //play the play card sound effect
  playSound.play();
  //update the display of the player whose turn it is
  if (clientId === activePlayerId) {
    showButtons();
    client.style.border = "black solid 10px";
    if (activePlayerHandSize === "2") {
      document
        .getElementById("declare-uno-container")
        .classList.remove("hidden");
      document.getElementById("declare-uno-button").checked = false;
    } else {
      document.getElementById("declare-uno-container").classList.add("hidden");
    }
  } else {
    hideButtons();
    document.getElementById(`opponent-${activePlayerId}`).style.border =
      "yellow solid 3px";
    document.getElementById("declare-uno-container").classList.add("hidden");
  }
};

const socket = io({ query: { id: gameId } });

socket.on("card-played", (data) => {
  const newSrc = `/images/cards/${data.color}_${data.symbol}.png`;
  const activeCard = document.getElementById("discard-card");
  activeCard.setAttribute("src", newSrc);
  activeCard.setAttribute("card-color", data.color);
  activeCard.setAttribute("card-symbol", data.symbol);

  if (clientId === Number(data.clientId)) {
    //remove the card from the hand
    const cardToRemove = document.getElementById(
      `game#${gameId}-card#${data.cardId}`,
    );
    cardToRemove.remove();
    client.style.border = "none";
  } else {
    //update the hand count of the player who played the card
    const playerHandCount = document.getElementById(`hand-${data.clientId}`);
    playerHandCount.innerText =
      Number(playerHandCount.innerText.slice(0, -1)) - 1 + "X";
    //their turn ended, so remove the border
    document.getElementById(`opponent-${data.clientId}`).style.border = "none";
  }

  updateTurnDisplay(clientId, data.activePlayerId, data.activePlayerHandSize);
});

socket.on("cards-drawn", (data) => {
  if (clientId === Number(data.currentPlayerId)) {
    data.cards.forEach((card) => {
      const newCard = document.createElement("img");
      newCard.setAttribute(
        "src",
        `/images/cards/${card.color}_${card.symbol}.png`,
      );
      newCard.setAttribute("class", "hand-card");
      newCard.setAttribute("id", `game#${gameId}-card#${card.id}`);
      newCard.setAttribute("card-color", card.color);
      newCard.setAttribute("card-symbol", card.symbol);
      newCard.addEventListener("click", (event) => {
        selectedId = event.target.getAttribute("id");
        let secondHalfOfId = selectedId.split("-")[1]; //selectedId looks like game#15-card#11 for example
        selectedCardId = secondHalfOfId.substring(5, secondHalfOfId.length); //this gets the actual card id
        for (let j = 0; j < hand.length; j++) {
          if (hand.item(j) !== event.target)
            hand.item(j).classList.remove("selected");
        }
        event.target.classList.toggle("selected");
      });
      client.appendChild(newCard);
    });
  } else {
    const playerHandCount = document.getElementById(
      `hand-${data.currentPlayerId}`,
    );
    playerHandCount.innerText =
      Number(playerHandCount.innerText.slice(0, -1)) + data.cards.length + "X";
  }
});

socket.on("card-drawn", (data) => {
  if (clientId === Number(data.clientId)) {
    const newCard = document.createElement("img");
    newCard.setAttribute(
      "src",
      `/images/cards/${data.drawnColor}_${data.drawnSymbol}.png`,
    );
    newCard.setAttribute("class", "hand-card");
    newCard.setAttribute("id", `game#${gameId}-card#${data.drawnId}`);
    newCard.setAttribute("card-color", data.drawnColor);
    newCard.setAttribute("card-symbol", data.drawnSymbol);
    newCard.addEventListener("click", (event) => {
      selectedId = event.target.getAttribute("id");
      let secondHalfOfId = selectedId.split("-")[1]; //selectedId looks like game#15-card#11 for example
      selectedCardId = secondHalfOfId.substring(5, secondHalfOfId.length); //this gets the actual card id
      for (let j = 0; j < hand.length; j++) {
        if (hand.item(j) !== event.target)
          hand.item(j).classList.remove("selected");
      }
      event.target.classList.toggle("selected");
    });
    client.appendChild(newCard);
    client.style.border = "none";
  } else {
    const playerHandCount = document.getElementById(`hand-${data.clientId}`);
    playerHandCount.innerText =
      Number(playerHandCount.innerText.slice(0, -1)) + 1 + "X";
    document.getElementById(`opponent-${data.clientId}`).style.border = "none";
  }
  updateTurnDisplay(clientId, data.activePlayerId, data.activePlayerHandSize);
});

socket.on("is-win", (data) => {
  const winnerName = data.winnerName;
  //unhide and fill the winner div with the winner info
  document.getElementById("winner-header").innerText = `${winnerName} won!`;
  document.getElementById("winner-div").classList.remove("hidden");
});

let selectedId;
let selectedCardId;

//show the first player to move
const activePlayerId = document.getElementById("active-player-id").value;
if (clientId === Number(activePlayerId)) {
  document.getElementsByClassName("client-hand")[0].style.border =
    "green solid 10px";
} else {
  document.getElementById(`opponent-${activePlayerId}`).style.border =
    "yellow solid 3px";
  hideButtons();
}

const isLegalMove = (card) => {
  if (card.color === "wild") return true;
  const discardCard = document.getElementById("discard-card");

  const color = discardCard.getAttribute("card-color");
  const symbol = discardCard.getAttribute("card-symbol");
  return card.color === color || card.symbol === symbol;
};

const hand = document.getElementsByClassName("hand-card");
for (let i = 0; i < hand.length; i++) {
  hand.item(i).addEventListener("click", (event) => {
    selectedId = event.target.getAttribute("id");
    let secondHalfOfId = selectedId.split("-")[1]; //selectedId looks like game#15-card#11 for example
    selectedCardId = secondHalfOfId.substring(5, secondHalfOfId.length); //this gets the actual card id
    for (let j = 0; j < hand.length; j++) {
      if (hand.item(j) !== event.target)
        hand.item(j).classList.remove("selected");
    }
    event.target.classList.toggle("selected");
  });
}

const playButton = document.getElementById("play-button");
playButton.addEventListener("click", async (event) => {
  event.preventDefault();
  let cardColor = document
    .getElementById(selectedId)
    .getAttribute("card-color");
  const selectedCard = {
    color: cardColor,
    symbol: document.getElementById(selectedId).getAttribute("card-symbol"),
  };
  if (!isLegalMove(selectedCard)) {
    alert("Illegal move"); //TODO inform the user in a clean way.
    return;
  }

  if (selectedCard.color === "wild") {
    const validColors = ["red", "green", "yellow", "blue"];
    do {
      cardColor = prompt("Choose a color: red, blue, green, or yellow");
    } while (!validColors.includes(cardColor.toLowerCase()));
  }
  const body = {
    cardId: selectedCardId,
    color: cardColor,
    symbol: selectedCard.symbol,
    isDeclared: document.getElementById("declare-uno-button").checked,
  };
  try {
    const response = await fetch(`/game/${gameId}/card/play`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    console.log(response);
    if (response.status === 400) {
      console.log("its not your turn");
      alert("It's not your turn!");
    }
  } catch (error) {
    console.log(error);
  }
});

const drawButton = document.getElementById("draw-button");
drawButton.addEventListener("click", async (event) => {
  event.preventDefault();
  try {
    const response = await fetch(`/game/${gameId}/card/draw`, {
      method: "POST",
    });
    console.log(response);
  } catch (error) {
    console.log(error);
  }
});

const handleUnoClick = async (e) => {
  e.preventDefault();
  try {
    const response = await fetch(`/game/${gameId}/unoAccuse`, {
      method: "POST",
    });
    console.log(response);
  } catch (error) {
    console.log(error);
  }
};

const unoButton = document.getElementById("uno-button");
unoButton.addEventListener("click", handleUnoClick);

const soundTrack = new Audio("/music/uno_music.m4a");
soundTrack.volume = 0.3;
soundTrack.loop = true;

const handleAudioClick = (e) => {
  e.preventDefault();
  if (e.target.innerText === "▶️") {
    soundTrack.play();
    e.target.innerText = "⏸️";
  } else {
    soundTrack.pause();
    e.target.innerText = "▶️";
  }
};

const audioButton = document.getElementById("music-button");
audioButton.addEventListener("click", handleAudioClick);

const handleExitGame = () => {
  window.location.href = "/";
};

const returnHomeButton = document.getElementById("return-home-button");
returnHomeButton.addEventListener("click", handleExitGame);
