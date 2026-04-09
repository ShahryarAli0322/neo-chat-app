const expressAsyncHandler = require("express-async-handler");
const Message = require("../Models/messageModel");
const Chat = require("../Models/chatModel");
const MessageRequest = require("../Models/messageRequestModel");

const sendMessage = expressAsyncHandler(async (req, res) => {
  const { content, chatId } = req.body;

  const trimmed = typeof content === "string" ? content.trim() : "";
  if (!trimmed || !chatId) {
    return res.status(400).json({ message: "Content and chatId are required" });
  }

  const chat = await Chat.findById(chatId).populate("users", "_id name email pic isGroupChat");
  if (!chat) return res.status(404).json({ message: "Chat not found" });

  const meStr = String(req.user._id);
  if ((chat.deletedFor || []).some((id) => String(id) === meStr)) {
    chat.deletedFor = (chat.deletedFor || []).filter((id) => String(id) !== meStr);
    await chat.save();
  }

  if (!chat.isGroupChat && chat.status === "declined") {
    chat.status = "pending";
    chat.declinedAt = null;
    chat.declinedByUser = null;
    await chat.save();
  }

  if (!chat.isGroupChat) {
    const me = String(req.user._id);
    const otherUser = chat.users.find(u => String(u._id) !== me);
    if (!otherUser) return res.status(400).json({ message: "Invalid chat users" });

    const otherId = String(otherUser._id);

    
    const accepted = await MessageRequest.findOne({
      $or: [
        { from: me, to: otherId, status: "accepted" },
        { from: otherId, to: me, status: "accepted" },
      ],
    });

    if (!accepted) {
      
      let pendingFromMe = await MessageRequest.findOne({
        from: me,
        to: otherId,
        status: "pending",
      });

  
      const pendingFromThem = await MessageRequest.findOne({
        from: otherId,
        to: me,
        status: "pending",
      });

      if (pendingFromThem) {
      
        return res.status(403).json({
          message: "Message request pending from the other user. Accept the request to continue.",
          code: "REQUEST_PENDING_FROM_THEM",
          requestId: pendingFromThem._id,
        });
      }

      if (!pendingFromMe) {
        
        pendingFromMe = await MessageRequest.create({
          from: me,
          to: otherId,
          chat: chatId,
          preMessageUsed: true, 
        });
      } else {
        
        if (pendingFromMe.preMessageUsed) {
          return res.status(403).json({
            message: "Your message request is pending. You can send only one message until it is accepted.",
            code: "REQUEST_LIMIT_REACHED",
            requestId: pendingFromMe._id,
          });
        }
        
        pendingFromMe.preMessageUsed = true;
        await pendingFromMe.save();
      }
    }
  }

  
  try {
    const created = await Message.create({
      sender: req.user._id,
      content: trimmed,
      chat: chatId,
    });

    const message = await Message.findById(created._id)
      .populate("sender", "name pic email")
      .populate({
        path: "chat",
        populate: { path: "users", select: "name pic email" },
      })
      .populate("reactions.user", "name pic email");

    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

    return res.json(message);
  } catch (error) {
    console.error("Message send error:", error);
    return res.status(400).json({ message: error.message });
  }
});

const allMessages = expressAsyncHandler(async (req, res) => {
  try {
    const uid = String(req.user._id);
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    if (!chat.users.some((u) => String(u) === uid)) {
      return res.status(403).json({ message: "Not a member of this chat" });
    }

    if ((chat.deletedFor || []).some((id) => String(id) === uid)) {
      chat.deletedFor = (chat.deletedFor || []).filter((id) => String(id) !== uid);
      await chat.save();
    }

    const cutoff = (chat.perUserMessageCutoff || []).find((e) => String(e.user) === uid);
    const query = { chat: req.params.chatId };
    if (cutoff) query.createdAt = { $gt: cutoff.after };

    let messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .populate("sender", "name pic email")
      .populate({
        path: "chat",
        populate: { path: "users", select: "name pic email" },
      })
      .populate("reactions.user", "name pic email");

    messages = messages.filter((msg) => {
      const hiddenFor = (msg.deletedFor || []).map((id) => String(id));
      return !hiddenFor.includes(uid);
    });

    return res.json(messages);
  } catch (error) {
    console.error("Fetch messages error:", error);
    return res.status(400).json({ message: error.message });
  }
});

const addReaction = expressAsyncHandler(async (req, res) => {
  const { messageId, emoji } = req.body;
  if (!messageId || !emoji) {
    return res.status(400).json({ message: "Message ID and emoji are required" });
  }

  const message = await Message.findById(messageId);
  if (!message) return res.status(404).json({ message: "Message not found" });

  const idx = message.reactions.findIndex(
    (r) => r.user.toString() === req.user._id.toString()
  );
  if (idx >= 0) message.reactions[idx].emoji = emoji;
  else message.reactions.push({ user: req.user._id, emoji });

  await message.save();

  const populated = await Message.findById(message._id)
    .populate("sender", "name pic email")
    .populate({ path: "chat", populate: { path: "users", select: "name pic email" } })
    .populate("reactions.user", "name pic email");

  return res.json(populated);
});

const removeReaction = expressAsyncHandler(async (req, res) => {
  const { messageId } = req.body;
  if (!messageId) return res.status(400).json({ message: "Message ID is required" });

  const message = await Message.findById(messageId);
  if (!message) return res.status(404).json({ message: "Message not found" });

  message.reactions = message.reactions.filter(
    (r) => r.user.toString() !== req.user._id.toString()
  );
  await message.save();

  const populated = await Message.findById(message._id)
    .populate("sender", "name pic email")
    .populate({ path: "chat", populate: { path: "users", select: "name pic email" } })
    .populate("reactions.user", "name pic email");

  return res.json(populated);
});

const deleteMessage = expressAsyncHandler(async (req, res) => {
  const { type } = req.body || {};
  const mode = type === "me" ? "me" : "everyone";

  const message = await Message.findById(req.params.id);
  if (!message) return res.status(404).json({ message: "Message not found" });

  const userId = String(req.user._id);

  if (mode === "everyone") {
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized to delete this message for everyone" });
    }

    message.isDeleted = true;
    message.content = "This message was deleted";
    message.reactions = [];
    await message.save();

    const populated = await Message.findById(message._id)
      .populate("sender", "name pic email")
      .populate({ path: "chat", populate: { path: "users", select: "name pic email" } })
      .populate("reactions.user", "name pic email");

    return res.json({ message: "Message deleted for everyone", mode: "everyone", data: populated });
  }

  const chatDoc = await Chat.findById(message.chat);
  if (!chatDoc || !chatDoc.users.some((u) => String(u) === userId)) {
    return res.status(403).json({ message: "Not a member of this chat" });
  }

  const already = (message.deletedFor || []).some((id) => String(id) === userId);
  if (!already) {
    message.deletedFor.push(req.user._id);
    await message.save();
  }

  return res.json({ message: "Message hidden for you", mode: "me", id: message._id });
});

module.exports = {
  sendMessage,
  allMessages,
  addReaction,
  removeReaction,
  deleteMessage,
};
