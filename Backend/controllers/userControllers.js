const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const User = require("../Models/userModel");
const generateToken = require("../config/generateToken");
const sendEmail = require("../utils/sendEmail");

const registerUser = asyncHandler(async (req, res) => {
  let { name, email, password, pic } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please enter all fields");
  }

  email = String(email).trim().toLowerCase();

  
  if (typeof pic === "string") {
    pic = pic.trim();
    if (!pic) pic = undefined;
  } else {
    pic = undefined;
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");

  const user = await User.create({
    name,
    email,
    password,
    pic, // will fall back to schema default if undefined
    verificationToken,
  });

  if (!user) {
    res.status(400);
    throw new Error("Failed to create the user");
  }

  const verifyUrl = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;
  await sendEmail({
    email: user.email,
    subject: "Email Verification",
    message: `
      <h3>Hi ${user.name},</h3>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verifyUrl}" target="_blank" rel="noopener">Verify Email</a>
      <p>Thank you!</p>
    `,
  });

  // Keep verification-first flow, but echo stored avatar so UI can confirm
  res.status(201).json({
    message:
      "User registered. Please check your inbox to verify your email address.",
    pic: user.pic,
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const user = await User.findOne({ verificationToken: token });
  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired verification token");
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  await user.save();

  res.json({ message: "Email verified successfully. You can now log in." });
});

const resendVerificationEmail = asyncHandler(async (req, res) => {
  let { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  email = String(email).trim().toLowerCase();

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error("User not found with this email");
  }

  if (user.isVerified) {
    res.status(400);
    throw new Error("Email is already verified");
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  user.verificationToken = verificationToken;
  await user.save();

  const verifyUrl = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;
  await sendEmail({
    email: user.email,
    subject: "Resend Email Verification",
    message: `
      <h3>Hi ${user.name},</h3>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verifyUrl}" target="_blank" rel="noopener">Verify Email</a>
      <p>Thank you!</p>
    `,
  });

  res.json({
    message: "Verification email resent successfully. Please check your inbox.",
  });
});

const authUser = asyncHandler(async (req, res) => {
  let { email, password } = req.body;

  email = String(email).trim().toLowerCase();

  const user = await User.findOne({ email });
  if (!user) {
    res.status(401);
    throw new Error("Invalid Email or Password");
  }

  if (!user.isVerified) {
    res.status(401);
    throw new Error("Please verify your email before logging in");
  }

  const passwordOk = await user.matchPassword(password);
  if (!passwordOk) {
    res.status(401);
    throw new Error("Invalid Email or Password");
  }

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    pic: user.pic,
    bio: user.bio,
    token: generateToken(user._id),
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  let { email } = req.body;

  email = String(email).trim().toLowerCase();

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error("User not found with this email");
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 mins
  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  await sendEmail({
    email: user.email,
    subject: "Password Reset Request",
    message: `
      <h3>Hi ${user.name},</h3>
      <p>You requested to reset your password. Click the link below to reset it:</p>
      <a href="${resetUrl}" target="_blank" rel="noopener">Reset Password</a>
      <p><b>Note:</b> This link will expire in 10 minutes.</p>
    `,
  });

  res.json({ message: "Password reset email sent successfully" });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired reset token");
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.json({ message: "Password reset successful. You can now log in." });
});

const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const { name, bio, pic, currentPassword, newPassword } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (newPassword) {
    if (!currentPassword) {
      res.status(400);
      throw new Error("Current password is required to set a new password");
    }
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      res.status(400);
      throw new Error("Current password is incorrect");
    }
    user.password = newPassword;
  }

  if (typeof name === "string" && name.trim().length) user.name = name.trim();
  if (typeof bio === "string") user.bio = bio;
  if (typeof pic === "string" && pic.trim().length) user.pic = pic.trim();

  const saved = await user.save();

  res.json({
    _id: saved._id,
    name: saved.name,
    email: saved.email,
    pic: saved.pic,
    bio: saved.bio,
    message: "Profile updated successfully",
  });
});

/* -------------------- GET ALL USERS (search) -------------------- */
const allUsers = asyncHandler(async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};

  const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
  res.send(users);
});

module.exports = {
  registerUser,
  verifyEmail,
  resendVerificationEmail,
  authUser,
  forgotPassword,
  resetPassword,
  updateProfile,
  allUsers,
};
