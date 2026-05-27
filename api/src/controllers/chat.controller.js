// // controllers/chat.controller.js
// const { supabase } = require('../config/supabase');

// /**
//  * @desc    Get all chats for a user with unread counts
//  * @route   GET /api/v1/chats
//  * @access  Private
//  */
// const getChats = async (req, res) => {
//   try {
//     const employeeId = req.user.id;

//     // Get all chats where user is a participant
//     const { data: participantChats, error: participantError } = await supabase
//       .from('chat_participants')
//       .select(`
//         chat_id,
//         chats:chat_id (
//           id,
//           name,
//           type,
//           department,
//           created_at,
//           updated_at
//         )
//       `)
//       .eq('employee_id', employeeId);

//     if (participantError) {
//       console.error('Error fetching participant chats:', participantError);
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to fetch chats'
//       });
//     }

//     if (!participantChats || participantChats.length === 0) {
//       return res.json({
//         success: true,
//         chats: []
//       });
//     }

//     // Get details for each chat
//     const chats = await Promise.all(
//       participantChats.map(async (item) => {
//         const chat = item.chats;
        
//         // Get last message
//         const { data: lastMessage, error: lastMsgError } = await supabase
//           .from('messages')
//           .select(`
//             id,
//             content,
//             content_type,
//             file_url,
//             created_at,
//             sender:sender_id (
//               employee_id,
//               name,
//               department
//             )
//           `)
//           .eq('chat_id', chat.id)
//           .order('created_at', { ascending: false })
//           .limit(1)
//           .maybeSingle();

//         // Get unread count for this chat
//         const { count: unreadCount, error: countError } = await supabase
//           .from('messages')
//           .select('id', { count: 'exact', head: true })
//           .eq('chat_id', chat.id)
//           .neq('sender_id', employeeId)
//           .not('id', 'in', (
//             supabase
//               .from('message_reads')
//               .select('message_id')
//               .eq('employee_id', employeeId)
//           ));

//         // Get total participants
//         const { count: participantsCount, error: partCountError } = await supabase
//           .from('chat_participants')
//           .select('id', { count: 'exact', head: true })
//           .eq('chat_id', chat.id);

//         return {
//           id: chat.id,
//           name: chat.name,
//           type: chat.type,
//           department: chat.department,
//           createdAt: chat.created_at,
//           updatedAt: chat.updated_at,
//           lastMessage: lastMessage || null,
//           unreadCount: unreadCount || 0,
//           participantsCount: participantsCount || 0
//         };
//       })
//     );

//     // Sort by updated_at (most recent first)
//     chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

//     res.json({
//       success: true,
//       chats
//     });

//   } catch (error) {
//     console.error('Get chats error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// };

// /**
//  * @desc    Get messages for a specific chat
//  * @route   GET /api/v1/chats/:chatId/messages
//  * @access  Private
//  */
// const getChatMessages = async (req, res) => {
//   try {
//     const { chatId } = req.params;
//     const employeeId = req.user.id;

//     // Verify user is part of this chat
//     const { data: participant, error: participantError } = await supabase
//       .from('chat_participants')
//       .select('chat_id')
//       .eq('chat_id', chatId)
//       .eq('employee_id', employeeId)
//       .maybeSingle();

//     if (!participant) {
//       return res.status(403).json({
//         success: false,
//         message: 'Access denied'
//       });
//     }

//     // Get messages
//     const { data: messages, error } = await supabase
//       .from('messages')
//       .select(`
//         id,
//         content,
//         content_type,
//         file_url,
//         created_at,
//         sender:sender_id (
//           employee_id,
//           name,
//           department,
//           image_url
//         ),
//         message_reads!left (
//           employee_id,
//           read_at
//         )
//       `)
//       .eq('chat_id', chatId)
//       .order('created_at', { ascending: false })
//       .limit(50);

//     if (error) {
//       console.error('Error fetching messages:', error);
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to fetch messages'
//       });
//     }

//     // Mark messages as read
//     const unreadMessageIds = messages
//       .filter(msg => 
//         msg.sender.employee_id !== employeeId && 
//         !msg.message_reads?.some(read => read.employee_id === employeeId)
//       )
//       .map(msg => msg.id);

//     if (unreadMessageIds.length > 0) {
//       const readEntries = unreadMessageIds.map(msgId => ({
//         message_id: msgId,
//         employee_id: employeeId
//       }));

