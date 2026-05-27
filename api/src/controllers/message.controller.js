// controllers/message.controller.js
const { supabase } = require('../config/supabase');

/**
 * @desc    Send a message
 * @route   POST /api/v1/messages
 * @access  Private
 */
const sendMessage = async (req, res) => {
  try {
    const { chatId, content, contentType = 'text', fileUrl } = req.body;
    const senderId = req.user.id;

    console.log(`📤 Sending message to chat ${chatId} from user ${senderId}`);

    // Verify user is part of this chat
    const { data: participant, error: participantError } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('chat_id', chatId)
      .eq('employee_id', senderId)
      .maybeSingle();

    if (!participant) {
      console.log(`❌ User ${senderId} not in chat ${chatId}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Create message
    const { data: message, error } = await supabase
      .from('messages')
      .insert([
        {
          chat_id: chatId,
          sender_id: senderId,
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

    if (error) {
      console.error('❌ Error creating message:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send message'
      });
    }

    console.log(`✅ Message created with ID: ${message.id}`);

    // Update chat's updated_at
    await supabase
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chatId);

    // Get all participants in this chat
    const { data: participants, error: partError } = await supabase
      .from('chat_participants')
      .select('employee_id')
      .eq('chat_id', chatId);

    console.log(`👥 Chat participants:`, participants?.map(p => p.employee_id));

    // Trigger Pusher events
    const pusher = req.pusher;
    if (pusher && !partError) {
      console.log(`🔔 Triggering Pusher events for chat ${chatId}`);
      
      // Send to chat channel
      pusher.trigger(`private-chat-${chatId}`, 'new-message', {
        message
      });
      console.log(`✅ Sent new-message event to chat channel`);

      // Send notifications to participants (except sender)
      participants?.forEach(p => {
        if (p.employee_id !== senderId) {
          console.log(`📱 Sending unread-update to user ${p.employee_id}`);
          
          pusher.trigger(`private-user-${p.employee_id}`, 'unread-update', {
            chatId,
            unreadCount: 1
          });
          
          // Also trigger notification for tab badge
          pusher.trigger(`private-user-${p.employee_id}`, 'notification', {
            type: 'message',
            title: 'New Message',
            body: `${message.sender.name}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
            data: {
              chatId,
              messageId: message.id
            }
          });
        }
      });
    } else {
      console.log('⚠️ Pusher not available or no participants');
    }

    res.json({
      success: true,
      message
    });

  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Mark messages as read
 * @route   POST /api/v1/messages/read/:chatId
 * @access  Private
 */
const markAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const employeeId = req.user.id;

    console.log(`📝 Marking messages as read for chat ${chatId} by user ${employeeId}`);

    // Get unread message ids
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id')
      .eq('chat_id', chatId)
      .neq('sender_id', employeeId);

    if (msgError) {
      console.error('❌ Error fetching messages:', msgError);
      return res.status(500).json({
        success: false,
        message: 'Failed to mark messages as read'
      });
    }

    if (!messages || messages.length === 0) {
      console.log('📭 No messages to mark as read');
      return res.json({ success: true });
    }

    const messageIds = messages.map(m => m.id);
    console.log(`📨 Found ${messageIds.length} messages to check for read status`);

    // Try to insert read receipts, handle if table doesn't exist
    try {
      const readEntries = messageIds.map(msgId => ({
        message_id: msgId,
        employee_id: employeeId
      }));

      const { error: insertError } = await supabase
        .from('message_reads')
        .upsert(readEntries, { onConflict: 'message_id,employee_id' });

      if (insertError) {
        console.error('❌ Error inserting read receipts:', insertError);
        // If error is because table doesn't exist, we'll just return success
        // since we can't mark as read without the table
        if (insertError.message.includes('relation "message_reads" does not exist')) {
          console.log('⚠️ message_reads table does not exist, skipping read receipt');
          return res.json({ success: true });
        }
      } else {
        console.log(`✅ Marked ${messageIds.length} messages as read`);
      }
    } catch (err) {
      console.error('❌ Error in read receipt insertion:', err);
    }

    res.json({ success: true });

  } catch (error) {
    console.error('❌ Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  sendMessage,
  markAsRead
};