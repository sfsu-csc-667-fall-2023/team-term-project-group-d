document
  .getElementById("register-button")
  .addEventListener("click", (event) => {
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (password !== confirmPassword) {
      document.getElementById("match-password-card").style.display = "block";
      event.preventDefault();
    }
  });

function closeErrorCard(cardId) {
  const errorCard = document.getElementById(cardId);
  if (errorCard) {
    errorCard.style.display = "none";
  }
}