//       await supabase
//         .from('message_reads')
//         .upsert(readEntries, { onConflict: 'message_id,employee_id' });

//       // Trigger Pusher event for read receipts
//       const pusher = req.pusher;
//       if (pusher) {
//         pusher.trigger(`private-chat-${chatId}`, 'messages-read', {
//           userId: employeeId,
//           messageIds: unreadMessageIds
//         });
//       }
//     }

//     res.json({
//       success: true,
//       messages: messages.reverse()
//     });

//   } catch (error) {
//     console.error('Get messages error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// };

// /**
//  * @desc    Get total unread count for user
//  * @route   GET /api/v1/chats/unread-count
//  * @access  Private
//  */
// const getUnreadCount = async (req, res) => {
//   try {
//     const employeeId = req.user.id;

//     // Get all chats for user
//     const { data: participantChats, error: partError } = await supabase
//       .from('chat_participants')
//       .select('chat_id')
//       .eq('employee_id', employeeId);

//     if (partError) {
//       console.error('Error fetching participant chats:', partError);
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to fetch chats'
//       });
//     }

//     if (!participantChats || participantChats.length === 0) {
//       return res.json({
//         success: true,
//         totalUnread: 0,
//         chats: {}
//       });
//     }

//     const chatIds = participantChats.map(p => p.chat_id);
//     const unreadByChat = {};

//     // Get unread count for each chat
//     for (const chatId of chatIds) {
//       const { count, error } = await supabase
//         .from('messages')
//         .select('id', { count: 'exact', head: true })
//         .eq('chat_id', chatId)
//         .neq('sender_id', employeeId)
//         .not('id', 'in', (
//           supabase
//             .from('message_reads')
//             .select('message_id')
//             .eq('employee_id', employeeId)
//         ));

//       if (!error) {
//         unreadByChat[chatId] = count || 0;
//       }
//     }

//     const totalUnread = Object.values(unreadByChat).reduce((a, b) => a + b, 0);

//     res.json({
//       success: true,
//       totalUnread,
//       chats: unreadByChat
//     });

//   } catch (error) {
//     console.error('Get unread count error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// };

// /**
//  * @desc    Create a personal chat (admin to employee)
//  * @route   POST /api/v1/chats/personal
//  * @access  Private (Admin only)
//  */
// const createPersonalChat = async (req, res) => {
//   try {
//     const { employeeId } = req.body;
//     const adminId = req.user.id;

//     // Check if employee exists
//     const { data: employee, error: employeeError } = await supabase
//       .from('employees')
//       .select('employee_id, name, department')
//       .eq('employee_id', employeeId)
//       .single();

//     if (employeeError || !employee) {
//       return res.status(404).json({
//         success: false,
//         message: 'Employee not found'
//       });
//     }

//     // Check if chat already exists
//     const { data: existingChat, error: chatError } = await supabase
//       .from('chats')
//       .select(`
//         id,
//         name,
//         type,
//         created_at
//       `)
//       .eq('type', 'personal')
//       .in('id', (
//         supabase
//           .from('chat_participants')
//           .select('chat_id')
//           .eq('employee_id', adminId)
//       ))
//       .in('id', (
//         supabase
//           .from('chat_participants')
//           .select('chat_id')
//           .eq('employee_id', employeeId)
//       ))
//       .maybeSingle();

//     if (existingChat) {
//       return res.json({
//         success: true,
//         chat: existingChat,
//         message: 'Chat already exists'
//       });
//     }

//     // Create new chat
//     const { data: newChat, error: createError } = await supabase
//       .from('chats')
//       .insert([
//         {
//           name: employee.name,
//           type: 'personal',
//           created_by: adminId,
//           updated_at: new Date().toISOString()
//         }
//       ])
//       .select()
//       .single();

//     if (createError) {
//       console.error('Error creating chat:', createError);
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to create chat'
//       });
//     }

//     // Add participants
//     const participants = [
//       { chat_id: newChat.id, employee_id: adminId },
//       { chat_id: newChat.id, employee_id: employeeId }
//     ];

//     const { error: participantsError } = await supabase
//       .from('chat_participants')
//       .insert(participants);

//     if (participantsError) {
//       // Rollback chat creation
//       await supabase.from('chats').delete().eq('id', newChat.id);
      
//       console.error('Error adding participants:', participantsError);
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to add participants'
//       });
//     }

