const express = require("express");
const router = express.Router();

const handler = (req, res) => {
  const { id: roomId } = req.params;
  const { message } = req.body;
  const { image, username } = req.session.user;

  const io = req.app.get("io");

  console.log({ message });
  console.log(roomId);
  //Step 2 Chat: Emit Socket IO Event with message
  io.emit(`chat:message:${roomId === undefined ? 0 : roomId}`, {
    image: image,
    from: username,
    timestamp: Date.now(),
    message,
  });

  res.sendStatus(200);
};

router.post("/:id", handler);
router.post("/:id/chat", handler);

module.exports = router;
