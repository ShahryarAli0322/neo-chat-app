const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  sendMessage,
  allMessages,
  addReaction,
  removeReaction,
} = require("../controllers/messageControllers"); 

const router = express.Router();

router.route("/:chatId").get(protect, allMessages);
router.route("/").post(protect, sendMessage);
router.post("/reaction", protect, addReaction);
router.delete("/reaction", protect, removeReaction);

module.exports = router;
