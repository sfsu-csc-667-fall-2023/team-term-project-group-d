const express = require("express");
const router = express.Router();
const { createHash } = require("crypto");

const handler = (req, res) => {
  const { id: roomId } = req.params;
  const { message } = req.body;
  const { email } = req.session.user;

  const io = req.app.get("io");

  //Step 2 Chat: Emit Socket IO Event with message
  io.emit(`chat:message:${roomId === undefined ? 0 : roomId}`, {
    hash: createHash("sha256").update(email).digest("hex"),
    from: req.session.user.username,
    timestamp: Date.now(),
    message,
  });

  res.sendStatus(200);
};

router.post("/:id", handler);
router.post("/:id/chat", handler);

module.exports = router;
