// socket/index.js
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

const setupSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.role === 'employee') {
        const { data: employee } = await supabase
          .from('employees')
          .select('employee_id, name, department')
          .eq('employee_id', decoded.id)
          .single();

        if (employee) {
          socket.user = {
            id: employee.employee_id,
            name: employee.name,
            department: employee.department
          };
        }
      }
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.user?.id} connected`);

    // Join user to their personal room
    socket.join(`user-${socket.user.id}`);

    // Handle joining chat rooms
    socket.on('join-chats', (chatIds) => {
      chatIds.forEach(chatId => {
        socket.join(`chat-${chatId}`);
      });
    });

    // Handle new message
    socket.on('send-message', async (data) => {
      try {
        const { chatId, content, contentType = 'text', fileUrl } = data;

        // Save message to database
        const { data: message, error } = await supabase
          .from('messages')
          .insert([
            {
              chat_id: chatId,
              sender_id: socket.user.id,
              content,
              content_type: contentType,
              file_url: fileUrl,
              created_at: new Date().toISOString()
            }
          ])
          .select(`
            id,
            content,
            content_type,
            file_url,
            created_at,
            sender:sender_id (
              employee_id,
              name,
              department,
              image_url
            )
          `)
          .single();

        if (!error && message) {
          // Update chat's updated_at
          await supabase
            .from('chats')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', chatId);

          // Get all participants in this chat
          const { data: participants } = await supabase
            .from('chat_participants')
            .select('employee_id')
            .eq('chat_id', chatId);

          // Emit to all users in the chat
          io.to(`chat-${chatId}`).emit('new-message', message);

          // Send notifications to participants (except sender)
          participants?.forEach(p => {
            if (p.employee_id !== socket.user.id) {
              io.to(`user-${p.employee_id}`).emit('unread-update', {
                chatId,
                message: 'You have a new message'
              });
            }
          });
        }
      } catch (error) {
        console.error('Socket message error:', error);
      }
    });

    // Handle typing status
    socket.on('typing', ({ chatId, isTyping }) => {
      socket.to(`chat-${chatId}`).emit('user-typing', {
        userId: socket.user.id,
        name: socket.user.name,
        isTyping
      });
    });

    // Handle read receipts
    socket.on('mark-read', async ({ chatId }) => {
      try {
        // Get unread messages
        const { data: messages } = await supabase
          .from('messages')
          .select('id')
          .eq('chat_id', chatId)
          .neq('sender_id', socket.user.id);

        if (messages && messages.length > 0) {
          const messageIds = messages.map(m => m.id);

          // Mark as read
          const readEntries = messageIds.map(msgId => ({
            message_id: msgId,
            employee_id: socket.user.id
          }));

          await supabase
            .from('message_reads')
            .upsert(readEntries, { onConflict: 'message_id,employee_id' });
        }
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.user?.id} disconnected`);
    });
  });
};

module.exports = setupSocket;