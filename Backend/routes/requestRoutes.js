const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getIncomingRequests,
  getSentRequests,
  acceptRequest,
  declineRequest,
} = require("../controllers/requestControllers");

const router = express.Router();

router.get("/", protect, getIncomingRequests);        
router.get("/sent", protect, getSentRequests);        
router.post("/:id/accept", protect, acceptRequest);   
router.post("/:id/decline", protect, declineRequest); 

module.exports = router;
