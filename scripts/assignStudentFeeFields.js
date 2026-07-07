/**
 * Assign feeYearLevel, feeStream, and optionally feeCategory on UG students.
 *
 * Usage:
 *   node scripts/assignStudentFeeFields.js
 *   node scripts/assignStudentFeeFields.js --category=boys
 */
require('dotenv').config({ path: './config.env', override: false });
require('dotenv').config({ path: './.env', override: false });

const mongoose = require('mongoose');
const UGStudent = require('../models/UGStudent');
const {
  inferYearLevel,
  mapDepartmentToStream,
  normalizeCategory,
} = require('../utils/feeCalculator');

const assignStudentFeeFields = async () => {
  const categoryArg = process.argv.find((arg) => arg.startsWith('--category='));
  const defaultCategory = categoryArg ? categoryArg.split('=')[1] : null;

  await mongoose.connect(process.env.MONGO_URI);
  const students = await UGStudent.find({});
  let updated = 0;

  for (const student of students) {
    const updates = {
      feeYearLevel: inferYearLevel(student),
      feeStream: mapDepartmentToStream(student.Department, student.Stream, 'UG'),
    };

    const existingCategory = student.feeCategory || normalizeCategory(student.Gender || student.Category);
    if (existingCategory) {
      updates.feeCategory = existingCategory;
    } else if (defaultCategory) {
      updates.feeCategory = defaultCategory;
    }

    await UGStudent.updateOne({ _id: student._id }, { $set: updates });
    updated += 1;
  }

  console.log(`Updated fee fields for ${updated} UG students.`);
  if (!defaultCategory) {
    console.log('Note: feeCategory was only set where Gender/Category already exists.');
    console.log('Run with --category=boys|girls|scStPh only if applying one category to all (not recommended).');
  }

  await mongoose.connection.close();
};

assignStudentFeeFields().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
