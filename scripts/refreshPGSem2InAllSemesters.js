/**
 * Re-import semester 2 from pg2ndsem2024 into pgallsemesters, then recalculate grandTotal.
 */
const mongoose = require('mongoose');
const { loadEnv } = require('../utils/loadEnv');

loadEnv();

const PGAllSemesters = require('../models/PGAllSemesters');
const { fromSem2, studentMetaFromSem2 } = require('../utils/pgSemesterMigrators');
const { applyOverallTotals } = require('../utils/pgOverallMarks');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Refreshing sem2 from pg2ndsem2024...\n');

  const cursor = mongoose.connection.db.collection('pg2ndsem2024').find({});
  let updated = 0;
  let missing = 0;

  for await (const row of cursor) {
    const roll = (
      row.autonomousRollNo ||
      row['Autonomous Roll No'] ||
      ''
    ).trim();
    if (!roll) continue;

    const sem2Block = fromSem2(row);
    let doc = await PGAllSemesters.findOne({ autonomousRollNo: roll });

    if (!doc) {
      missing += 1;
      continue;
    }

    const plain = doc.toObject();
    const meta = studentMetaFromSem2(row);
    if (meta.rollNo) plain.rollNo = meta.rollNo;
    if (meta.studentName) plain.studentName = meta.studentName;
    if (meta.department) plain.department = meta.department;

    plain.semesters = plain.semesters || {};
    plain.semesters.sem2 = sem2Block;

    const withTotals = applyOverallTotals(plain);
    await PGAllSemesters.updateOne({ autonomousRollNo: roll }, { $set: withTotals });
    updated += 1;
  }

  const sample = await PGAllSemesters.findOne({ autonomousRollNo: '111NAC24001' }).select(
    'grandTotal semesterTotals semesters.sem2.subjects'
  );

  console.log(`✅ Updated sem2 for ${updated} students`);
  console.log(`⚠️  Not in pgallsemesters: ${missing}`);
  console.log('\nSample BARSA NAYAK:');
  console.log('  sem2 subjects:', sample?.semesters?.sem2?.subjects?.length);
  console.log('  semesterTotals:', sample?.semesterTotals);
  console.log('  grandTotal:', sample?.grandTotal);
  process.exit(0);
};

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
