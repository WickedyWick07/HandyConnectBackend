const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true, // Links the message to a specific conversation
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true, // ID of the message sender
    },
    message: {
        type: String,
        required: true,
        maxlength: 2000, // Maximum message length
    },
    attachment: {
        type: String, // URL for attachments (e.g., images, files)
        default: null,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    readAt: {
        type: Date,
        default: null, // Timestamp for when the message was read
    },
    createdAt: {
        type: Date,
        default: Date.now, // Message creation timestamp
    },
    unreadCount: {
        type: Map,
        of: Number,
        default: new Map()
    }
});

// Add an index for faster queries
ChatSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('Chat', ChatSchema);
