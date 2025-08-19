const mongoose = require('mongoose');

const UGStudentSchema = new mongoose.Schema({
  Department: {
    type: String,
    required: false
  },
  "Sl.No": {
    type: Number,
    required: false
  },
  "Autonomous Roll No": {
    type: String,
    required: false
  },
  "Name of the Students": {
    type: String,
    required: false
  },
  "Major-3": {
    type: String,
    required: false
  },
  "Major-4": {
    type: String,
    required: false
  },
  "MINOR-2": {
    type: String,
    required: false
  },
  "Multi Disciplinary-2": {
    type: String,
    required: false
  },
  "AEC-2": {
    type: String,
    required: false
  },
  "SEC-I": {
    type: String,
    required: false
  },
  "Roll No": {
    type: String,
    required: false
  },
  dob: {
    type: String,
    required: false
  }
}, {
  timestamps: false
});

// Index for faster queries
UGStudentSchema.index({ "Autonomous Roll No": 1 });
UGStudentSchema.index({ dob: 1 });

module.exports = mongoose.model('UGStudent', UGStudentSchema);
