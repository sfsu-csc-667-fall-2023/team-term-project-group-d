const express = require("express");
const router = express.Router();

router.post("/:id", (req, res) => {
  const { id } = req.params; //get id from url
  const { message } = req.body;

  const io = req.app.get("io");

  console.log({ id, message });

  //Step 2 Chat: Emit Socket IO Event with message
  io.emit("chat:message:0", {
    from: req.session.user.username,
    timestamp: Date.now(),
    message,
  });

  res.status(200);
});

module.exports = router;
