const User = require('../models/User');
const ServiceProvider = require('../models/ServiceProvider')
const Booking = require('../models/Bookings')
const Chat = require('../models/Chats')
const Conversation = require('../models/Conversation')
const mongoose = require('mongoose');
const { notify } = require('../utils/notify');

const deleteConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({ message: 'Invalid or missing conversation ID' });
        }

        await Conversation.findByIdAndDelete(conversationId);
        await Chat.deleteMany({ conversationId: new mongoose.Types.ObjectId(conversationId) });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

const createChat = async (req, res) => {
    try {
        const { senderId, receiverId, message, attachment, context } = req.body;

        if (!senderId || !receiverId) {
            return res.status(400).json({ message: 'Missing required fields: senderId and receiverId' });
        }
        if (!context || !mongoose.Types.ObjectId.isValid(context)) {
            return res.status(400).json({ message: 'Invalid or missing booking ID' });
        }

        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] },
            context: context,
        });

        const wasNewConversation = !conversation;

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, receiverId],
                context: context,
                lastMessage: message || null,
                lastMessageAt: message ? new Date() : null,
                unreadCount: new Map([[receiverId.toString(), message ? 1 : 0]])
            });
        } else if (message) {
            conversation.lastMessage = message;
            conversation.lastMessageAt = new Date();
            const currentUnread = conversation.unreadCount.get(receiverId.toString()) || 0;
            conversation.unreadCount.set(receiverId.toString(), currentUnread + 1);
            await conversation.save();
        }

        let chat = null;
        if (message) {
            chat = await Chat.create({
                conversationId: conversation._id,
                senderId,
                message,
                attachment,
            });
        }

        // --- Live socket updates ---
        const io = req.app.get('io');
        if (io) {
            const senderRoom = senderId.toString();
            const receiverRoom = receiverId.toString();

            if (wasNewConversation) {
                const conversationPayload = conversation.toObject ? conversation.toObject() : conversation;
                io.to(senderRoom).to(receiverRoom).emit('new_conversation', conversationPayload);
            }

            if (chat) {
                io.to(senderRoom).to(receiverRoom).emit('receive_message', {
                    ...chat.toObject(),
                    conversationId: conversation._id
                });
            }
        }

        // --- Bell notification for the receiver (only when a real message was sent) ---
        if (chat) {
            try {
                const sender = await User.findById(senderId).select('firstName lastName').lean();
                const senderName =
                    [sender?.firstName, sender?.lastName].filter(Boolean).join(' ') || 'Someone';
                const preview = message.length > 80 ? `${message.slice(0, 80)}...` : message;

                await notify({
                    userId: receiverId,
                    type: 'message',
                    title: `New message from ${senderName}`,
                    message: preview,
                    link: '/messages',
                });
            } catch (notifyErr) {
                console.error('Message notification failed:', notifyErr.message);
            }
        }

        res.status(201).json({
            success: true,
            data: { chat, conversation }
        });

    } catch (error) {
        console.error('Error creating chat:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const fetchParticipantDetails = async (req, res) => {
    try {
        const { participants } = req.body;

        if (!participants || !Array.isArray(participants)) {
            return res.status(400).json({
                message: 'Invalid participants data provided'
            });
        }

        const chatParticipants = await User.find(
            { _id: { $in: participants } },
            'name email profilePicture'
        );

        if (!chatParticipants.length) {
            return res.status(404).json({
                message: 'No participants found'
            });
        }

        return res.status(200).json({
            message: 'Successfully fetched the details of participants',
            data: chatParticipants
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            message: 'Error fetching participants',
            error: error.message
        });
    }
}

const getMessagesByConversation = async (req, res) => {
    try {
        const { chatId } = req.body;

        const chats = await Chat.find({ conversationId: chatId })
            .lean();

        res.status(200).json({
            success: true,
            data: chats
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching messages'
        });
    }
};

const fetchAllConversations = async (req, res) => {
    try {
        const { userId } = req.body
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const conversations = await Conversation.find({
            participants: userId
        })
            .sort({ lastMessageAt: -1 }) // Sort by most recent message
            .populate('participants', 'name profilePicture') // Populate basic user info
            .lean();

        if (!conversations || conversations.length === 0) {
            return res.status(400).json({ message: 'No conversations found' });
        }

        const conversationsWithUnread = conversations.map(conv => {
            const unreadCount = conv.unreadCount instanceof Map ? conv.unreadCount.get(userId.toString()) : 0;
            return {
                ...conv,
                unreadCount: unreadCount || 0,
            };
        });

        // Fetch last-message context for ALL conversations, not just the first one,
        // so the conversation list can show a preview for every thread.
        const conversationIds = conversations.map(c => c._id);
        const chats = await Chat.find({ conversationId: { $in: conversationIds } })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            data: { conversations: conversationsWithUnread, chats: chats }
        });

    } catch (error) {
        console.log(error.stack)
        return res.status(500).json({
            message: "error fetching conversations",
            error: error.message
        })
    }
}

module.exports = { createChat, fetchAllConversations, getMessagesByConversation, deleteConversation, fetchParticipantDetails };