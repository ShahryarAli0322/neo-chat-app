const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  sendMessage,
  allMessages,
  addReaction,
  removeReaction,
  deleteMessage,
} = require("../controllers/messageControllers"); 

const router = express.Router();

router.route("/:chatId").get(protect, allMessages);
router.route("/").post(protect, sendMessage);
router.post("/reaction", protect, addReaction);
router.delete("/reaction", protect, removeReaction);
router.delete("/:id", protect, deleteMessage);

module.exports = router;
