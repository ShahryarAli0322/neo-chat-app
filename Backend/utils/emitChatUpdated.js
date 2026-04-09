function toPlainChat(chatDoc) {
  if (!chatDoc) return null;
  if (typeof chatDoc.toObject === "function") {
    return chatDoc.toObject({ flattenMaps: true });
  }
  return { ...chatDoc };
}

/**
 * Notify every participant (chat.users join rooms = their user id on "setup").
 * Socket.IO: chain .to(room) per user, then one emit - same net effect as
 * notifying each member of the chat.
 */
function emitChatUpdated(req, chatDoc) {
  try {
    const io = req.app?.get("io");
    if (!io || !chatDoc) return;
    const plain = toPlainChat(chatDoc);
    const users = plain.users || [];
    const ids = users
      .map((u) => (u && u._id != null ? String(u._id) : String(u)))
      .filter(Boolean);
    if (ids.length === 0) return;
    let target = io.to(ids[0]);
    for (let i = 1; i < ids.length; i += 1) {
      target = target.to(ids[i]);
    }
    target.emit("chat updated", plain);
  } catch {
    /* missing io in tests */
  }
}

module.exports = { emitChatUpdated, toPlainChat };
