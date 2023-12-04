let selectedId;
let selectedCardId;
const gameId = Number(document.getElementById("game-id").value);
//check if the card arg is allowed to be played
const isLegalMove = (card) => {
  if (card.color === "wild") return true;
  const discardCard = document.getElementById("discard-card");

  const color = discardCard.getAttribute("card-color");
  const symbol = discardCard.getAttribute("card-symbol");
  console.log(
    "discard card color: " +
      color +
      " symbol: " +
      symbol +
      " card color: " +
      card.color +
      " symbol: " +
      card.symbol,
  );
  return card.color === color || card.symbol === symbol;
};

const hand = document.getElementsByClassName("hand-card");
for (let i = 0; i < hand.length; i++) {
  hand.item(i).addEventListener("click", (event) => {
    selectedId = event.target.getAttribute("id");
    let secondHalfOfId = selectedId.split("-")[1]; //selectedId looks like game#15-card#11 for example
    selectedCardId = secondHalfOfId.substring(5, secondHalfOfId.length); //this gets the actual card id
    console.log("selected id is: " + selectedId);
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
    const json = await response.json();
    console.log(json);
  } catch (error) {
    console.log(error);
  }
});