//     // Make admin an admin of the chat
//     await supabase
//       .from('chat_admins')
//       .insert({
//         chat_id: newChat.id,
//         employee_id: adminId
//       });

//     // Trigger Pusher event for new chat
//     const pusher = req.pusher;
//     if (pusher) {
//       // Notify admin
//       pusher.trigger(`private-user-${adminId}`, 'new-chat', {
//         chat: newChat
//       });

//       // Notify employee
//       pusher.trigger(`private-user-${employeeId}`, 'new-chat', {
//         chat: newChat
//       });
//     }

//     res.json({
//       success: true,
//       chat: newChat,
//       message: 'Chat created successfully'
//     });

//   } catch (error) {
//     console.error('Create personal chat error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// };

// /**
//  * @desc    Get or create department chats
//  * @route   GET /api/v1/chats/department/:department
//  * @access  Private
//  */
// const getDepartmentChats = async (req, res) => {
//   try {
//     const employeeId = req.user.id;
//     const department = req.params.department;

//     // Get or create department chat
//     let { data: departmentChat, error: deptError } = await supabase
//       .from('chats')
//       .select('*')
//       .eq('type', 'department')
//       .eq('department', department)
//       .maybeSingle();

//     if (!departmentChat && !deptError) {
//       // Create department chat
//       const { data: newChat, error } = await supabase
//         .from('chats')
//         .insert([
//           {
//             name: `${department} Department`,
//             type: 'department',
//             department: department,
//             created_by: employeeId,
//             updated_at: new Date().toISOString()
//           }
//         ])
//         .select()
//         .single();

//       if (!error) {
//         departmentChat = newChat;
        
//         // Add creator to participants
//         await supabase
//           .from('chat_participants')
//           .insert({
//             chat_id: departmentChat.id,
//             employee_id: employeeId
//           });
//       }
//     }

//     // Get or create all employees chat
//     let { data: allEmployeesChat, error: allError } = await supabase
//       .from('chats')
//       .select('*')
//       .eq('type', 'all-employees')
//       .maybeSingle();

//     if (!allEmployeesChat && !allError) {
//       const { data: newChat, error } = await supabase
//         .from('chats')
//         .insert([
//           {
//             name: 'All Employees',
//             type: 'all-employees',
//             created_by: employeeId,
//             updated_at: new Date().toISOString()
//           }
//         ])
//         .select()
//         .single();

//       if (!error) {
//         allEmployeesChat = newChat;
        
//         // Add creator to participants
//         await supabase
//           .from('chat_participants')
//           .insert({
//             chat_id: allEmployeesChat.id,
//             employee_id: employeeId
//           });
//       }
//     }

//     res.json({
//       success: true,
//       departmentChat,
//       allEmployeesChat
//     });

//   } catch (error) {
//     console.error('Get department chats error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// };

// /**
//  * @desc    Initialize default chats (run once)
//  * @route   POST /api/v1/chats/initialize
//  * @access  Private (Admin only)
//  */
// const initializeChats = async (req, res) => {
//   try {
//     // Get all employees
//     const { data: allEmployees, error: empError } = await supabase
//       .from('employees')
//       .select('employee_id, department');

//     if (empError) {
//       console.error('Error fetching employees:', empError);
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to fetch employees'
//       });
//     }

//     // Create All Employees chat
//     const { data: allChat, error: allChatError } = await supabase
//       .from('chats')
//       .upsert([
//         {
//           name: 'All Employees',
//           type: 'all-employees',
//           created_by: req.user.id,
//           updated_at: new Date().toISOString()
//         }
//       ], { onConflict: 'type' })
//       .select()
//       .single();

//     if (allChatError) {
//       console.error('Error creating all employees chat:', allChatError);
//     }

//     // Add all employees to All Employees chat
//     if (allChat && allEmployees) {
//       const allParticipants = allEmployees.map(emp => ({
//         chat_id: allChat.id,
//         employee_id: emp.employee_id
//       }));
      
//       await supabase
//         .from('chat_participants')
//         .upsert(allParticipants, { onConflict: 'chat_id,employee_id' });
//     }

//     // Create department chats
//     const departments = ['Editorial', 'Sales', 'Marketing', 'HR', 'IT', 'Finance', 'Admin'];
    
