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
    },
    {
        timestamps: true,
    }
);

const Chat = mongoose.model("Chat", chatModel);

module.exports = Chat;