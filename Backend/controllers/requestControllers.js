const asyncHandler = require("express-async-handler");
const MessageRequest = require("../Models/messageRequestModel");
const {
  resolveDirectChatId,
  setChatDeclined,
  clearChatDecline,
  getPopulatedChatById,
} = require("../utils/syncChatRequestState");


const getIncomingRequests = asyncHandler(async (req, res) => {
  const requests = await MessageRequest.find({ to: req.user._id, status: "pending" })
    .populate("from", "name email pic")
    .sort({ createdAt: -1 });
  res.json(requests);
});


const getSentRequests = asyncHandler(async (req, res) => {
  const requests = await MessageRequest.find({ from: req.user._id, status: "pending" })
    .populate("to", "name email pic")
    .sort({ createdAt: -1 });
  res.json(requests);
});


const acceptRequest = asyncHandler(async (req, res) => {
  const reqDoc = await MessageRequest.findOne({
    _id: req.params.id,
    to: req.user._id,
    status: "pending",
  });

  if (!reqDoc) {
    res.status(404);
    throw new Error("Request not found or already handled");
  }

  reqDoc.status = "accepted";
  if (!reqDoc.chat) {
    const cid = await resolveDirectChatId(reqDoc.from, reqDoc.to, null);
    if (cid) reqDoc.chat = cid;
  }
  await reqDoc.save();

  const chatId = await resolveDirectChatId(reqDoc.from, reqDoc.to, reqDoc.chat);
  await clearChatDecline(chatId);
  const chat = await getPopulatedChatById(chatId);

  res.json({ message: "Request accepted", request: reqDoc, chat });
});

const declineRequest = asyncHandler(async (req, res) => {
  const reqDoc = await MessageRequest.findOne({
    _id: req.params.id,
    to: req.user._id,
    status: "pending",
  });

  if (!reqDoc) {
    res.status(404);
    throw new Error("Request not found or already handled");
  }

  reqDoc.status = "declined";
  if (!reqDoc.chat) {
    const cid = await resolveDirectChatId(reqDoc.from, reqDoc.to, null);
    if (cid) reqDoc.chat = cid;
  }
  await reqDoc.save();

  const chatId = await resolveDirectChatId(reqDoc.from, reqDoc.to, reqDoc.chat);
  await setChatDeclined(chatId, req.user._id);
  const chat = await getPopulatedChatById(chatId);

  res.json({ message: "Request declined", request: reqDoc, chat });
});

module.exports = {
  getIncomingRequests,
  getSentRequests,
  acceptRequest,
  declineRequest,
};
