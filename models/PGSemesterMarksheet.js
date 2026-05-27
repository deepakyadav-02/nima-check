const mongoose = require('mongoose');
const { PGSubjectSchema } = require('./pgSubjectSchema');

/**
 * Unified PG marksheet — one document per student per semester (1–4).
 * Collection: pgsemestermarksheets
 */
const PGSemesterMarksheetSchema = new mongoose.Schema(
  {
    semester: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4],
    },
    rollNo: { type: String, default: '' },
    autonomousRollNo: { type: String, required: true },
    examcode: { type: String, default: '' },
    studentName: { type: String, default: '' },
    department: { type: String, default: '' },
    subjects: {
      type: [PGSubjectSchema],
      default: [],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one subject is required',
      },
    },
    grandTotal: { type: String, default: '' },
    grade: { type: String, default: '' },
    gradePoint: { type: String, default: '' },
    percentage: { type: String, default: '' },
    classification: { type: String, default: '' },
    performance: { type: String, default: '' },
    totalCredits: { type: Number, required: false },
    totalCreditPoints: { type: Number, required: false },
    sgpa: { type: Number, required: false },
    sourceCollection: {
      type: String,
      enum: ['ugmarksheets', 'pg2ndsem2024', 'pgsem3results', 'pgsem4results', 'import'],
      required: false,
    },
  },
  { timestamps: true, collection: 'pgsemestermarksheets' }
);

PGSemesterMarksheetSchema.index({ autonomousRollNo: 1, semester: 1 }, { unique: true });
PGSemesterMarksheetSchema.index({ rollNo: 1 });
PGSemesterMarksheetSchema.index({ department: 1 });
PGSemesterMarksheetSchema.index({ semester: 1 });

module.exports = mongoose.model('PGSemesterMarksheet', PGSemesterMarksheetSchema);
