// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const { validationResult } = require('express-validator');
// const { supabase } = require('../config/supabase');
// const cloudinary = require('../config/cloudinary');
// const { generateEmployeeQRCodes } = require('../utils/qrGenerator');
// const fs = require('fs');

// // Generate unique employee ID
// const generateEmployeeId = () => {
//   const prefix = 'EMP';
//   const timestamp = Date.now().toString().slice(-8);
//   const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
//   return `${prefix}${timestamp}${random}`;
// };

// /**
//  * @desc    Register a new employee
//  * @route   POST /api/auth/register
//  * @access  Public
//  */
// const registerEmployee = async (req, res) => {
//   try {
//     // Validation
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ 
//         success: false,
//         errors: errors.array() 
//       });
//     }

//     const { name, password } = req.body;
    
//     // Validate required fields
//     if (!name || !password) {
//       return res.status(400).json({
//         success: false,
//         message: 'Name and password are required'
//       });
//     }

//     // Check if employee already exists by name
//     const { data: existingEmployee, error: checkError } = await supabase
//       .from('employees')
//       .select('name')
//       .eq('name', name)
//       .maybeSingle();

//     if (existingEmployee) {
//       return res.status(400).json({
//         success: false,
//         message: 'Employee with this name already exists'
//       });
//     }

//     // Generate unique employee ID
//     const employeeId = generateEmployeeId();

//     // Hash password
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     // Upload image to Cloudinary if provided
//     let imageUrl = null;
//     if (req.file) {
//       try {
//         const result = await cloudinary.uploader.upload(req.file.path, {
//           folder: 'attendance_system/employees',
//           public_id: `employee_${employeeId}`,
//           width: 500,
//           height: 500,
//           crop: 'limit',
//           quality: 'auto:good',
//           transformation: [
//             { width: 500, height: 500, crop: 'fill' },
//             { quality: 'auto' }
//           ]
//         });
//         imageUrl = result.secure_url;
        
//         // Clean up temporary file
//         fs.unlinkSync(req.file.path);
//       } catch (uploadError) {
//         console.error('Image upload error:', uploadError);
//         // Continue without image if upload fails
//       }
//     }

//     // Generate QR codes
//     let qrCodeInUrl = null;
//     let qrCodeOutUrl = null;
    
//     try {
//       const qrCodes = await generateEmployeeQRCodes({ employeeId, name });
//       qrCodeInUrl = qrCodes.qrCodeInUrl;
//       qrCodeOutUrl = qrCodes.qrCodeOutUrl;
//     } catch (qrError) {
//       console.error('QR generation error:', qrError);
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to generate QR codes'
//       });
//     }

//     // Save to Supabase
//     const { data: employee, error } = await supabase
//       .from('employees')
//       .insert([
//         {
//           employee_id: employeeId,
//           name,
//           password: hashedPassword,
//           image_url: imageUrl,
//           qr_code_in_url: qrCodeInUrl,
//           qr_code_out_url: qrCodeOutUrl,
//           created_at: new Date().toISOString()
//         }
//       ])
//       .select('employee_id, name, image_url, qr_code_in_url, qr_code_out_url, created_at')
//       .single();

//     if (error) {
//       console.error('Supabase insert error:', error);
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to register employee in database'
//       });
//     }

//     // Generate JWT token
//     const token = jwt.sign(
//       { 
//         id: employee.employee_id, 
//         name: employee.name, 
//         role: 'employee' 
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRE || '7d' }
//     );

//     // Return success response
//     res.status(201).json({
//       success: true,
//       message: 'Employee registered successfully',
//       token,
//       employee: {
//         employeeId: employee.employee_id,
//         name: employee.name,
//         imageUrl: employee.image_url,
//         qrCodeInUrl: employee.qr_code_in_url,
//         qrCodeOutUrl: employee.qr_code_out_url,
//         createdAt: employee.created_at
//       }
//     });

//   } catch (error) {
//     console.error('Registration error:', error);
    
