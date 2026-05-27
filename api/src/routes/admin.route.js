const express = require('express');
const router = express.Router();
const {
  adminLogin,
  getAllEmployees,
  getTodayAttendance,
  getOnlineEmployees,
  getAttendanceReport,
  deleteEmployee,
  getDashboardStats
} = require('../controllers/admin.controller');
const { protectAdmin } = require('../middleware/adminAuth');

// Public routes
router.post('/login', adminLogin);

// Protected routes (require admin authentication)
router.get('/employees', protectAdmin, getAllEmployees);
router.get('/attendance/today', protectAdmin, getTodayAttendance);
router.get('/attendance/online', protectAdmin, getOnlineEmployees);
router.get('/attendance/report', protectAdmin, getAttendanceReport);
router.get('/dashboard/stats', protectAdmin, getDashboardStats);
router.delete('/employees/:id', protectAdmin, deleteEmployee);

module.exports = router;