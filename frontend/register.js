document.getElementById("registerButton").addEventListener("click", (event) => {
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (password !== confirmPassword) {
    document.getElementById("match-password-card").style.display = "block";
    event.preventDefault();
  }
});
