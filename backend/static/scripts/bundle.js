console.log("Hello from a bundled asset."),
  document.getElementById("register-button").addEventListener("click", (e) => {
    document.getElementById("password").value !==
      document.getElementById("confirm-password").value &&
      ((document.getElementById("match-password-card").style.display = "block"),
      e.preventDefault());
  });
