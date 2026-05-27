const mongoose = require('mongoose');

/** PAPERS (code) + PAPERS TITLE (title) in one nested field */
const PGPaperSchema = new mongoose.Schema(
  {
    code: { type: String, default: '' },
    title: { type: String, default: '' },
  },
  { _id: false }
);

const PGSubjectSchema = new mongoose.Schema(
  {
    paper: { type: PGPaperSchema, default: () => ({}) },
    credit: { type: Number, required: false },
    midsemMark: { type: mongoose.Schema.Types.Mixed, default: '' },
    finalMark: { type: mongoose.Schema.Types.Mixed, default: '' },
    practicalMark: { type: mongoose.Schema.Types.Mixed, default: '' },
    totalMark: { type: mongoose.Schema.Types.Mixed, default: '' },
    marks: { type: Number, required: false },
    grade: { type: String, default: '' },
    gradePoint: { type: mongoose.Schema.Types.Mixed, default: '' },
    creditPoint: { type: Number, required: false },
    percentage: { type: Number, required: false },
  },
  { _id: false }
);

module.exports = { PGPaperSchema, PGSubjectSchema };
