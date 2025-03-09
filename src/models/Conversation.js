const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    participants: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true, // Array of users in the conversation
        },
    ],
    lastMessage: {
        type: String,
        default: '', // Stores the latest message for quick preview
    },
    context:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking', 
        required: true// Booking ID
    },
    lastMessageAt: {
        type: Date,
        default: Date.now, // Timestamp of the latest message
    },
    unreadCount: {
        type: Map, // A map to store unread message counts per user
        of: Number,
        default: {}, // Example: { "userId1": 3, "userId2": 0 }
    },
    createdAt: {
        type: Date,
        default: Date.now, // When the conversation was created
    },
    isGroupChat: {
        type: Boolean,
        default: false, // Flag for group chats
    },
    groupName: {
        type: String,
        default: null, // Name of the group chat (if applicable)
    },
    groupImage: {
        type: String,
        default: null, // URL of the group image
    },
});

// Add an index for frequently queried fields
ConversationSchema.index({ participants: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