//     // Clean up uploaded file if exists
//     if (req.file) {
//       try {
//         fs.unlinkSync(req.file.path);
//       } catch (unlinkError) {
//         console.error('Error cleaning up file:', unlinkError);
//       }
//     }
    
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error during registration',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// /**
//  * @desc    Login employee
//  * @route   POST /api/auth/login
//  * @access  Public
//  */
// const loginEmployee = async (req, res) => {
//   try {
//     const { employeeId, password } = req.body;

//     // Validate input
//     if (!employeeId || !password) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide employee ID and password'
//       });
//     }

//     console.log('🔐 Attempting login for employee:', employeeId);

//     // Get employee from database
//     const { data: employee, error } = await supabase
//       .from('employees')
//       .select('*')
//       .eq('employee_id', employeeId)
//       .single();

//     if (error || !employee) {
//       console.log('❌ Employee not found:', employeeId);
//       return res.status(401).json({ 
//         success: false,
//         message: 'Invalid credentials' 
//       });
//     }

//     // Verify password
//     const isValidPassword = await bcrypt.compare(password, employee.password);
//     if (!isValidPassword) {
//       console.log('❌ Invalid password for employee:', employeeId);
//       return res.status(401).json({ 
//         success: false,
//         message: 'Invalid credentials' 
//       });
//     }

//     console.log('✅ Employee login successful:', employeeId);

//     // Generate JWT token
//     const token = jwt.sign(
//       { 
//         id: employee.employee_id, 
//         name: employee.name, 
//         role: 'employee' 
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRE || '7d' }
//     );

//     // Return success response
//     res.json({
//       success: true,
//       message: 'Login successful',
//       token,
//       employee: {
//         employeeId: employee.employee_id,
//         name: employee.name,
//         imageUrl: employee.image_url,
//         qrCodeInUrl: employee.qr_code_in_url,
//         qrCodeOutUrl: employee.qr_code_out_url
//       }
//     });

//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error during login',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// /**
//  * @desc    Login security guard
//  * @route   POST /api/auth/guard/login
//  * @access  Public
//  */
// const loginGuard = async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     // Validate input
//     if (!username || !password) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide username and password'
//       });
//     }

//     console.log('🔐 Attempting guard login for:', username);

//     // Check against environment variables
//     if (username === process.env.GUARD_USERNAME && password === process.env.GUARD_PASSWORD) {
//       const token = jwt.sign(
//         { 
//           role: 'guard', 
//           username,
//           id: 'guard_' + Date.now()
//         },
//         process.env.JWT_SECRET,
//         { expiresIn: process.env.JWT_EXPIRE || '7d' }
//       );

//       console.log('✅ Guard login successful:', username);

//       return res.json({
//         success: true,
//         message: 'Login successful',
//         token,
//         guard: { 
//           username, 
//           role: 'guard',
//           name: 'Security Guard'
//         }
//       });
//     }

//     console.log('❌ Invalid guard credentials:', username);
//     res.status(401).json({ 
//       success: false,
//       message: 'Invalid credentials' 
//     });

//   } catch (error) {
//     console.error('Guard login error:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error during login',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// /**
//  * @desc    Get current user profile
//  * @route   GET /api/auth/me
//  * @access  Private
//  */
// const getMe = async (req, res) => {
//   try {
//     if (req.user.role === 'employee') {
//       const { data: employee, error } = await supabase
//         .from('employees')
//         .select('employee_id, name, image_url, qr_code_in_url, qr_code_out_url, created_at')
//         .eq('employee_id', req.user.id)
//         .single();

//       if (error) {
//         return res.status(404).json({
//           success: false,
//           message: 'Employee not found'
//         });
//       }

