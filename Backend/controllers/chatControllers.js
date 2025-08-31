const asyncHandler = require("express-async-handler");
const Chat = require("../Models/chatModel");
const User = require("../Models/userModel");

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

  if (chat) return res.json(chat);

  // Otherwise create a new chat
  try {
    const chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    const createdChat = await Chat.create(chatData);

    const fullChat = await Chat.findById(createdChat._id)
      .populate("users", "-password");

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
      { $addToSet: { users: userId } }, // prevents duplicates
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

module.exports = {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
};
