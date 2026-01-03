const mongoose = require('mongoose');

const UGFirstSem2025Schema = new mongoose.Schema({
  "Sl.No": {
    type: String,
    required: false
  },
  "Roll No": {
    type: String,
    required: false
  },
  "Autonomous Roll No": {
    type: String,
    required: false
  },
  "Applicant Name": {
    type: String,
    required: false
  },
  "Name of the Students": {
    type: String,
    required: false
  },
  // Regular UG First Semester Subjects
  "Core-1-Major-1": {
    type: String,
    required: false
  },
  "Core-1-Major-2": {
    type: String,
    required: false
  },
  "Core-2-Minor-1": {
    type: String,
    required: false
  },
  "Multidisciplinary-1": {
    type: String,
    required: false
  },
  "AEC-I": {
    type: String,
    required: false
  },
  "VAC-I": {
    type: String,
    required: false
  },
  // BBA First Semester Subjects
  "CC-101": {
    type: String,
    required: false
  },
  "CC-102": {
    type: String,
    required: false
  },
  "CC-103": {
    type: String,
    required: false
  },
  "MDE-101": {
    type: String,
    required: false
  },
  "AEC-101": {
    type: String,
    required: false
  },
  "AEC-102": {
    type: String,
    required: false
  },
  "VAC-101": {
    type: String,
    required: false
  },
  Stream: {
    type: String,
    required: false
  },
  dob: {
    type: String,
    required: false,
    default: "01-01-2005"
  },
  ABC_ID: {
    type: String,
    required: false,
    default: null
  },
  profileImage: {
    type: String,
    required: false,
    default: null
  },
  batch: {
    type: String,
    required: false,
    default: "2025"
  }
}, {
  timestamps: false
});

// Index for faster queries
UGFirstSem2025Schema.index({ "Autonomous Roll No": 1 });
UGFirstSem2025Schema.index({ dob: 1 });

// Use explicit collection name to prevent pluralization issues
module.exports = mongoose.model('UGFirstSem2025', UGFirstSem2025Schema, 'ugfirstsem2025');