//       return res.json({
//         success: true,
//         user: {
//           employeeId: employee.employee_id,
//           name: employee.name,
//           imageUrl: employee.image_url,
//           qrCodeInUrl: employee.qr_code_in_url,
//           qrCodeOutUrl: employee.qr_code_out_url,
//           createdAt: employee.created_at,
//           role: 'employee'
//         }
//       });
//     } else {
//       // Guard user
//       return res.json({
//         success: true,
//         user: {
//           username: req.user.username,
//           role: 'guard',
//           name: 'Security Guard'
//         }
//       });
//     }
//   } catch (error) {
//     console.error('Get profile error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// };

// module.exports = {
//   registerEmployee,
//   loginEmployee,
//   loginGuard,
//   getMe
// };


// controllers/auth.controller.js
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const { validationResult } = require('express-validator');
// const { supabase } = require('../config/supabase');
// const cloudinary = require('../config/cloudinary');
// const { generateEmployeeQRCodes } = require('../utils/qrGenerator');
// const fs = require('fs');
// const path = require('path');
// const os = require('os');
// const { v4: uuidv4 } = require('uuid');

// // Generate unique employee ID
// const generateEmployeeId = () => {
//   const prefix = 'EMP';
//   const timestamp = Date.now().toString().slice(-8);
//   const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
//   return `${prefix}${timestamp}${random}`;
// };

// // Helper function to add employee to default chats
// const addEmployeeToDefaultChats = async (employeeId, department, pusher) => {
//   try {
//     console.log(`Adding employee ${employeeId} to default chats...`);
    
//     // Add to All Employees chat
//     const { data: allEmployeesChat, error: allError } = await supabase
//       .from('chats')
//       .select('id')
//       .eq('type', 'all-employees')
//       .maybeSingle();

//     if (allError) {
//       console.error('Error fetching all employees chat:', allError);
//     }

//     if (allEmployeesChat) {
//       const { error: insertError } = await supabase
//         .from('chat_participants')
//         .upsert({
//           chat_id: allEmployeesChat.id,
//           employee_id: employeeId
//         }, { onConflict: 'chat_id,employee_id' });

//       if (insertError) {
//         console.error('Error adding to all employees chat:', insertError);
//       } else {
//         console.log(`Added to all employees chat: ${allEmployeesChat.id}`);
//       }
//     }

//     // Add to Department chat
//     const { data: departmentChat, error: deptError } = await supabase
//       .from('chats')
//       .select('id')
//       .eq('type', 'department')
//       .eq('department', department)
//       .maybeSingle();

//     if (deptError) {
//       console.error('Error fetching department chat:', deptError);
//     }

//     if (departmentChat) {
//       const { error: insertError } = await supabase
//         .from('chat_participants')
//         .upsert({
//           chat_id: departmentChat.id,
//           employee_id: employeeId
//         }, { onConflict: 'chat_id,employee_id' });

//       if (insertError) {
//         console.error('Error adding to department chat:', insertError);
//       } else {
//         console.log(`Added to department chat: ${departmentChat.id}`);
//       }
//     }

//     // Trigger Pusher event for new participant
//     if (pusher) {
//       if (allEmployeesChat) {
//         pusher.trigger(`private-chat-${allEmployeesChat.id}`, 'new-participant', {
//           employeeId
//         });
//       }
//       if (departmentChat) {
//         pusher.trigger(`private-chat-${departmentChat.id}`, 'new-participant', {
//           employeeId
//         });
//       }
//     }
//   } catch (error) {
//     console.error('Error adding employee to default chats:', error);
//   }
// };

// /**
//  * @desc    Register a new employee
//  * @route   POST /api/v1/auth/register
//  * @access  Public
//  */
// const registerEmployee = async (req, res) => {
//   let tempFilePath = null;
  
//   try {
//     // Validation
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ 
//         success: false,
//         errors: errors.array() 
//       });
//     }

//     const { name, password, department, role = 'employee' } = req.body;
    
//     // Validate required fields
//     if (!name || !password || !department) {
//       return res.status(400).json({
//         success: false,
//         message: 'Name, password, and department are required'
//       });
//     }

//     // Validate department
//     const validDepartments = ['Editorial', 'Sales', 'Marketing', 'HR', 'IT', 'Finance', 'Admin'];
//     if (!validDepartments.includes(department)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid department'
//       });
//     }

