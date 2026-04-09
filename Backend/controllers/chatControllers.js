const asyncHandler = require("express-async-handler");
const Chat = require("../Models/chatModel");
const User = require("../Models/userModel");
const Message = require("../Models/messageModel");
const MessageRequest = require("../Models/messageRequestModel");
const {
  setChatDeclined,
  clearChatDecline,
  getPopulatedChatById,
} = require("../utils/syncChatRequestState");
const {
  getBlockRelation,
  isEitherBlocked,
  attachBlockFlagsToChatDoc,
} = require("../utils/blockHelpers");
const { emitRequestDeclined } = require("../utils/emitRequestDeclined");

function removeUserFromDeletedFor(chat, userId) {
  const uid = String(userId);
  const list = chat.deletedFor || [];
  if (!list.some((id) => String(id) === uid)) return false;
  chat.deletedFor = list.filter((id) => String(id) !== uid);
  return true;
}

// Access or create one-on-one chat
const accessChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "UserId param not sent with request" });
  }

  // Find if a one-on-one chat already exists
  let chat = await Chat.findOne({
    isGroupChat: false,
    users: { $all: [req.user._id, userId] },
  })
    .populate("users", "-password")
    .populate("latestMessage");

  chat = await User.populate(chat, {
    path: "latestMessage.sender",
    select: "name pic email",
  });

  if (chat) {
    const me = String(req.user._id);
    const otherUser = chat.users.find((u) => String(u._id) !== me);
    let eitherBlocked = false;
    if (otherUser) {
      const rel = await getBlockRelation(req.user._id, otherUser._id);
      eitherBlocked = isEitherBlocked(rel);
    }
    if (!eitherBlocked && removeUserFromDeletedFor(chat, req.user._id)) {
      await chat.save();
      chat = await Chat.findById(chat._id)
        .populate("users", "-password")
        .populate("latestMessage");
      chat = await User.populate(chat, {
        path: "latestMessage.sender",
        select: "name pic email",
      });
    }
    const withFlags = await attachBlockFlagsToChatDoc(chat, req.user._id);
    return res.json(withFlags);
  }

  // Otherwise create a new chat
  try {
    const chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    const createdChat = await Chat.create(chatData);

    let fullChat = await Chat.findById(createdChat._id)
      .populate("users", "-password");

    fullChat = await attachBlockFlagsToChatDoc(fullChat, req.user._id);
    res.status(201).json(fullChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Fetch all chats for logged-in user
const fetchChats = asyncHandler(async (req, res) => {
  try {
    let chats = await Chat.find({ users: req.user._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });

    chats = await User.populate(chats, {
      path: "latestMessage.sender",
      select: "name pic email",
    });

    const uid = String(req.user._id);
    chats = chats.filter(
      (c) => !(c.deletedFor || []).some((id) => String(id) === uid)
    );

    chats = await Promise.all(
      chats.map((c) => attachBlockFlagsToChatDoc(c, req.user._id))
    );

    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a group chat
const createGroupChat = asyncHandler(async (req, res) => {
  const { users, name } = req.body;

  if (!users || !name) {
    return res.status(400).json({ message: "Please fill all the fields" });
  }

  const parsedUsers = JSON.parse(users);

  if (parsedUsers.length < 2) {
    return res.status(400).json({ message: "At least 2 users are required to form a group chat" });
  }

  parsedUsers.push(req.user);

  try {
    const groupChat = await Chat.create({
      chatName: name,
      users: parsedUsers,
      isGroupChat: true,
      groupAdmin: req.user,
    });

    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.status(201).json(fullGroupChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Rename a group chat
const renameGroup = asyncHandler(async (req, res) => {
  const { chatId, chatName } = req.body;

  try {
    let updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { chatName },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage");

    updatedChat = await User.populate(updatedChat, {
      path: "latestMessage.sender",
      select: "name pic email",
    });

    if (!updatedChat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a user to group
const addToGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  try {
    let updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $addToSet: { users: userId } },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage");

    updatedChat = await User.populate(updatedChat, {
      path: "latestMessage.sender",
      select: "name pic email",
    });

    if (!updatedChat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove a user from group
const removeFromGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  try {
    let updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $pull: { users: userId } },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage");

    updatedChat = await User.populate(updatedChat, {
      path: "latestMessage.sender",
      select: "name pic email",
    });

    if (!updatedChat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Soft-delete chat for the current user only (chat + messages remain in DB)
const deleteChat = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) {
    return res.status(404).json({ message: "Chat not found" });
  }

  const isMember = chat.users.some((u) => String(u._id || u) === String(req.user._id));
  if (!isMember) {
    return res.status(403).json({ message: "Not authorized to delete this chat" });
  }

  const uid = req.user._id;
  const uidStr = String(uid);
  const deletedList = chat.deletedFor || [];
  if (!deletedList.some((id) => String(id) === uidStr)) {
    chat.deletedFor.push(uid);
  }

  const markers = chat.perUserMessageCutoff || [];
  const mi = markers.findIndex((m) => String(m.user) === uidStr);
  const now = new Date();
  if (mi >= 0) markers[mi].after = now;
  else markers.push({ user: uid, after: now });
  chat.perUserMessageCutoff = markers;

  await chat.save();

  return res.json({
    message: "Chat removed from your list",
    id: req.params.id,
    softDeleted: true,
  });
});

const UNDO_DECLINE_MINUTES = 30;

// Decline the pending incoming message request for this 1:1 chat (same effect as POST /api/requests/:id/decline).
const declineChat = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat || chat.isGroupChat) {
    res.status(404);
    throw new Error("Chat not found");
  }

  const isMember = chat.users.some((u) => String(u._id || u) === String(req.user._id));
  if (!isMember) {
    res.status(403);
    throw new Error("Not authorized");
  }

  const otherId = chat.users
    .map((u) => u._id || u)
    .find((id) => String(id) !== String(req.user._id));
  if (!otherId) {
    res.status(400);
    throw new Error("Invalid chat participants");
  }

  const reqDoc = await MessageRequest.findOne({
    from: otherId,
    to: req.user._id,
    status: "pending",
  });

  if (!reqDoc) {
    res.status(404);
    throw new Error("No pending message request to decline");
  }

  reqDoc.status = "declined";
  if (!reqDoc.chat) reqDoc.chat = chat._id;
  await reqDoc.save();

  await setChatDeclined(chat._id, req.user._id);
  const populated = await getPopulatedChatById(chat._id);

  emitRequestDeclined(req, {
    senderId: otherId,
    chatId: chat._id,
    declinedByUserId: req.user._id,
  });

  res.json({
    message: "Request declined",
    request: reqDoc,
    chat: populated,
  });
});

const undoDeclineChat = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat || chat.isGroupChat) {
    res.status(404);
    throw new Error("Chat not found");
  }

  const isMember = chat.users.some((u) => String(u._id || u) === String(req.user._id));
  if (!isMember) {
    res.status(403);
    throw new Error("Not authorized");
  }

  if (chat.status !== "declined") {
    return res.status(400).json({ message: "Chat is not in declined state" });
  }

  if (chat.isFinalDecline) {
    return res.status(400).json({ message: "Decline was finalized; undo is no longer available" });
  }

  if (String(chat.declinedByUser || "") !== String(req.user._id)) {
    return res.status(403).json({ message: "Only the user who declined can undo" });
  }

  if (!chat.declinedAt) {
    return res.status(400).json({ message: "Undo window expired" });
  }

  const diffMinutes = (Date.now() - new Date(chat.declinedAt).getTime()) / (1000 * 60);
  if (diffMinutes > UNDO_DECLINE_MINUTES) {
    return res.status(400).json({ message: "Undo window expired" });
  }

  const otherId = chat.users
    .map((u) => u._id || u)
    .find((id) => String(id) !== String(req.user._id));

  const mr = await MessageRequest.findOne({
    from: otherId,
    to: req.user._id,
    status: "declined",
  }).sort({ updatedAt: -1 });

  if (mr) {
    mr.status = "pending";
    await mr.save();
  }

  await Chat.findByIdAndUpdate(chat._id, {
    status: "pending",
    declinedAt: null,
    declinedByUser: null,
  });

  const populated = await getPopulatedChatById(chat._id);

  res.json({
    message: "Decline undone — accept or decline the request again",
    chat: populated,
  });
});

const finalizeDeclineChat = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat || chat.isGroupChat) {
    res.status(404);
    throw new Error("Chat not found");
  }

  const isMember = chat.users.some((u) => String(u._id || u) === String(req.user._id));
  if (!isMember) {
    res.status(403);
    throw new Error("Not authorized");
  }

  if (chat.status !== "declined") {
    return res.status(400).json({ message: "Chat is not in declined state" });
  }

  if (String(chat.declinedByUser || "") !== String(req.user._id)) {
    return res.status(403).json({ message: "Only the user who declined can finalize" });
  }

  if (chat.isFinalDecline) {
    return res.status(400).json({ message: "Decline is already finalized" });
  }

  chat.isFinalDecline = true;
  await chat.save();

  const populated = await getPopulatedChatById(chat._id);
  res.json({ message: "Decline finalized", chat: populated });
});

module.exports = {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
  deleteChat,
  declineChat,
  undoDeclineChat,
  finalizeDeclineChat,
};
