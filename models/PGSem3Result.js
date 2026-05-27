const mongoose = require('mongoose');
const { PGSubjectSchema } = require('./pgSubjectSchema');

const PGSem3ResultSchema = new mongoose.Schema(
  {
    semester: { type: Number, default: 3, required: true },
    rollNo: { type: String, required: true },
    autonomousRollNo: { type: String, required: true },
    examcode: { type: String, default: '' },
    department: { type: String, default: '' },
    studentName: { type: String, required: true },
    subjects: {
      type: [PGSubjectSchema],
      required: true,
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
  },
  { timestamps: true, collection: 'pgsem3results' }
);

PGSem3ResultSchema.index({ autonomousRollNo: 1 }, { unique: true });
PGSem3ResultSchema.index({ rollNo: 1 });
PGSem3ResultSchema.index({ department: 1 });
PGSem3ResultSchema.index({ examcode: 1 });

module.exports = mongoose.model('PGSem3Result', PGSem3ResultSchema);