//     // Check if employee already exists by name
//     const { data: existingEmployee, error: checkError } = await supabase
//       .from('employees')
//       .select('name')
//       .eq('name', name)
//       .maybeSingle();

//     if (existingEmployee) {
//       return res.status(400).json({
//         success: false,
//         message: 'Employee with this name already exists'
//       });
//     }

//     // Generate unique employee ID
//     const employeeId = generateEmployeeId();

//     // Hash password
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     // Handle image upload if provided
//     let imageUrl = null;
//     if (req.file) {
//       try {
//         // Create temp file
//         tempFilePath = path.join(os.tmpdir(), `${uuidv4()}-${req.file.originalname}`);
//         fs.writeFileSync(tempFilePath, req.file.buffer);

//         // Upload to Cloudinary
//         const result = await cloudinary.uploader.upload(tempFilePath, {
//           folder: 'attendance_system/employees',
//           public_id: `employee_${employeeId}`,
//           width: 500,
//           height: 500,
//           crop: 'limit',
//           quality: 'auto:good',
//           transformation: [
//             { width: 500, height: 500, crop: 'fill' },
//             { quality: 'auto' }
//           ]
//         });
//         imageUrl = result.secure_url;
        
//         console.log('Image uploaded successfully:', imageUrl);
//       } catch (uploadError) {
//         console.error('Image upload error:', uploadError);
//         // Continue without image if upload fails
//       } finally {
//         // Clean up temp file
//         if (tempFilePath && fs.existsSync(tempFilePath)) {
//           fs.unlinkSync(tempFilePath);
//         }
//       }
//     }

//     // Generate QR codes
//     let qrCodeInUrl = null;
//     let qrCodeOutUrl = null;
    
//     try {
//       const qrCodes = await generateEmployeeQRCodes({ employeeId, name });
//       qrCodeInUrl = qrCodes.qrCodeInUrl;
//       qrCodeOutUrl = qrCodes.qrCodeOutUrl;
//       console.log('QR codes generated successfully');
//     } catch (qrError) {
//       console.error('QR generation error:', qrError);
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to generate QR codes'
//       });
//     }

//     // Save to Supabase
//     const { data: employee, error } = await supabase
//       .from('employees')
//       .insert([
//         {
//           employee_id: employeeId,
//           name,
//           password: hashedPassword,
//           image_url: imageUrl,
//           qr_code_in_url: qrCodeInUrl,
//           qr_code_out_url: qrCodeOutUrl,
//           department: department,
//           role: role,
//           created_at: new Date().toISOString()
//         }
//       ])
//       .select('employee_id, name, image_url, qr_code_in_url, qr_code_out_url, department, role, created_at')
//       .single();

//     if (error) {
//       console.error('Supabase insert error:', error);
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to register employee in database'
//       });
//     }

//     // After registration, automatically add employee to appropriate chats
//     await addEmployeeToDefaultChats(employeeId, department, req.pusher);

//     // Generate JWT token
//     const token = jwt.sign(
//       { 
//         id: employee.employee_id, 
//         name: employee.name, 
//         role: employee.role,
//         department: employee.department
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRE || '7d' }
//     );

//     // Return success response
//     res.status(201).json({
//       success: true,
//       message: 'Employee registered successfully',
//       token,
//       employee: {
//         employeeId: employee.employee_id,
//         name: employee.name,
//         imageUrl: employee.image_url,
//         qrCodeInUrl: employee.qr_code_in_url,
//         qrCodeOutUrl: employee.qr_code_out_url,
//         department: employee.department,
//         role: employee.role,
//         createdAt: employee.created_at
//       }
//     });

//   } catch (error) {
//     console.error('Registration error:', error);
    
