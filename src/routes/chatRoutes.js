const express = require('express');
const router = express.Router()
const {createChat, fetchAllConversations, getMessagesByConversation, deleteConversation, fetchParticipantDetails} = require('../controllers/chatController')

router.post('/send-message', createChat)
router.post('/get-chats', fetchAllConversations)
// routes/chatRoutes.js
router.post('/messages/', getMessagesByConversation);
router.delete('/delete-conversation/:conversationId', deleteConversation);
router.post('/fetch-participant-details', fetchParticipantDetails)

module.exports = router; 