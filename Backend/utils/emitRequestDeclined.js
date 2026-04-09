function emitRequestDeclined(req, { senderId, chatId, declinedByUserId }) {
  try {
    const io = req.app && req.app.get("io");
    if (!io || !senderId) return;
    io.to(String(senderId)).emit("request declined", {
      chatId: String(chatId),
      message: "Your message request has been declined",
      declinedByUserId: declinedByUserId ? String(declinedByUserId) : undefined,
    });
  } catch {
    /* tests or missing io */
  }
}

module.exports = { emitRequestDeclined };