//     // Clean up temp file if exists
//     if (tempFilePath && fs.existsSync(tempFilePath)) {
//       try {
//         fs.unlinkSync(tempFilePath);
//       } catch (unlinkError) {
//         console.error('Error cleaning up file:', unlinkError);
//       }
//     }
    
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error during registration',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// /**
//  * @desc    Login employee
//  * @route   POST /api/v1/auth/login
//  * @access  Public
//  */
// const loginEmployee = async (req, res) => {
//   try {
//     const { employeeId, password } = req.body;

//     // Validate input
//     if (!employeeId || !password) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide employee ID and password'
//       });
//     }

//     console.log('🔐 Attempting login for employee:', employeeId);

//     // Get employee from database
//     const { data: employee, error } = await supabase
//       .from('employees')
//       .select('*')
//       .eq('employee_id', employeeId)
//       .single();

//     if (error || !employee) {
//       console.log('❌ Employee not found:', employeeId);
//       return res.status(401).json({ 
//         success: false,
//         message: 'Invalid credentials' 
//       });
//     }

//     // Verify password
//     const isValidPassword = await bcrypt.compare(password, employee.password);
//     if (!isValidPassword) {
//       console.log('❌ Invalid password for employee:', employeeId);
//       return res.status(401).json({ 
//         success: false,
//         message: 'Invalid credentials' 
//       });
//     }

//     console.log('✅ Employee login successful:', employeeId);

//     // Update last seen
//     await supabase
//       .from('employees')
//       .update({ last_seen: new Date().toISOString() })
//       .eq('employee_id', employeeId);

//     // Generate JWT token
//     const token = jwt.sign(
//       { 
//         id: employee.employee_id, 
//         name: employee.name, 
//         role: employee.role,
//         department: employee.department
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRE || '7d' }
//     );

//     // Return success response
//     res.json({
//       success: true,
//       message: 'Login successful',
//       token,
//       employee: {
//         employeeId: employee.employee_id,
//         name: employee.name,
//         imageUrl: employee.image_url,
//         qrCodeInUrl: employee.qr_code_in_url,
//         qrCodeOutUrl: employee.qr_code_out_url,
//         department: employee.department,
//         role: employee.role
//       }
//     });

//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error during login',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// /**
//  * @desc    Login security guard
//  * @route   POST /api/v1/auth/guard/login
//  * @access  Public
//  */
// const loginGuard = async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     // Validate input
//     if (!username || !password) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide username and password'
//       });
//     }

//     console.log('🔐 Attempting guard login for:', username);

//     // Check against environment variables
//     if (username === process.env.GUARD_USERNAME && password === process.env.GUARD_PASSWORD) {
//       const token = jwt.sign(
//         { 
//           role: 'guard', 
//           username,
//           id: 'guard_' + Date.now()
//         },
//         process.env.JWT_SECRET,
//         { expiresIn: process.env.JWT_EXPIRE || '7d' }
//       );

//       console.log('✅ Guard login successful:', username);

//       return res.json({
//         success: true,
//         message: 'Login successful',
//         token,
//         guard: { 
//           username, 
//           role: 'guard',
//           name: 'Security Guard'
//         }
//       });
//     }

//     console.log('❌ Invalid guard credentials:', username);
//     res.status(401).json({ 
//       success: false,
//       message: 'Invalid credentials' 
//     });

//   } catch (error) {
//     console.error('Guard login error:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error during login',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// /**
//  * @desc    Get current user profile
//  * @route   GET /api/v1/auth/me
//  * @access  Private
//  */
// const getMe = async (req, res) => {
//   try {
//     if (req.user.role === 'employee' || req.user.role === 'admin' || req.user.role === 'Admin') {
//       const { data: employee, error } = await supabase
//         .from('employees')
//         .select('employee_id, name, image_url, qr_code_in_url, qr_code_out_url, department, role, created_at')
//         .eq('employee_id', req.user.id)
//         .single();

//       if (error) {
//         return res.status(404).json({
//           success: false,
//           message: 'Employee not found'
//         });
//       }

