let selectedId;

const hand = document.getElementsByClassName("hand-card");
for (let i = 0; i < hand.length; i++) {
  hand.item(i).addEventListener("click", (event) => {
    selectedId = event.target.getAttribute("cardId");
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
  //TODO detect wild card. Prompt user for color
  const body = {
    cardId: selectedId,
    color: "red", //
    userId: 21, //TODO from session
  };
  const gameId = 3; //TODO from session
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
