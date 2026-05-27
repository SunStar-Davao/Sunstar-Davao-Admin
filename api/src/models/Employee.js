// models/Employee.js
const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true,
    enum: ['Editorial', 'Sales', 'Marketing', 'HR', 'IT', 'Finance', 'Admin', 'All'] // Added 'All' for全体员工
  },
  role: {
    type: String,
    enum: ['employee', 'admin', 'guard'],
    default: 'employee'
  },
  qrCode: {
    type: String
  },
  phone: String,
  imageUrl: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Employee', employeeSchema);