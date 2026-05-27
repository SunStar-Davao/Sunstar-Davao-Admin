// routes/chat.routes.js
const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const {
  getChats,
  getUnreadCount,
  createPersonalChat,
  getDepartmentChats,
  initializeChats,
  getChatMessages
} = require('../controllers/chat.controller');

// All chat routes require authentication
router.use(authenticateToken);

// Get all chats for user
router.get('/', getChats);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Get messages for a specific chat
router.get('/:chatId/messages', getChatMessages);

// Create personal chat (admin only)
router.post('/personal', authorizeAdmin, createPersonalChat);

// Get department chats
router.get('/department/:department', getDepartmentChats);

// Initialize default chats (admin only - run once)
router.post('/initialize', authorizeAdmin, initializeChats);

module.exports = router;