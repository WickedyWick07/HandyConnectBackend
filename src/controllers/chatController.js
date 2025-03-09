const User = require('../models/User');
const ServiceProvider = require('../models/ServiceProvider')
const Booking = require('../models/Bookings')
const Chat = require('../models/Chats')
const Conversation = require('../models/Conversation')
const mongoose = require('mongoose');

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

        // Ensure senderId and receiverId are included in the conversation query
        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] },
            context: context, // Directly match the string
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, receiverId],
                context:context, // Ensure proper structure
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

            const io = req.app.get('io');
            if (io) {
                io.to(receiverId).emit('receive_message', {
                    ...chat.toObject(),
                    conversationId: conversation._id
                });
            }
        }

        res.status(201).json({
            success: true,
            data: {
                chat,
                conversation
            }
        });

    } catch (error) {
        console.error('Error creating chat:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const fetchParticipantDetails = async (req, res) => {
    try {
        const { participants } = req.body;
        console.log('Participant IDs:', participants);
        
        if (!participants || !Array.isArray(participants)) {
            return res.status(400).json({
                message: 'Invalid participants data provided'
            });
        }

        // Add await here and select specific fields you need
        const chatParticipants = await User.find(
            { _id: { $in: participants } },
            'name email profilePicture' // Add or modify fields as needed
        );

        if (!chatParticipants.length) {
            return res.status(404).json({
                message: 'No participants found'
            });
        }

        console.log('Chat participants found:', chatParticipants);
        
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

            console.log(chats.message); // Logs all conversation IDs in the fetched messages
            
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
        const {userId} = req.body 
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
    
        const conversations = await Conversation.find({
            participants: userId
        })
        .sort({ lastMessageAt: -1 }) // Sort by most recent message
        .populate('participants', 'name profilePicture') // Populate basic user info
        .lean();
        
        if(!conversations || conversations.length === 0){
            return res.status(400).json({message: 'No conversations found'})
        }
        const conversationsWithUnread = conversations.map(conv => {
            const unreadCount = conv.unreadCount instanceof Map ? conv.unreadCount.get(userId.toString()) : 0;
            return {
                ...conv,
                unreadCount: unreadCount || 0,
            };
        });
        
        const chats = await Chat.find({conversationId: conversations[0]._id})
        console.log('Conversations:', conversationsWithUnread); // Debugging
        console.log('Chats for first conversation:', chats);


     res.status(200).json({
            success: true,
            data:{ conversations: conversationsWithUnread, chats:chats}
        });
        
    } catch (error) {
        console.log(error.stack)
        return res.status(500).json({
            message:"error fetching conversations",
            error: error.message
        
        })
}}





 module.exports = { createChat, fetchAllConversations, getMessagesByConversation, deleteConversation, fetchParticipantDetails };