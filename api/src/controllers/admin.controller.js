const { supabase } = require('../config/supabase');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * @desc    Admin login
 * @route   POST /api/v1/admin/login
 * @access  Public
 */
const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }

    console.log('🔐 Admin login attempt:', username);

    // Check against environment variables (you can later move this to a database table)
    if (username === process.env.ADMIN_USERNAME && 
        password === process.env.ADMIN_PASSWORD) {
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          username, 
          role: 'admin',
          id: 'admin_' + Date.now()
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log('✅ Admin login successful:', username);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        admin: {
          username,
          name: 'Administrator',
          role: 'admin'
        }
      });
    } else {
      console.log('❌ Invalid admin credentials:', username);
      res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login'
    });
  }
};

/**
 * @desc    Get all employees
 * @route   GET /api/v1/admin/employees
 * @access  Private (Admin only)
 */
const getAllEmployees = async (req, res) => {
  try {
    const { data: employees, error } = await supabase
      .from('employees')
      .select('employee_id, name, image_url, created_at, qr_code_in_url, qr_code_out_url, department, role')
      .order('name');

    if (error) throw error;

    res.json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch employees' 
    });
  }
};

/**
 * @desc    Get today's attendance with real-time status
 * @route   GET /api/v1/admin/attendance/today
 * @access  Private (Admin only)
 */
const getTodayAttendance = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: attendance, error } = await supabase
      .from('attendance')
      .select(`
        *,
        employees!inner (
          name,
          employee_id,
          image_url
        )
      `)
      .eq('date', today)
      .order('time_in', { ascending: false });

    if (error) throw error;

    // Add online status (active within last 15 minutes)
    const now = new Date();
    const fifteenMinsAgo = new Date(now.getTime() - 15 * 60000);

    const attendanceWithStatus = attendance.map(record => ({
      ...record,
      isOnline: record.time_out ? false : 
                (new Date(record.time_in) > fifteenMinsAgo)
    }));

    res.json({
      success: true,
      data: attendanceWithStatus
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch attendance' 
    });
  }
};

/**
 * @desc    Get currently online employees
 * @route   GET /api/v1/admin/attendance/online
 * @access  Private (Admin only)
 */
const getOnlineEmployees = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: online, error } = await supabase
      .from('attendance')
      .select(`
        *,
        employees!inner (
          name,
          employee_id,
          image_url
        )
      `)
      .eq('date', today)
      .is('time_out', null)
      .gte('time_in', fifteenMinsAgo)
      .order('time_in', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: online
    });
  } catch (error) {
    console.error('Error fetching online employees:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch online employees' 
    });
  }
};

/**
 * @desc    Get attendance report with filters
 * @route   GET /api/v1/admin/attendance/report
 * @access  Private (Admin only)
 */
const getAttendanceReport = async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;

    let query = supabase
      .from('attendance')
      .select(`
        *,
        employees!inner (
          name,
          employee_id,
          image_url
        )
      `)
      .gte('date', startDate)
      .lte('date', endDate);

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data: attendance, error } = await query.order('date', { ascending: false });

    if (error) throw error;

    // Calculate summary
    const summary = {
      totalDays: attendance.length,
      present: attendance.filter(a => a.status === 'present').length,
      late: attendance.filter(a => a.status === 'late').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      totalLateMinutes: attendance.reduce((acc, curr) => acc + (curr.late_minutes || 0), 0)
    };

    res.json({
      success: true,
      data: attendance,
      summary
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch report' 
    });
  }
};

/**
 * @desc    Delete employee
 * @route   DELETE /api/v1/admin/employees/:id
 * @access  Private (Admin only)
 */
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // First delete attendance records
    await supabase
      .from('attendance')
      .delete()
      .eq('employee_id', id);

    // Then delete employee
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('employee_id', id);

    if (error) throw error;

    // Emit real-time update if socket.io is available
    if (req.io) {
      req.io.emit('employee-deleted', { id });
    }

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete employee' 
    });
  }
};

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/v1/admin/dashboard/stats
 * @access  Private (Admin only)
 */
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // Get total employees
    const { count: totalEmployees } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });

    // Get today's attendance
    const { data: todayAttendance } = await supabase
      .from('attendance')
      .select('status, late_minutes')
      .eq('date', today);

    // Get online count
    const { count: onlineCount } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('date', today)
      .is('time_out', null)
      .gte('time_in', fifteenMinsAgo);

    const present = todayAttendance?.filter(a => a.status === 'present').length || 0;
    const late = todayAttendance?.filter(a => a.status === 'late').length || 0;

    res.json({
      success: true,
      data: {
        totalEmployees: totalEmployees || 0,
        presentToday: present,
        lateToday: late,
        onlineNow: onlineCount || 0,
        absentToday: (totalEmployees || 0) - present - late
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch dashboard stats' 
    });
  }
};

module.exports = {
  adminLogin,
  getAllEmployees,
  getTodayAttendance,
  getOnlineEmployees,
  getAttendanceReport,
  deleteEmployee,
  getDashboardStats
};
