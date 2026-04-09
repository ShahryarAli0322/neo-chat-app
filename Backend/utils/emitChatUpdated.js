function toPlainChat(chatDoc) {
  if (!chatDoc) return null;
  if (typeof chatDoc.toObject === "function") {
    return chatDoc.toObject({ flattenMaps: true });
  }
  return { ...chatDoc };
}

function emitChatUpdated(req, chatDoc) {
  try {
    const io = req.app?.get("io");
    if (!io || !chatDoc) return;
    const plain = toPlainChat(chatDoc);
    const users = plain.users || [];
    const ids = users
      .map((u) => (u && u._id != null ? String(u._id) : String(u)))
      .filter(Boolean);
    ids.forEach((uid) => io.to(uid).emit("chat updated", plain));
  } catch {
    /* missing io in tests */
  }
}

module.exports = { emitChatUpdated, toPlainChat };
