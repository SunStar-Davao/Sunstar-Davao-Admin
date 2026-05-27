// const express = require('express');
// const cors = require('cors');
// const path = require('path');
// const http = require('http');
// const Pusher = require('pusher');
// require('dotenv').config();

// // Import routes
// const authRoutes = require('./routes/auth.route');
// const attendanceRoutes = require('./routes/attendance.route');
// const adminRoutes = require('./routes/admin.route');
// const chatRoutes = require('./routes/chat.routes');
// const messageRoutes = require('./routes/message.routes');

// // Initialize express
// const app = express();
// const server = http.createServer(app);

// // Initialize Pusher
// const pusher = new Pusher({
//   appId: process.env.PUSHER_APP_ID,
//   key: process.env.PUSHER_KEY,
//   secret: process.env.PUSHER_SECRET,
//   cluster: process.env.PUSHER_CLUSTER,
//   useTLS: true
// });

// // Make pusher available in routes
// app.use((req, res, next) => {
//   req.pusher = pusher;
//   next();
// });

// // Middleware
// app.use(cors({
//   origin: '*',
//   credentials: true,
//   optionsSuccessStatus: 200
// }));

// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// // Serve static files
// app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// // Request logging
// app.use((req, res, next) => {
//   console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
//   next();
// });

// // Routes
// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/attendance', attendanceRoutes);
// app.use('/api/v1/admin', adminRoutes);
// app.use('/api/v1/chats', chatRoutes);
// app.use('/api/v1/messages', messageRoutes);

// // Health check
// app.get('/health', (req, res) => {
//   res.json({
//     status: 'OK',
//     message: 'Server is running',
//     timestamp: new Date().toISOString(),
//     environment: process.env.NODE_ENV || 'development'
//   });
// });

// // Root route
// app.get('/', (req, res) => {
//   res.json({
//     name: 'Sunstar Davao Attendance System API',
//     version: '1.0.0',
//     endpoints: {
//       auth: {
//         register: 'POST /api/v1/auth/register',
//         login: 'POST /api/v1/auth/login',
//         guardLogin: 'POST /api/v1/auth/guard/login',
//         profile: 'GET /api/v1/auth/me'
//       },
//       attendance: {
//         mark: 'POST /api/v1/attendance/mark (Guard only)',
//         today: 'GET /api/v1/attendance/today (Guard only)',
//         report: 'GET /api/v1/attendance/report',
//         summary: 'GET /api/v1/attendance/summary/:employeeId'
//       },
//       admin: {
//         login: 'POST /api/v1/admin/login',
//         employees: 'GET /api/v1/admin/employees',
//         'attendance/today': 'GET /api/v1/admin/attendance/today',
//         'attendance/online': 'GET /api/v1/admin/attendance/online',
//         'attendance/report': 'GET /api/v1/admin/attendance/report',
//         'dashboard/stats': 'GET /api/v1/admin/dashboard/stats'
//       },
//       health: 'GET /health'
//     }
//   });
// });

// // Error handling
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: 'Route not found'
//   });
// });

// app.use((err, req, res, next) => {
//   console.error('Server error:', err.stack);
//   res.status(err.statusCode || 500).json({
//     success: false,
//     message: err.message || 'Internal server error',
//     error: process.env.NODE_ENV === 'development' ? err.stack : undefined
//   });
// });

// // Start server
// const PORT = process.env.PORT || 5000;

// server.listen(PORT, '0.0.0.0', () => {
//   console.log('\n✅ Server started successfully!');
//   console.log("🚀 Server is running on port:", PORT);
//   console.log("📱 Accessible from network devices");
//   console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
//   console.log(`📝 API available at: http://localhost:${PORT}`);
//   console.log(`🔍 Health check: http://localhost:${PORT}/health`);
//   console.log(`🔌 Pusher ready for real-time updates`);
// });

// // Handle unhandled rejections
// process.on('unhandledRejection', (err) => {
//   console.error('Unhandled Rejection:', err);
//   server.close(() => process.exit(1));
// });

// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const Pusher = require('pusher');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth.route');
const attendanceRoutes = require('./routes/attendance.route');
const adminRoutes = require('./routes/admin.route');


// Initialize express
const app = express();
const server = http.createServer(app);

// Initialize Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

// Make pusher available in routes
app.use((req, res, next) => {
  req.pusher = pusher;
  next();
});

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/admin', adminRoutes);


// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Sunstar Davao Attendance System API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        guardLogin: 'POST /api/v1/auth/guard/login',
        profile: 'GET /api/v1/auth/me'
      },
      attendance: {
        mark: 'POST /api/v1/attendance/mark (Guard only)',
        today: 'GET /api/v1/attendance/today (Guard only)',
        report: 'GET /api/v1/attendance/report',
        summary: 'GET /api/v1/attendance/summary/:employeeId'
      },
      admin: {
        login: 'POST /api/v1/admin/login',
        employees: 'GET /api/v1/admin/employees',
        'attendance/today': 'GET /api/v1/admin/attendance/today',
        'attendance/online': 'GET /api/v1/admin/attendance/online',
        'attendance/report': 'GET /api/v1/admin/attendance/report',
        'dashboard/stats': 'GET /api/v1/admin/dashboard/stats'
      },
      health: 'GET /health'
    }
  });
});

// Error handling
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n✅ Server started successfully!');
  console.log("🚀 Server is running on port:", PORT);
  console.log("📱 Accessible from network devices");
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📝 API available at: http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 Pusher ready for real-time updates`);
  console.log(`💬 Chat system initialized`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

module.exports = { app, server };