//       return res.json({
//         success: true,
//         user: {
//           employeeId: employee.employee_id,
//           name: employee.name,
//           imageUrl: employee.image_url,
//           qrCodeInUrl: employee.qr_code_in_url,
//           qrCodeOutUrl: employee.qr_code_out_url,
//           department: employee.department,
//           role: employee.role,
//           createdAt: employee.created_at
//         }
//       });
//     } else {
//       // Guard user
//       return res.json({
//         success: true,
//         user: {
//           username: req.user.username,
//           role: 'guard',
//           name: 'Security Guard'
//         }
//       });
//     }
//   } catch (error) {
//     console.error('Get profile error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// };




// module.exports = {
//   registerEmployee,
//   loginEmployee,
//   loginGuard,
//   getMe
// };


// controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const cloudinary = require('../config/cloudinary');
const { generateEmployeeQRCodes } = require('../utils/qrGenerator');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// Generate unique employee ID
const generateEmployeeId = () => {
  const prefix = 'EMP';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

// Helper function to ensure default chats exist and add employee to them
const addEmployeeToDefaultChats = async (employeeId, department, pusher) => {
  try {
    console.log(`Ensuring default chats exist and adding employee ${employeeId}...`);
    
    // === 1. ENSURE ALL EMPLOYEES CHAT EXISTS ===
    let { data: allEmployeesChat, error: allError } = await supabase
      .from('chats')
      .select('id, name')
      .eq('type', 'all-employees')
      .maybeSingle();

    // Create All Employees chat if it doesn't exist
    if (!allEmployeesChat) {
      console.log('⚠️ All Employees chat not found, creating it now...');
      
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert([{
          name: 'All Employees',
          type: 'all-employees',
          created_by: employeeId,
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) {
        console.error('❌ Failed to create All Employees chat:', createError);
      } else {
        allEmployeesChat = newChat;
        console.log('✅ Created All Employees chat with ID:', allEmployeesChat.id);
      }
    } else {
      console.log('✅ All Employees chat exists with ID:', allEmployeesChat.id);
    }

    // Add current user to All Employees chat
    if (allEmployeesChat) {
      const { error: insertError } = await supabase
        .from('chat_participants')
        .upsert({
          chat_id: allEmployeesChat.id,
          employee_id: employeeId
        }, { onConflict: 'chat_id,employee_id' });

      if (insertError) {
        console.error('❌ Error adding to All Employees chat:', insertError);
      } else {
        console.log(`✅ Added employee ${employeeId} to All Employees chat`);
      }
    }

    // === 2. ENSURE DEPARTMENT CHAT EXISTS ===
    if (department) {
      let { data: departmentChat, error: deptError } = await supabase
        .from('chats')
        .select('id, name')
        .eq('type', 'department')
        .eq('department', department)
        .maybeSingle();

      // Create Department chat if it doesn't exist
      if (!departmentChat) {
        console.log(`⚠️ ${department} Department chat not found, creating it now...`);
        
        const { data: newChat, error: createError } = await supabase
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

        if (createError) {
          console.error(`❌ Failed to create ${department} Department chat:`, createError);
        } else {
          departmentChat = newChat;
          console.log(`✅ Created ${department} Department chat with ID:`, departmentChat.id);
        }
      } else {
        console.log(`✅ ${department} Department chat exists with ID:`, departmentChat.id);
      }

      // Add current user to Department chat
      if (departmentChat) {
        const { error: insertError } = await supabase
          .from('chat_participants')
          .upsert({
            chat_id: departmentChat.id,
            employee_id: employeeId
          }, { onConflict: 'chat_id,employee_id' });

        if (insertError) {
          console.error(`❌ Error adding to ${department} Department chat:`, insertError);
        } else {
          console.log(`✅ Added employee ${employeeId} to ${department} Department chat`);
        }
      }
    }

    // === 3. ALSO ADD ALL EXISTING EMPLOYEES TO NEWLY CREATED CHATS ===
    if (allEmployeesChat) {
      const { data: allEmployees } = await supabase
        .from('employees')
        .select('employee_id');

      if (allEmployees && allEmployees.length > 0) {
        const allParticipants = allEmployees.map(emp => ({
          chat_id: allEmployeesChat.id,
          employee_id: emp.employee_id
        }));

        await supabase
          .from('chat_participants')
          .upsert(allParticipants, { onConflict: 'chat_id,employee_id' });
        
        console.log(`✅ Synced all ${allEmployees.length} employees to All Employees chat`);
      }
    }

    if (department) {
      const { data: deptChat } = await supabase
        .from('chats')
        .select('id')
        .eq('type', 'department')
        .eq('department', department)
        .single();

      if (deptChat) {
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
          
          console.log(`✅ Synced all ${deptEmployees.length} ${department} employees to department chat`);
        }
      }
    }

    // Trigger Pusher events
    if (pusher) {
      if (allEmployeesChat) {
        pusher.trigger(`private-chat-${allEmployeesChat.id}`, 'new-participant', {
          employeeId
        });
      }
      
      if (department) {
        const { data: deptChat } = await supabase
          .from('chats')
          .select('id')
          .eq('type', 'department')
          .eq('department', department)
          .single();
          
        if (deptChat) {
          pusher.trigger(`private-chat-${deptChat.id}`, 'new-participant', {
            employeeId
          });
        }
      }
    }

  } catch (error) {
    console.error('Error in addEmployeeToDefaultChats:', error);
  }
};

/**
 * @desc    Register a new employee
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const registerEmployee = async (req, res) => {
  let tempFilePath = null;
  
  try {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { name, password, department, role = 'employee', image } = req.body; // 👈 ADDED image from body
    
    // Validate required fields
    if (!name || !password || !department) {
      return res.status(400).json({
        success: false,
        message: 'Name, password, and department are required'
      });
    }

    // Validate department
    const validDepartments = ['Editorial', 'Sales', 'Marketing', 'HR', 'IT', 'Finance', 'Admin'];
    if (!validDepartments.includes(department)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department'
      });
    }

    // Check if employee already exists by name
    const { data: existingEmployee, error: checkError } = await supabase
      .from('employees')
      .select('name')
      .eq('name', name)
      .maybeSingle();

    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Employee with this name already exists'
      });
    }

    // Generate unique employee ID
    const employeeId = generateEmployeeId();

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Handle image upload - UPDATED TO HANDLE BASE64
    let imageUrl = null;
    if (image) {
      try {
        console.log('Processing base64 image...');
        
        // Extract base64 data (remove data:image/jpeg;base64, prefix)
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Create temp file
        tempFilePath = path.join(os.tmpdir(), `${uuidv4()}-profile.jpg`);
        fs.writeFileSync(tempFilePath, buffer);

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(tempFilePath, {
          folder: 'attendance_system/employees',
          public_id: `employee_${employeeId}`,
          width: 500,
          height: 500,
          crop: 'limit',
          quality: 'auto:good',
          transformation: [
            { width: 500, height: 500, crop: 'fill' },
            { quality: 'auto' }
          ]
        });
        imageUrl = result.secure_url;
        
        console.log('✅ Image uploaded successfully:', imageUrl);
      } catch (uploadError) {
        console.error('❌ Image upload error:', uploadError);
        // Continue without image if upload fails
      } finally {
        // Clean up temp file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    }

    // Generate QR codes
    let qrCodeInUrl = null;
    let qrCodeOutUrl = null;
    
    try {
      const qrCodes = await generateEmployeeQRCodes({ employeeId, name });
      qrCodeInUrl = qrCodes.qrCodeInUrl;
      qrCodeOutUrl = qrCodes.qrCodeOutUrl;
      console.log('✅ QR codes generated successfully');
    } catch (qrError) {
      console.error('❌ QR generation error:', qrError);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate QR codes'
      });
    }

    // Save to Supabase
    const { data: employee, error } = await supabase
      .from('employees')
      .insert([
        {
          employee_id: employeeId,
          name,
          password: hashedPassword,
          image_url: imageUrl,
          qr_code_in_url: qrCodeInUrl,
          qr_code_out_url: qrCodeOutUrl,
          department: department,
          role: role,
          created_at: new Date().toISOString()
        }
      ])
      .select('employee_id, name, image_url, qr_code_in_url, qr_code_out_url, department, role, created_at')
      .single();

    if (error) {
      console.error('❌ Supabase insert error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to register employee in database'
      });
    }

    // After registration, automatically add employee to appropriate chats
    await addEmployeeToDefaultChats(employeeId, department, req.pusher);

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: employee.employee_id, 
        name: employee.name, 
        role: employee.role,
        department: employee.department
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Employee registered successfully',
      token,
      employee: {
        employeeId: employee.employee_id,
        name: employee.name,
        imageUrl: employee.image_url,
        qrCodeInUrl: employee.qr_code_in_url,
        qrCodeOutUrl: employee.qr_code_out_url,
        department: employee.department,
        role: employee.role,
        createdAt: employee.created_at
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    
    // Clean up temp file if exists
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Login employee
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const loginEmployee = async (req, res) => {
  try {
    const { employeeId, password } = req.body;

    // Validate input
    if (!employeeId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide employee ID and password'
      });
    }

    console.log('🔐 Attempting login for employee:', employeeId);

    // Get employee from database
    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_id', employeeId)
      .single();

    if (error || !employee) {
      console.log('❌ Employee not found:', employeeId);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, employee.password);
    if (!isValidPassword) {
      console.log('❌ Invalid password for employee:', employeeId);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    console.log('✅ Employee login successful:', employeeId);

    // Update last seen
    await supabase
      .from('employees')
      .update({ last_seen: new Date().toISOString() })
      .eq('employee_id', employeeId);

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: employee.employee_id, 
        name: employee.name, 
        role: employee.role,
        department: employee.department
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Return success response
    res.json({
      success: true,
      message: 'Login successful',
      token,
      employee: {
        employeeId: employee.employee_id,
        name: employee.name,
        imageUrl: employee.image_url,
        qrCodeInUrl: employee.qr_code_in_url,
        qrCodeOutUrl: employee.qr_code_out_url,
        department: employee.department,
        role: employee.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Login security guard
 * @route   POST /api/v1/auth/guard/login
 * @access  Public
 */
const loginGuard = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }

    console.log('🔐 Attempting guard login for:', username);

    // Check against environment variables
    if (username === process.env.GUARD_USERNAME && password === process.env.GUARD_PASSWORD) {
      const token = jwt.sign(
        { 
          role: 'guard', 
          username,
          id: 'guard_' + Date.now()
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      console.log('✅ Guard login successful:', username);

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        guard: { 
          username, 
          role: 'guard',
          name: 'Security Guard'
        }
      });
    }

    console.log('❌ Invalid guard credentials:', username);
    res.status(401).json({ 
      success: false,
      message: 'Invalid credentials' 
    });

  } catch (error) {
    console.error('Guard login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    if (req.user.role === 'employee' || req.user.role === 'admin' || req.user.role === 'Admin') {
      const { data: employee, error } = await supabase
        .from('employees')
        .select('employee_id, name, image_url, qr_code_in_url, qr_code_out_url, department, role, created_at')
        .eq('employee_id', req.user.id)
        .single();

      if (error) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      return res.json({
        success: true,
        user: {
          employeeId: employee.employee_id,
          name: employee.name,
          imageUrl: employee.image_url,
          qrCodeInUrl: employee.qr_code_in_url,
          qrCodeOutUrl: employee.qr_code_out_url,
          department: employee.department,
          role: employee.role,
          createdAt: employee.created_at
        }
      });
    } else {
      // Guard user
      return res.json({
        success: true,
        user: {
          username: req.user.username,
          role: 'guard',
          name: 'Security Guard'
        }
      });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  registerEmployee,
  loginEmployee,
  loginGuard,
  getMe
};

