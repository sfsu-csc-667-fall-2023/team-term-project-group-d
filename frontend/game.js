const gameId = Number(document.getElementById("game-id").value);
const clientId = Number(document.getElementById("client-id").value);
//setup socket to listen for game actions
import { io } from "https://cdn.skypack.dev/socket.io-client"; //idk why this is necessary

const socket = io({ query: { id: gameId } });

socket.on("card-played", (data) => {
  /**
 
   * if the card played was a wild card, then somehow display the color chosen
   * TODO: add 8 cards: red_wild, blue_wild, green_wild, yellow_wild_draw_four, etc.
   * display who's turn it is
   */
  const client = document.getElementsByClassName("client-hand")[0];
  const newSrc = `/images/cards/${data.color}_${data.symbol}.png`;
  const activeCard = document.getElementById("discard-card");
  activeCard.setAttribute("src", newSrc);
  activeCard.setAttribute("card-color", data.color);
  activeCard.setAttribute("card-symbol", data.symbol);
  //determine if the card was played by this client
  console.log(JSON.stringify(data));
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
    console.log("the player has this in hand: " + playerHandCount.innerText);
    playerHandCount.innerText =
      Number(playerHandCount.innerText.slice(0, -1)) - 1 + "X";
    //their turn ended, so remove the red border
    document.getElementById(`opponent-${data.clientId}`).style.border = "none";
  }

  //update the display of the player whose turn it is
  if (clientId === Number(data.activePlayerId)) {
    client.style.border = "black solid 10px";
  } else {
    document.getElementById(`opponent-${data.activePlayerId}`).style.border =
      "yellow solid 3px";
  }
});

socket.on("card-drawn", (data) => {
  /**
   * display who's turn it is
   * if it is the client that just moved, update their hand with the new card
   * else, update the hand count of the player who drew the card
   *
   */
  const client = document.getElementsByClassName("client-hand")[0];
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
        if (hand.item(j) != event.target)
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
  //update the display of the player whose turn it is
  if (clientId === Number(data.activePlayerId)) {
    client.style.border = "black solid 10px";
  } else {
    document.getElementById(`opponent-${data.activePlayerId}`).style.border =
      "yellow solid 3px";
  }
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
}

//check if the card arg is allowed to be played
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
      if (hand.item(j) != event.target)
        hand.item(j).classList.remove("selected");
    }
    event.target.classList.toggle("selected");
  });
}

const playButton = document.getElementById("play-button");
playButton.addEventListener("click", async (event) => {
  event.preventDefault();
  console.log("the selected id is: " + selectedId);
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

  //TODO detect wild card. Prompt user for color
  if (selectedCard.color === "wild") {
    cardColor = prompt("Choose a color: red, blue, green, or yellow");
  }
  console.log("the selected color is: " + cardColor);
  const body = {
    cardId: selectedCardId,
    color: cardColor,
    symbol: selectedCard.symbol,
  };
  try {
    const response = await fetch(
      `http://localhost:3000/game/${gameId}/card/play`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
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
    const response = await fetch(
      `http://localhost:3000/game/${gameId}/card/draw`,
      { method: "POST" },
    );
    console.log(response);
  } catch (error) {
    console.log(error);
  }
});
