require('dotenv').config({ path: require('path').join(__dirname, '../config.env') });
const connectDB = require('../config/db');
const UGStudent = require('../models/UGStudent');
const { UGFourthSem2024 } = require('../models/SemesterJsonCollections');

const getDob = (record) => {
  const value = record?.dob ?? record?.DOB;
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
};

const copyDobTo4thSem2024 = async () => {
  await connectDB();

  const [students, ugRecords] = await Promise.all([
    UGFourthSem2024.find({}).lean(),
    UGStudent.find({}, { 'Autonomous Roll No': 1, dob: 1, DOB: 1 }).lean(),
  ]);

  const dobByRoll = new Map();
  for (const record of ugRecords) {
    const dob = getDob(record);
    const roll = String(record['Autonomous Roll No'] || '').trim();
    if (roll && dob) dobByRoll.set(roll, dob);
  }

  const bulkOps = [];
  let alreadyHadDob = 0;
  let noMatch = 0;

  for (const student of students) {
    if (getDob(student)) {
      alreadyHadDob++;
      continue;
    }

    const roll = String(student['Autonomous Roll No'] || '').trim();
    const dob = roll ? dobByRoll.get(roll) : null;
    if (!dob) {
      noMatch++;
      continue;
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: student._id },
        update: { $set: { dob } },
      },
    });
  }

  if (bulkOps.length > 0) {
    const result = await UGFourthSem2024.bulkWrite(bulkOps, { ordered: false });
    console.log(`Bulk updated: ${result.modifiedCount}`);
  }

  const withDob = await UGFourthSem2024.countDocuments({
    $or: [{ dob: { $exists: true, $nin: [null, ''] } }, { DOB: { $exists: true, $nin: [null, ''] } }],
  });

  console.log('\n' + '='.repeat(60));
  console.log('DOB copy summary (ugstudents -> 2024-4thsem)');
  console.log('='.repeat(60));
  console.log(`Total in 2024-4thsem:     ${students.length}`);
  console.log(`Updated with DOB:         ${bulkOps.length}`);
  console.log(`Already had DOB:          ${alreadyHadDob}`);
  console.log(`No DOB match found:       ${noMatch}`);
  console.log(`2024-4thsem now has DOB:  ${withDob}/${students.length}`);

  process.exit(0);
};

copyDobTo4thSem2024().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
