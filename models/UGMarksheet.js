const mongoose = require('mongoose');
const UGMarksheetSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UGStudent',
      required: true,
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
          enum: [
            'Major-cp-1',
            'Minor',
            'Major-cp-2',
            'Multidisciplinary',
            'AEC',
            'SEC',
            'VAC',
            'Internship',
            'Other',
          ],
          default: 'Other',
        },
        credit: { type: Number, required: true },
        theory: { type: Number, required: false },
        internal: { type: Number, required: false },
        practical: { type: Number, required: false },
        marks: { type: Number, required: true },
        grade: { type: String, required: false },
        gradePoint: { type: Number, required: false },
        creditPoint: { type: Number, required: false },
      },
    ],

    // Summary of calculated data
    totalCredits: { type: Number, required: false },
    totalCreditPoints: { type: Number, required: false },
    sgpa: { type: Number, required: false },
    percentage: { type: Number, required: false },
    classification: { type: String, required: false },

    // Audit trail
    createdBy: { type: String, required: false }, // Admin username or ID
    updatedBy: { type: String, required: false },
  },
  { timestamps: true }
);

// Indexes for faster queries
UGMarksheetSchema.index({ student: 1 });
UGMarksheetSchema.index({ semester: 1 });

module.exports = mongoose.model('UGMarksheet', UGMarksheetSchema);

