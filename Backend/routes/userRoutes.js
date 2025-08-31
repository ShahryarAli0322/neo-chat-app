const express = require("express");
const {
  registerUser,
  verifyEmail,
  authUser,
  forgotPassword,
  resetPassword,
  allUsers,
  resendVerificationEmail,
  updateProfile, // ➜ added
} = require("../controllers/userControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// REGISTER
router.post("/", registerUser);

// LOGIN
router.post("/login", authUser);

// EMAIL VERIFICATION
router.get("/verify/:token", verifyEmail);

// RESEND VERIFICATION EMAIL
router.post("/resend-verification", resendVerificationEmail);

// FORGOT PASSWORD (send reset link)
router.post("/forgot-password", forgotPassword);

// RESET PASSWORD
router.post("/reset-password/:token", resetPassword);

// UPDATE PROFILE (name/bio/pic/password) — protected
router.put("/profile", protect, updateProfile);

// SEARCH USERS — protected (note: same base path as register but different method)
router.get("/", protect, allUsers);

module.exports = router;
