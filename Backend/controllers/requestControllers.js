const asyncHandler = require("express-async-handler");
const MessageRequest = require("../Models/messageRequestModel");


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
  await reqDoc.save();

  res.json({ message: "Request accepted", request: reqDoc });
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
  await reqDoc.save();

  res.json({ message: "Request declined", request: reqDoc });
});

module.exports = {
  getIncomingRequests,
  getSentRequests,
  acceptRequest,
  declineRequest,
};
