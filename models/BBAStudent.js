const mongoose = require('mongoose');

const BBAStudentSchema = new mongoose.Schema({
  Department: {
    type: String,
    required: false
  },
  "Sl.No": {
    type: Number,
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
  "Name of the Students": {
    type: String,
    required: false
  },
  "CC-201": {
    type: String,
    required: false
  },
  "CC-202": {
    type: String,
    required: false
  },
  "CC-203": {
    type: String,
    required: false
  },
  "Multi Disciplinary-201": {
    type: String,
    required: false
  },
  "AEC-201": {
    type: String,
    required: false
  },
  "SEC-201": {
    type: String,
    required: false
  },
  "VAC-201-I.C": {
    type: String,
    required: false
  },
  "CC-301": {
    type: String,
    required: false
  },
  "CC-302": {
    type: String,
    required: false
  },
  "CC-303": {
    type: String,
    required: false
  },
  "MDE-301": {
    type: String,
    required: false
  },
  "SEC-301": {
    type: String,
    required: false
  },
  "VAC-301": {
    type: String,
    required: false
  },
  examCode: {
    type: Number,
    required: false
  },
  dob: {
    type: String,
    required: false
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
  }
}, {
  timestamps: false
});

// Index for faster queries
BBAStudentSchema.index({ "Autonomous Roll No": 1 });
BBAStudentSchema.index({ dob: 1 });

module.exports = mongoose.model('BBAStudent', BBAStudentSchema);
