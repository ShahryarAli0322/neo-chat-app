const Chat = require("../Models/chatModel");
const User = require("../Models/userModel");

async function resolveDirectChatId(fromId, toId, hintChatId) {
  if (hintChatId) return hintChatId;
  const c = await Chat.findOne({
    isGroupChat: false,
    users: { $all: [fromId, toId] },
  })
    .select("_id")
    .lean();
  return c?._id || null;
}

async function setChatDeclined(chatId, declinedByUserId) {
  if (!chatId) return;
  await Chat.findByIdAndUpdate(chatId, {
    status: "declined",
    declinedAt: new Date(),
    declinedByUser: declinedByUserId,
    isFinalDecline: false,
  });
}

async function clearChatDecline(chatId) {
  if (!chatId) return;
  await Chat.findByIdAndUpdate(chatId, {
    status: "accepted",
    declinedAt: null,
    declinedByUser: null,
    isFinalDecline: false,
  });
}

async function getPopulatedChatById(chatId) {
  if (!chatId) return null;
  let chat = await Chat.findById(chatId)
    .populate("users", "-password")
    .populate("groupAdmin", "-password")
    .populate("latestMessage");
  if (!chat) return null;
  chat = await User.populate(chat, {
    path: "latestMessage.sender",
    select: "name pic email",
  });
  return chat;
}

module.exports = {
  resolveDirectChatId,
  setChatDeclined,
  clearChatDecline,
  getPopulatedChatById,
};
