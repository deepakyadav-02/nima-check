require('dotenv').config({ path: require('path').join(__dirname, '../config.env') });
const connectDB = require('../config/db');
const UGFirstSem2025 = require('../models/UGFirstSem2025');
const { UGSecondSem2025 } = require('../models/SemesterJsonCollections');

const getDob = (record) => {
  const value = record?.dob ?? record?.DOB;
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
};

const buildDobLookup = (firstSemRecords) => {
  const byAutonomous = new Map();
  const byCollege = new Map();

  for (const record of firstSemRecords) {
    const dob = getDob(record);
    if (!dob) continue;

    const autonomousRoll = String(record['Roll No'] || '').trim();
    const collegeRoll = String(record['Autonomous Roll No'] || '').trim();

    if (autonomousRoll) byAutonomous.set(autonomousRoll, dob);
    if (collegeRoll) byCollege.set(collegeRoll, dob);
  }

  return { byAutonomous, byCollege };
};

const resolveDob = (student, lookup) => {
  const autonomousRoll = String(student['Autonomous Roll No'] || '').trim();
  const collegeRoll = String(student['Roll No'] || '').trim();

  return (
    getDob(student) ||
    (autonomousRoll && lookup.byAutonomous.get(autonomousRoll)) ||
    (collegeRoll && lookup.byCollege.get(collegeRoll)) ||
    null
  );
};

const copyDobTo2ndSem2025 = async () => {
  await connectDB();

  const [students, firstSemRecords] = await Promise.all([
    UGSecondSem2025.find({}).lean(),
    UGFirstSem2025.find({}, { 'Roll No': 1, 'Autonomous Roll No': 1, dob: 1, DOB: 1 }).lean(),
  ]);

  console.log(`2025-2ndsem records: ${students.length}`);
  console.log(`ugfirstsem2025 records: ${firstSemRecords.length}\n`);

  const lookup = buildDobLookup(firstSemRecords);
  const bulkOps = [];
  let alreadyHadDob = 0;
  let noMatch = 0;

  for (const student of students) {
    if (getDob(student)) {
      alreadyHadDob++;
      continue;
    }

    const dob = resolveDob(student, lookup);
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
    const result = await UGSecondSem2025.bulkWrite(bulkOps, { ordered: false });
    console.log(`Bulk updated: ${result.modifiedCount}`);
  }

  const withDob = await UGSecondSem2025.countDocuments({
    $or: [{ dob: { $exists: true, $nin: [null, ''] } }, { DOB: { $exists: true, $nin: [null, ''] } }],
  });

  console.log('\n' + '='.repeat(60));
  console.log('DOB copy summary (ugfirstsem2025 -> 2025-2ndsem)');
  console.log('='.repeat(60));
  console.log(`Total in 2025-2ndsem:     ${students.length}`);
  console.log(`Updated with DOB:         ${bulkOps.length}`);
  console.log(`Already had DOB:          ${alreadyHadDob}`);
  console.log(`No DOB match found:       ${noMatch}`);
  console.log(`2025-2ndsem now has DOB:  ${withDob}/${students.length}`);

  const sample = await UGSecondSem2025.findOne({ 'Autonomous Roll No': '03NAC25001' }, { dob: 1, DOB: 1 }).lean();
  console.log(`\nSample 03NAC25001 dob: ${sample?.dob || sample?.DOB || '(missing)'}`);

  process.exit(0);
};

copyDobTo2ndSem2025().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