//     for (const dept of departments) {
//       const { data: deptChat, error: deptChatError } = await supabase
//         .from('chats')
//         .upsert([
//           {
//             name: `${dept} Department`,
//             type: 'department',
//             department: dept,
//             created_by: req.user.id,
//             updated_at: new Date().toISOString()
//           }
//         ], { onConflict: 'type,department' })
//         .select()
//         .single();

//       if (deptChatError) {
//         console.error(`Error creating ${dept} chat:`, deptChatError);
//         continue;
//       }

//       // Add department employees to department chat
//       if (deptChat && allEmployees) {
//         const deptEmployees = allEmployees.filter(emp => emp.department === dept);
//         const deptParticipants = deptEmployees.map(emp => ({
//           chat_id: deptChat.id,
//           employee_id: emp.employee_id
//         }));

//         await supabase
//           .from('chat_participants')
//           .upsert(deptParticipants, { onConflict: 'chat_id,employee_id' });
//       }
//     }

//     res.json({
//       success: true,
//       message: 'Chats initialized successfully'
//     });

//   } catch (error) {
//     console.error('Initialize chats error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// };

// module.exports = {
//   getChats,
//   getUnreadCount,
//   getChatMessages,
//   createPersonalChat,
//   getDepartmentChats,
//   initializeChats
// };

// controllers/chat.controller.js
const { supabase } = require('../config/supabase');

