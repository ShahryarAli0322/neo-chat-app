const mongoose = require("mongoose");

const messageRequestSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" }, 
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
    // Only the SENDER (from) gets to send ONE message before acceptance.
    preMessageUsed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Help prevent duplicates from the same sender to the same receiver while pending
messageRequestSchema.index({ from: 1, to: 1, status: 1 });

module.exports = mongoose.model("MessageRequest", messageRequestSchema);
