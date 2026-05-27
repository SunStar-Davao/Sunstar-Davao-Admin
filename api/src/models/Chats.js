// models/Chat.js
const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['personal', 'department', 'all-employees'],
    required: true
  },
  department: {
    type: String,
    enum: ['Editorial', 'Sales', 'Marketing', 'HR', 'IT', 'Finance', 'Admin', null],
    default: null
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
chatSchema.index({ participants: 1 });
chatSchema.index({ department: 1 });
chatSchema.index({ type: 1 });

module.exports = mongoose.model('Chat', chatSchema);