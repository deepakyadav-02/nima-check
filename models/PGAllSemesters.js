const mongoose = require('mongoose');
const { PGSubjectSchema } = require('./pgSubjectSchema');

/**
 * One semester block (sem 1, 2, 3, or 4).
 */
const PGSemesterBlockSchema = new mongoose.Schema(
  {
    examcode: { type: String, default: '' },
    subjects: {
      type: [PGSubjectSchema],
      default: [],
    },
    grandTotal: { type: mongoose.Schema.Types.Mixed, default: '' },
    totalCredits: { type: Number, required: false },
    totalCreditPoints: { type: Number, required: false },
    totalMarks: { type: Number, required: false },
    sgpa: { type: mongoose.Schema.Types.Mixed, required: false },
    grade: { type: String, default: '' },
    gradePoint: { type: mongoose.Schema.Types.Mixed, default: '' },
    percentage: { type: mongoose.Schema.Types.Mixed, default: '' },
    classification: { type: String, default: '' },
    performance: { type: String, default: '' },
    /** Where this semester was imported from (e.g. ugmarksheets, pg2ndsem2024) */
    dataSource: { type: String, default: '' },
  },
  { _id: false }
);

/**
 * One PG student — all four semesters in a single document.
 * Collection: pgallsemesters
 */
const PGAllSemestersSchema = new mongoose.Schema(
  {
    autonomousRollNo: {
      type: String,
      required: true,
      trim: true,
    },
    rollNo: { type: String, default: '' },
    /** College registration number (REGD NO), e.g. 6072/24 */
    registrationNumber: { type: String, default: '' },
    studentName: { type: String, default: '' },
    department: { type: String, default: '' },
    course: { type: String, default: '' },
    dob: { type: String, default: '' },
    graduationBoard: { type: String, default: '' },

    semesters: {
      sem1: { type: PGSemesterBlockSchema, default: null },
      sem2: { type: PGSemesterBlockSchema, default: null },
      sem3: { type: PGSemesterBlockSchema, default: null },
      sem4: { type: PGSemesterBlockSchema, default: null },
    },

    /** Sum of all semesters: sem1 + sem2 + sem3 + sem4 */
    grandTotal: { type: Number, required: false, default: 0 },
    /** Per-semester mark totals used to compute grandTotal */
    semesterTotals: {
      sem1: { type: Number, default: 0 },
      sem2: { type: Number, default: 0 },
      sem3: { type: Number, default: 0 },
      sem4: { type: Number, default: 0 },
    },
    /** Full marks for all 4 semesters (by department) */
    maximumMark: { type: Number, required: false },
    /** Overall percentage: (grandTotal / maximumMark) × 100 */
    percentage: { type: Number, required: false },
  },
  { timestamps: true, collection: 'pgallsemesters' }
);

PGAllSemestersSchema.index({ autonomousRollNo: 1 }, { unique: true });
PGAllSemestersSchema.index({ rollNo: 1 });
PGAllSemestersSchema.index({ department: 1 });

/** Semesters that have at least one subject saved */
PGAllSemestersSchema.methods.getAvailableSemesters = function getAvailableSemesters() {
  const keys = ['sem1', 'sem2', 'sem3', 'sem4'];
  return keys
    .map((key, i) => ({ key, num: i + 1, block: this.semesters?.[key] }))
    .filter(({ block }) => block && Array.isArray(block.subjects) && block.subjects.length > 0)
    .map(({ num }) => num);
};

const { computeOverallSummary } = require('../utils/pgOverallMarks');

PGAllSemestersSchema.methods.getOverallSummary = function getOverallSummary() {
  return computeOverallSummary(this.toObject ? this.toObject() : this);
};

module.exports = mongoose.model('PGAllSemesters', PGAllSemestersSchema);
