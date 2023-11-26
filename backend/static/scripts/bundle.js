console.log("Hello from a bundled asset."),
  [
    { id: 1, name: "Test", max_players: 4, lobby_size: 1 },
    { id: 2, name: "Test again", max_players: 4, lobby_size: 2 },
    { id: 3, name: "Test again again", max_players: 4, lobby_size: 3 },
  ].forEach((e) => {
    const t = document.createElement("div");
    t.classList.add("available-game");
    const n = document.createElement("p");
    n.innerText = e.id;
    const a = document.createElement("p");
    a.innerText = e.name;
    const d = document.createElement("p");
    d.innerText = `Players : ${e.lobby_size}/${e.max_players}`;
    const l = document.createElement("button");
    l.addEventListener("click", (t) => {
      alert(`Joining game, game ${e.name}, id ${e.id}`);
    }),
      (l.innerText = "Join");
    const i = document.createElement("div");
    i.classList.add("game-info"),
      t.appendChild(n),
      i.appendChild(a),
      i.appendChild(d),
      t.appendChild(i),
      t.appendChild(l),
      document.getElementById("game-list-container").appendChild(t);
  }),
  document
    .getElementById("create-game-button")
    .addEventListener("click", () => {
      document.getElementById("popup-container").style.display = "flex";
    }),
  document.getElementById("close-popup").addEventListener("click", () => {
    document.getElementById("popup-container").style.display = "none";
  }),
  document.getElementById("form-create-game").addEventListener("click", (e) => {
    e.preventDefault(), alert("TODO : fix this form & create the game");
  });
