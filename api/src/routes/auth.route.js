// const express = require('express');
// const router = express.Router();
// const { body } = require('express-validator');
// const { 
//   registerEmployee, 
//   loginEmployee, 
//   loginGuard,
//   getMe 
// } = require('../controllers/auth.controller');
// const { upload, handleMulterError } = require('../middleware/upload');
// const { authenticateToken } = require('../middleware/auth');

// // Validation rules
// const registerValidation = [
//   body('name')
//     .notEmpty().withMessage('Name is required')
//     .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
//     .trim()
//     .escape(),
//   body('password')
//     .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
//     .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number')
// ];

// const loginValidation = [
//   body('employeeId')
//     .notEmpty().withMessage('Employee ID is required')
//     .matches(/^EMP\d{11}$/).withMessage('Invalid employee ID format'),
//   body('password')
//     .notEmpty().withMessage('Password is required')
// ];

// const guardLoginValidation = [
//   body('username')
//     .notEmpty().withMessage('Username is required'),
//   body('password')
//     .notEmpty().withMessage('Password is required')
// ];

// // POST /api/auth/register - Register new employee
// router.post(
//   '/register',
//   upload.single('image'),
//   handleMulterError,
//   registerValidation,
//   registerEmployee
// );

// // POST /api/auth/login - Employee login
// router.post(
//   '/login',
//   loginValidation,
//   loginEmployee
// );

// // POST /api/auth/guard/login - Guard login
// router.post(
//   '/guard/login',
//   guardLoginValidation,
//   loginGuard
// );

// // GET /api/auth/me - Get current user profile
// router.get(
//   '/me',
//   authenticateToken,
//   getMe
// );

// module.exports = router;


// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const {
  registerEmployee,
  loginEmployee,
  loginGuard,
  getMe
} = require('../controllers/auth.controller');

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Validation rules
const registerValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('department').isIn(['Editorial', 'Sales', 'Marketing', 'HR', 'IT', 'Finance', 'Admin'])
    .withMessage('Invalid department')
];

const loginValidation = [
  body('employeeId').notEmpty().withMessage('Employee ID is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const guardLoginValidation = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Routes
router.post('/register', upload.single('image'), registerValidation, registerEmployee);
router.post('/login', loginValidation, loginEmployee);
router.post('/guard/login', guardLoginValidation, loginGuard);
router.get('/me', authenticateToken, getMe);

// Pusher auth endpoint
router.post('/pusher/auth', authenticateToken, (req, res) => {
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;
  
  // Check if user has access to this channel
  if (channel.startsWith('private-user-')) {
    const userId = channel.replace('private-user-', '');
    if (userId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  } else if (channel.startsWith('private-chat-')) {
    // You might want to verify user is part of this chat
    // This would require a database query
  }
  
  const auth = req.pusher.authorizeChannel(socketId, channel);
  res.send(auth);
});

module.exports = router;