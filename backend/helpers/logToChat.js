/**
 * Send a System Message to the specified game's chat
 * @param {Request} req
 * @param {string | number} gameId
 * @param {string} message
 */
const logMessageToChat = (req, gameId, message) => {
  req.app
    .get("io")
    .emit(`chat:message:${gameId}`, { from: "SYSTEM", message: message });
};

module.exports = {
  logMessageToChat,
};
