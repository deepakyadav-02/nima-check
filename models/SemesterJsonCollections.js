const mongoose = require('mongoose');

const semesterStudentSchema = new mongoose.Schema(
  {
    'Roll No': { type: String, required: false },
    'Autonomous Roll No': { type: String, required: false },
    'Registration No.': { type: String, required: false },
    'Name of the Students': { type: String, required: false },
    Department: { type: String, required: false },
    'Exam Code': { type: String, required: false },
    Examcode: { type: String, required: false },
  },
  {
    timestamps: false,
    strict: false,
  }
);

semesterStudentSchema.index({ 'Autonomous Roll No': 1 });
semesterStudentSchema.index({ 'Roll No': 1 });
semesterStudentSchema.index({ Department: 1 });

const UGSecondSem2025 = mongoose.model(
  'UGSecondSem2025',
  semesterStudentSchema,
  '2025-2ndsem'
);

const UGFourthSem2024 = mongoose.model(
  'UGFourthSem2024',
  semesterStudentSchema,
  '2024-4thsem'
);

module.exports = {
  semesterStudentSchema,
  UGSecondSem2025,
  UGFourthSem2024,
};
