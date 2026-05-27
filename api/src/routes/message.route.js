// routes/message.routes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  sendMessage,
  markAsRead
} = require('../controllers/message.controller');

// All message routes require authentication
router.use(authenticateToken);

// Send a message
router.post('/', sendMessage);

// Mark messages as read
router.post('/read/:chatId', markAsRead);

module.exports = router;