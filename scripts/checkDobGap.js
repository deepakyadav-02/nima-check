require('dotenv').config({ path: './config.env' });
const connectDB = require('../config/db');
const UGFirstSem2025 = require('../models/UGFirstSem2025');
const UGStudent = require('../models/UGStudent');
const UGSecondSem2024 = require('../models/UGSecondSem2024');
const { UGSecondSem2025, UGFourthSem2024 } = require('../models/SemesterJsonCollections');

const hasDob = (doc) => !!(doc?.dob || doc?.DOB);

(async () => {
  await connectDB();

  const samples = [
    ['03NAC25001', '2025 batch'],
    ['03NAC24001', '2024 batch'],
  ];

  for (const [roll, label] of samples) {
    console.log(`\n=== ${roll} (${label}) ===`);
    const s25 = await UGSecondSem2025.findOne({ 'Autonomous Roll No': roll });
    const s1 = await UGFirstSem2025.findOne({ 'Autonomous Roll No': roll });
    const s4 = await UGFourthSem2024.findOne({ 'Autonomous Roll No': roll });
    const ug = await UGStudent.findOne({ 'Autonomous Roll No': roll });
    const s2 = await UGSecondSem2024.findOne({ 'Autonomous Roll No': roll });

    console.log('2ndsem2025 DOB:', s25?.DOB || s25?.dob || '(missing)');
    console.log('1stsem2025 DOB:', s1?.DOB || s1?.dob || '(missing)');
    console.log('4thsem2024 DOB:', s4?.DOB || s4?.dob || '(missing)');
    console.log('ugstudents DOB:', ug?.DOB || ug?.dob || '(missing)');
    console.log('2ndsem2024 DOB:', s2?.DOB || s2?.dob || '(missing)');
  }

  const collections = [
    ['2025-2ndsem', UGSecondSem2025],
    ['2024-4thsem', UGFourthSem2024],
    ['ugfirstsem2025', UGFirstSem2025],
    ['ugstudents', UGStudent],
    ['2ndsem2024', UGSecondSem2024],
  ];

  console.log('\n=== Collection DOB counts ===');
  for (const [name, Model] of collections) {
    const total = await Model.countDocuments();
    const all = await Model.find({}, { dob: 1, DOB: 1 }).lean();
    const withDob = all.filter(hasDob).length;
    console.log(`${name}: ${withDob}/${total} have DOB`);
  }

  process.exit(0);
})();
