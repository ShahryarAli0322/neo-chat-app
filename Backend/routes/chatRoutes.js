const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { 
  accessChat, 
  fetchChats, 
  createGroupChat, 
  renameGroup, 
  addToGroup, 
  removeFromGroup 
} = require("../controllers/chatControllers");

const router = express.Router();

// One-on-one chat and fetch chats
router.route("/")
  .post(protect, accessChat)
  .get(protect, fetchChats);

// Group chat management
router.route("/group").post(protect, createGroupChat);
router.route("/rename").put(protect, renameGroup);
router.route("/group/add").put(protect, addToGroup);
router.route("/group/remove").put(protect, removeFromGroup);

module.exports = router;