// Helper function to ensure user is in default chats (and create them if needed)
const ensureUserInDefaultChats = async (employeeId, department) => {
  try {
    console.log(`Ensuring user ${employeeId} is in default chats...`);
    
    // === 1. ENSURE ALL EMPLOYEES CHAT EXISTS ===
    let { data: allChat, error: allError } = await supabase
      .from('chats')
      .select('*')
      .eq('type', 'all-employees')
      .maybeSingle();

    if (!allChat) {
      console.log('⚠️ All Employees chat not found, creating it now...');
      const { data: newChat, error } = await supabase
        .from('chats')
        .insert([{
          name: 'All Employees',
          type: 'all-employees',
          created_by: employeeId,
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (!error) {
        allChat = newChat;
        console.log('✅ Created All Employees chat with ID:', allChat.id);
      } else {
        console.error('❌ Failed to create All Employees chat:', error);
      }
    } else {
      console.log('✅ All Employees chat exists with ID:', allChat.id);
    }

    // Add user to All Employees chat
    if (allChat) {
      const { error: upsertError } = await supabase
        .from('chat_participants')
        .upsert({
          chat_id: allChat.id,
          employee_id: employeeId
        }, { onConflict: 'chat_id,employee_id' });

      if (!upsertError) {
        console.log(`✅ Added/confirmed user ${employeeId} in All Employees chat`);
      }
    }

    // === 2. ENSURE DEPARTMENT CHAT EXISTS ===
    if (department) {
      let { data: deptChat, error: deptError } = await supabase
        .from('chats')
        .select('*')
        .eq('type', 'department')
        .eq('department', department)
        .maybeSingle();

      if (!deptChat) {
        console.log(`⚠️ ${department} Department chat not found, creating it now...`);
        const { data: newChat, error } = await supabase
          .from('chats')
          .insert([{
            name: `${department} Department`,
            type: 'department',
            department: department,
            created_by: employeeId,
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (!error) {
          deptChat = newChat;
          console.log(`✅ Created ${department} Department chat with ID:`, deptChat.id);
        } else {
          console.error(`❌ Failed to create ${department} Department chat:`, error);
        }
      } else {
        console.log(`✅ ${department} Department chat exists with ID:`, deptChat.id);
      }

      // Add user to Department chat
      if (deptChat) {
        const { error: upsertError } = await supabase
          .from('chat_participants')
          .upsert({
            chat_id: deptChat.id,
            employee_id: employeeId
          }, { onConflict: 'chat_id,employee_id' });

        if (!upsertError) {
          console.log(`✅ Added/confirmed user ${employeeId} in ${department} Department chat`);
        }
      }
    }

    // === 3. IF WE CREATED A NEW DEPARTMENT CHAT, ADD ALL EXISTING DEPARTMENT EMPLOYEES ===
    if (department) {
      const { data: deptChat } = await supabase
        .from('chats')
        .select('id')
        .eq('type', 'department')
        .eq('department', department)
        .single();

      if (deptChat) {
        // Check if this chat has other participants
        const { count } = await supabase
          .from('chat_participants')
          .select('id', { count: 'exact', head: true })
          .eq('chat_id', deptChat.id);

        // If only 1 participant (just the current user), add all department employees
        if (count === 1) {
          console.log(`Adding all ${department} employees to newly created department chat...`);
          
          const { data: deptEmployees } = await supabase
            .from('employees')
            .select('employee_id')
            .eq('department', department);

          if (deptEmployees && deptEmployees.length > 0) {
            const deptParticipants = deptEmployees.map(emp => ({
              chat_id: deptChat.id,
              employee_id: emp.employee_id
            }));

            await supabase
              .from('chat_participants')
              .upsert(deptParticipants, { onConflict: 'chat_id,employee_id' });
            
            console.log(`✅ Added all ${deptEmployees.length} ${department} employees to department chat`);
          }
        }
      }
    }

  } catch (error) {
    console.error('Error ensuring user in default chats:', error);
  }
};

/**
 * @desc    Get all chats for a user with unread counts
 * @route   GET /api/v1/chats
 * @access  Private
 */
const getChats = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const department = req.user.department;

    console.log(`Getting chats for employee: ${employeeId}, department: ${department}`);

    // ✅ ENSURE USER IS IN DEFAULT CHATS (this will create chats if they don't exist)
    await ensureUserInDefaultChats(employeeId, department);

    // Get all chats where user is a participant
    const { data: participantChats, error: participantError } = await supabase
      .from('chat_participants')
      .select(`
        chat_id,
        chats:chat_id (
          id,
          name,
          type,
          department,
          created_at,
          updated_at
        )
      `)
      .eq('employee_id', employeeId);

    if (participantError) {
      console.error('Error fetching participant chats:', participantError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch chats'
      });
    }

    if (!participantChats || participantChats.length === 0) {
      return res.json({
        success: true,
        chats: []
      });
    }

    // Get details for each chat
    const chats = await Promise.all(
      participantChats.map(async (item) => {
        const chat = item.chats;
        
        // Get last message
        const { data: lastMessage, error: lastMsgError } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            content_type,
            file_url,
            created_at,
            sender:sender_id (
              employee_id,
              name,
              department
            )
          `)
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get unread count for this chat
        const { count: unreadCount, error: countError } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .neq('sender_id', employeeId)
          .not('id', 'in', (
            supabase
              .from('message_reads')
              .select('message_id')
              .eq('employee_id', employeeId)
          ));

        // Get total participants
        const { count: participantsCount, error: partCountError } = await supabase
          .from('chat_participants')
          .select('id', { count: 'exact', head: true })
          .eq('chat_id', chat.id);

        return {
          id: chat.id,
          name: chat.name,
          type: chat.type,
          department: chat.department,
          createdAt: chat.created_at,
          updatedAt: chat.updated_at,
          lastMessage: lastMessage || null,
          unreadCount: unreadCount || 0,
          participantsCount: participantsCount || 0
        };
      })
    );

    // Sort by updated_at (most recent first)
    chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    console.log(`Found ${chats.length} chats for employee ${employeeId}`);
    res.json({
      success: true,
      chats
    });

  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get messages for a specific chat
 * @route   GET /api/v1/chats/:chatId/messages
 * @access  Private
 */
const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const employeeId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    console.log(`📥 Fetching messages for chat ${chatId}, page ${page}, limit ${limit}`);

    // Verify user is part of this chat
    const { data: participant, error: participantError } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('chat_id', chatId)
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get total count of messages
    const { count: totalCount, error: countError } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('chat_id', chatId);

    // Get messages with pagination - ORDER BY created_at DESC to get latest first
    const { data: messages, error } = await supabase
      .from('messages')
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
        ),
        message_reads!left (
          employee_id,
          read_at
        )
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false }) // DESCENDING to get latest first
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch messages'
      });
    }

    // Mark messages as read only if they're in the current page and user requests it
    // We'll let the frontend handle marking as read via viewability

    console.log(`✅ Returning ${messages.length} messages (page ${page})`);

    res.json({
      success: true,
      messages: messages, // Keep as DESC order (latest first)
      pagination: {
        page,
        limit,
        total: totalCount,
        hasMore: offset + limit < totalCount,
        nextPage: offset + limit < totalCount ? page + 1 : null
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get total unread count for user
 * @route   GET /api/v1/chats/unread-count
 * @access  Private
 */
const getUnreadCount = async (req, res) => {
  try {
    const employeeId = req.user.id;
    console.log(`📊 Fetching unread count for employee: ${employeeId}`);

    // Get all chats for user
    const { data: participantChats, error: partError } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('employee_id', employeeId);

    if (partError) {
      console.error('❌ Error fetching participant chats:', partError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch chats'
      });
    }

    if (!participantChats || participantChats.length === 0) {
      return res.json({
        success: true,
        totalUnread: 0,
        chats: {}
      });
    }

    const chatIds = participantChats.map(p => p.chat_id);
    console.log(`📋 Found ${chatIds.length} chats for user`);

    const unreadByChat = {};

    // Get unread count for each chat
    for (const chatId of chatIds) {
      try {
        // Get all messages in this chat not sent by the current user
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('id')
          .eq('chat_id', chatId)
          .neq('sender_id', employeeId);

        if (msgError) {
          console.error(`❌ Error fetching messages for chat ${chatId}:`, msgError);
          unreadByChat[chatId] = 0;
          continue;
        }

        if (!messages || messages.length === 0) {
          unreadByChat[chatId] = 0;
          continue;
        }

        const messageIds = messages.map(m => m.id);
        
        // Check if message_reads table exists by trying a simple query
        let readMessageIds = [];
        try {
          const { data: readMessages, error: readError } = await supabase
            .from('message_reads')
            .select('message_id')
            .in('message_id', messageIds)
            .eq('employee_id', employeeId);

          if (!readError && readMessages) {
            readMessageIds = readMessages.map(r => r.message_id);
          } else {
            console.log(`⚠️ message_reads query failed, assuming all messages are unread for chat ${chatId}`);
            // If table doesn't exist, assume all messages are unread
            unreadByChat[chatId] = messages.length;
            continue;
          }
        } catch (readErr) {
          console.log(`⚠️ Error with message_reads, assuming all messages are unread for chat ${chatId}`);
          unreadByChat[chatId] = messages.length;
          continue;
        }

        const unreadCount = messages.length - readMessageIds.length;
        unreadByChat[chatId] = unreadCount;

        if (unreadCount > 0) {
          console.log(`🔴 Chat ${chatId} has ${unreadCount} unread messages`);
        }

      } catch (err) {
        console.error(`❌ Unexpected error for chat ${chatId}:`, err);
        unreadByChat[chatId] = 0;
      }
    }

    const totalUnread = Object.values(unreadByChat).reduce((a, b) => a + b, 0);
    console.log(`📊 Total unread: ${totalUnread}`);
    console.log(`📊 Unread by chat:`, unreadByChat);

    res.json({
      success: true,
      totalUnread,
      chats: unreadByChat
    });

  } catch (error) {
    console.error('❌ Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Create a personal chat (admin to employee)
 * @route   POST /api/v1/chats/personal
 * @access  Private (Admin only)
 */
const createPersonalChat = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const adminId = req.user.id;

    // Check if employee exists
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('employee_id, name, department')
      .eq('employee_id', employeeId)
      .single();

    if (employeeError || !employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if chat already exists
    const { data: existingChat, error: chatError } = await supabase
      .from('chats')
      .select(`
        id,
        name,
        type,
        created_at
      `)
      .eq('type', 'personal')
      .in('id', (
        supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('employee_id', adminId)
      ))
      .in('id', (
        supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('employee_id', employeeId)
      ))
      .maybeSingle();

    if (existingChat) {
      return res.json({
        success: true,
        chat: existingChat,
        message: 'Chat already exists'
      });
    }

    // Create new chat
    const { data: newChat, error: createError } = await supabase
      .from('chats')
      .insert([
        {
          name: employee.name,
          type: 'personal',
          created_by: adminId,
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (createError) {
      console.error('Error creating chat:', createError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create chat'
      });
    }

    // Add participants
    const participants = [
      { chat_id: newChat.id, employee_id: adminId },
      { chat_id: newChat.id, employee_id: employeeId }
    ];

    const { error: participantsError } = await supabase
      .from('chat_participants')
      .insert(participants);

    if (participantsError) {
      // Rollback chat creation
      await supabase.from('chats').delete().eq('id', newChat.id);
      
      console.error('Error adding participants:', participantsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to add participants'
      });
    }

    // Make admin an admin of the chat
    await supabase
      .from('chat_admins')
      .insert({
        chat_id: newChat.id,
        employee_id: adminId
      });

    // Trigger Pusher event for new chat
    const pusher = req.pusher;
    if (pusher) {
      // Notify admin
      pusher.trigger(`private-user-${adminId}`, 'new-chat', {
        chat: newChat
      });

      // Notify employee
      pusher.trigger(`private-user-${employeeId}`, 'new-chat', {
        chat: newChat
      });
    }

    res.json({
      success: true,
      chat: newChat,
      message: 'Chat created successfully'
    });

  } catch (error) {
    console.error('Create personal chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get or create department chats
 * @route   GET /api/v1/chats/department/:department
 * @access  Private
 */
const getDepartmentChats = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const department = req.params.department;

    // Get or create department chat
    let { data: departmentChat, error: deptError } = await supabase
      .from('chats')
      .select('*')
      .eq('type', 'department')
      .eq('department', department)
      .maybeSingle();

    if (!departmentChat && !deptError) {
      // Create department chat
      const { data: newChat, error } = await supabase
        .from('chats')
        .insert([
          {
            name: `${department} Department`,
            type: 'department',
            department: department,
            created_by: employeeId,
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (!error) {
        departmentChat = newChat;
        
        // Add creator to participants
        await supabase
          .from('chat_participants')
          .insert({
            chat_id: departmentChat.id,
            employee_id: employeeId
          });
      }
    }

    // Get or create all employees chat
    let { data: allEmployeesChat, error: allError } = await supabase
      .from('chats')
      .select('*')
      .eq('type', 'all-employees')
      .maybeSingle();

    if (!allEmployeesChat && !allError) {
      const { data: newChat, error } = await supabase
        .from('chats')
        .insert([
          {
            name: 'All Employees',
            type: 'all-employees',
            created_by: employeeId,
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (!error) {
        allEmployeesChat = newChat;
        
        // Add creator to participants
        await supabase
          .from('chat_participants')
          .insert({
            chat_id: allEmployeesChat.id,
            employee_id: employeeId
          });
      }
    }

    res.json({
      success: true,
      departmentChat,
      allEmployeesChat
    });

  } catch (error) {
    console.error('Get department chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Initialize default chats (run once)
 * @route   POST /api/v1/chats/initialize
 * @access  Private (Admin only)
 */
const initializeChats = async (req, res) => {
  try {
    // Get all employees
    const { data: allEmployees, error: empError } = await supabase
      .from('employees')
      .select('employee_id, department');

    if (empError) {
      console.error('Error fetching employees:', empError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch employees'
      });
    }

    // Create All Employees chat
    const { data: allChat, error: allChatError } = await supabase
      .from('chats')
      .upsert([
        {
          name: 'All Employees',
          type: 'all-employees',
          created_by: req.user.id,
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'type' })
      .select()
      .single();

    if (allChatError) {
      console.error('Error creating all employees chat:', allChatError);
    }

    // Add all employees to All Employees chat
    if (allChat && allEmployees) {
      const allParticipants = allEmployees.map(emp => ({
        chat_id: allChat.id,
        employee_id: emp.employee_id
      }));
      
      await supabase
        .from('chat_participants')
        .upsert(allParticipants, { onConflict: 'chat_id,employee_id' });
    }

    // Create department chats
    const departments = ['Editorial', 'Sales', 'Marketing', 'HR', 'IT', 'Finance', 'Admin'];
    
    for (const dept of departments) {
      const { data: deptChat, error: deptChatError } = await supabase
        .from('chats')
        .upsert([
          {
            name: `${dept} Department`,
            type: 'department',
            department: dept,
            created_by: req.user.id,
            updated_at: new Date().toISOString()
          }
        ], { onConflict: 'type,department' })
        .select()
        .single();

      if (deptChatError) {
        console.error(`Error creating ${dept} chat:`, deptChatError);
        continue;
      }

      // Add department employees to department chat
      if (deptChat && allEmployees) {
        const deptEmployees = allEmployees.filter(emp => emp.department === dept);
        const deptParticipants = deptEmployees.map(emp => ({
          chat_id: deptChat.id,
          employee_id: emp.employee_id
        }));

        await supabase
          .from('chat_participants')
          .upsert(deptParticipants, { onConflict: 'chat_id,employee_id' });
      }
    }

    res.json({
      success: true,
      message: 'Chats initialized successfully'
    });

  } catch (error) {
    console.error('Initialize chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getChats,
  getUnreadCount,
  getChatMessages,
  createPersonalChat,
  getDepartmentChats,
  initializeChats
};