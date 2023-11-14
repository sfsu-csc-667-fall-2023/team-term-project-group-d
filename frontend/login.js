function closeErrorCard(cardId) {
  const errorCard = document.getElementById(cardId);
  if (errorCard) {
    errorCard.style.display = "none";
  }
}
