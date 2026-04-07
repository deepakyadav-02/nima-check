const mongoose = require('mongoose');

/**
 * One PG marksheet course row (matches JSONS/pgmarkwith_rollnumber.json `courses[]`).
 * 2nd sem may use PAPER2.1, PAPER2.2, etc.; same field shape.
 */
const PGSecondSem2024CourseSchema = new mongoose.Schema(
  {
    subjectName: { type: String, required: false },
    courseType: { type: String, required: false },
    credit: { type: Number, required: false },
    midsem: { type: Number, required: false },
    endsem: { type: Number, required: false },
    practical: { type: Number, required: false },
    marks: { type: Number, required: false },
    grade: { type: String, required: false },
    gradePoint: { type: Number, required: false },
    creditPoint: { type: Number, required: false },
    percentage: { type: Number, required: false },
  },
  { _id: false }
);

const PGSecondSem2024Schema = new mongoose.Schema(
  {
    collegeRollNo: { type: String, required: false },
    autonomousRollNo: { type: String, required: false },
    applicantName: { type: String, required: false },
    dob: { type: String, required: false },
    course: { type: String, required: false },
    graduationBoard: { type: String, required: false },
    semester: { type: Number, required: false },
    courses: { type: [PGSecondSem2024CourseSchema], default: [] },

    totalCredits: { type: Number, required: false },
    totalMarks: { type: Number, required: false },
    totalCreditPoints: { type: Number, required: false },
    sgpa: { type: Number, required: false },
    percentage: { type: Number, required: false },
    classification: { type: String, required: false },
    department: { type: String, required: false },
    studentType: { type: String, required: false },
  },
  {
    timestamps: false,
    strict: false,
  }
);

PGSecondSem2024Schema.index({ autonomousRollNo: 1 });
PGSecondSem2024Schema.index({ collegeRollNo: 1 });
PGSecondSem2024Schema.index({ department: 1 });
PGSecondSem2024Schema.index({ semester: 1 });

module.exports = mongoose.model('PGSecondSem2024', PGSecondSem2024Schema, 'pg2ndsem2024');
