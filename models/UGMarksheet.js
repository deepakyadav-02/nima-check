const mongoose = require('mongoose');
const UGMarksheetSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'studentType',
      required: true,
    },
    studentType: {
      type: String,
      enum: ['UGStudent', 'PGStudent', 'BBAStudent'],
      required: true,
      default: 'UGStudent'
    },
    semester: {
      type: Number,
      required: true,
    },
    courses: [
      {
        subjectName: { type: String, required: true },
        courseType: {
          type: String,
          validate: {
            validator: function(v) {
              if (!v || typeof v !== 'string') return false;
              
              // Allow UG course types
              const ugTypes = [
                'Major-CP-1', 'Major-CP-2', 'Major-Cp-1', 'Major-Cp-2',
                'Major-cp-1', 'Major-cp-2', 'Minor-1', 'Minor',
                'MDC-1', 'MDC', 'AEC', 'AEC-P-101', 'AEC-P-102',
                'SEC', 'VAC', 'Vac', 'Vac-101', 'VAC-101',
                'P-101', 'P-102', 'P-103', 'P-101 (2)',
                'Multidisciplinary', 'Internship', 'Other'
              ];
              
              // Allow any string starting with "PAPER" (for PG students - ODIA, etc.)
              if (v.toUpperCase().startsWith('PAPER')) {
                return true;
              }
              
              // Allow PG course codes like MTC101, MTC102, etc. (for MATH and other departments)
              // Pattern: 3-4 letters followed by 3-4 digits (e.g., MTC101, CHEM201, etc.)
              const pgCodePattern = /^[A-Z]{2,4}\d{3,4}$/i;
              if (pgCodePattern.test(v)) {
                return true;
              }
              
              // Allow other known UG types
              return ugTypes.includes(v) || v === 'Other';
            },
            message: 'Invalid course type'
          },
          default: 'Other',
        },
        credit: { type: Number, required: true },
        theory: { type: Number, required: false },
        internal: { type: Number, required: false },
        midsem: { type: Number, required: false }, // PG format
        endsem: { type: Number, required: false }, // PG format
        practical: { type: Number, required: false },
        marks: { type: Number, required: true },
        grade: { type: String, required: false },
        gradePoint: { type: Number, required: false },
        creditPoint: { type: Number, required: false },
        percentage: { type: Number, required: false }, // PG format
      },
    ],

    // Summary of calculated data
    totalCredits: { type: Number, required: false },
    totalCreditPoints: { type: Number, required: false },
    sgpa: { type: Number, required: false },
    percentage: { type: Number, required: false },
    classification: { type: String, required: false },
    department: { type: String, required: false }, // Department/Course name (ODIA, MATH, CHEM, etc.)

    // Audit trail
    createdBy: { type: String, required: false }, // Admin username or ID
    updatedBy: { type: String, required: false },
  },
  { timestamps: true }
);

// Indexes for faster queries
UGMarksheetSchema.index({ student: 1 });
UGMarksheetSchema.index({ semester: 1 });
UGMarksheetSchema.index({ studentType: 1 });
UGMarksheetSchema.index({ student: 1, studentType: 1, semester: 1 });

module.exports = mongoose.model('UGMarksheet', UGMarksheetSchema);

