console.log("Hello from a bundled asset."),
  (() => {
    let e;
    const t = document.getElementsByClassName("hand-card");
    for (let l = 0; l < t.length; l++)
      t.item(l).addEventListener("click", (l) => {
        e = l.target.getAttribute("cardId");
        for (let e = 0; e < t.length; e++)
          t.item(e) != l.target && t.item(e).classList.remove("selected");
        l.target.classList.toggle("selected");
      });
    document
      .getElementById("play-button")
      .addEventListener("click", async (t) => {
        t.preventDefault();
        const l = { cardId: e, color: "red", userId: 21 };
        try {
          const e = await fetch("http://localhost:3000/game/3/card/play", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(l),
            }),
            t = await e.json();
          console.log(t);
        } catch (e) {
          console.log(e);
        }
      });
  })();
