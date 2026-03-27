const mongoose = require('mongoose');

const UGSecondSem2024CourseSchema = new mongoose.Schema(
  {
    Subject: { type: String, required: false },
    'PracticalMark(20)': { type: String, required: false },
    'I-Practical': { type: String, required: false },
    'Attandance(5)': { type: String, required: false },
    'SurpriseTest(10/5)': { type: String, required: false },
    'Assignment(5)': { type: String, required: false },
    'FinalMark-1': { type: String, required: false },
    TotalMark: { type: String, required: false },
    Grade: { type: String, required: false },
    'Grade Point': { type: String, required: false },
    CreditPoint: { type: String, required: false },
    GraceMark: { type: String, required: false },
    'MidsemMark(10/20)': { type: String, required: false },
    FinalMark: { type: String, required: false },
  },
  { _id: false }
);

const UGSecondSem2024Schema = new mongoose.Schema(
  {
    'Roll No': { type: String, required: false },
    'Autonomous Roll No': { type: String, required: false },
    Examcode: { type: String, required: false },
    Department: { type: String, required: false },
    'Name of the Students': { type: String, required: false },

    // 2nd sem subject blocks (as in JSON)
    'Major-3': { type: UGSecondSem2024CourseSchema, required: false },
    'Major-4': { type: UGSecondSem2024CourseSchema, required: false },
    'MINOR-2(20)': { type: UGSecondSem2024CourseSchema, required: false },
    'Multi Disciplinary-2': { type: UGSecondSem2024CourseSchema, required: false },
    'AEC-2': { type: UGSecondSem2024CourseSchema, required: false },
    'SEC-I': { type: UGSecondSem2024CourseSchema, required: false },

    // totals/summary (as in JSON)
    GrandTotalMark: { type: String, required: false },
    TotalCreditPoint: { type: String, required: false },
    TotalCredit: { type: String, required: false },
    SGPA: { type: String, required: false },
    Percentage: { type: String, required: false },
    Classification: { type: String, required: false },
  },
  {
    timestamps: false,
    // Collection holds UG and BBA 2nd-sem shapes (different course keys); do not strip unknown fields.
    strict: false,
  }
);

UGSecondSem2024Schema.index({ 'Autonomous Roll No': 1 });
UGSecondSem2024Schema.index({ 'Roll No': 1 });
UGSecondSem2024Schema.index({ Department: 1 });

// Explicit collection name (no pluralization)
module.exports = mongoose.model('UGSecondSem2024', UGSecondSem2024Schema, '2ndsem2024');

