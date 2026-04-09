// chatname
// isGroupChat
// users
// latestMessage
// groupAdmin

const mongoose = require('mongoose')

const chatModel = mongoose.Schema(
    {
        chatName: { type: String, trim: true },
        isGroupChat: { type: Boolean, default: false },
        users: [ 
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        latestMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
        },
        groupAdmin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        // 1:1 message-request UX (ignored for group chats; defaults keep legacy chats working)
        status: {
            type: String,
            enum: ["pending", "accepted", "declined"],
            default: "accepted",
        },
        declinedAt: { type: Date, default: null },
        declinedByUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        isFinalDecline: { type: Boolean, default: false },
        // Soft-hide chat for specific users (still in DB; other members unaffected)
        deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        // After a user removes a chat, only messages created after this time are shown to them (fresh thread UX)
        perUserMessageCutoff: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
                after: { type: Date, required: true },
            },
        ],
    },
    {
        timestamps: true,
    }
);

const Chat = mongoose.model("Chat", chatModel);

module.exports = Chat;