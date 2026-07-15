const mongoose = require('mongoose');

const ABCIDSubmissionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'studentType'
  },
  studentType: {
    type: String,
    required: true,
    enum: ['UGStudent', 'BBAStudent', 'PGStudent', 'UGFirstSem2025', 'PGFirstSem2025', 'UGSecondSem2024', 'UGSecondSem2025', 'UGFourthSem2024', 'PGSecondSem2025']
  },
  autonomousRollNo: {
    type: String,
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: false
  },
  ABC_ID: {
    type: String,
    required: true,
    unique: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['submitted', 'verified', 'rejected'],
    default: 'submitted'
  }
}, {
  timestamps: true
});

// Index for faster queries
ABCIDSubmissionSchema.index({ autonomousRollNo: 1 });
ABCIDSubmissionSchema.index({ status: 1 });

module.exports = mongoose.model('ABCIDSubmission', ABCIDSubmissionSchema);

