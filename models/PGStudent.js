const mongoose = require('mongoose');

const PGStudentSchema = new mongoose.Schema({
  "Barcode No.": {
    type: String,
    required: false
  },
  "College Roll No": {
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
  "DOB": {
    type: String,
    required: false
  },
  "Course": {
    type: String,
    required: false
  },
  "Graduation Board": {
    type: String,
    required: false
  }
}, {
  timestamps: false
});

// Index for faster queries
PGStudentSchema.index({ "Autonomous Roll No": 1 });
PGStudentSchema.index({ "DOB": 1 });

module.exports = mongoose.model('PGStudent', PGStudentSchema);
