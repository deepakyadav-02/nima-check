/**
 * Set Commerce full paper titles on pgallsemesters (sem2–sem4).
 * Run: node scripts/updateCommerceSubjectFullNames.js
 */
const mongoose = require('mongoose');
const { loadEnv } = require('../utils/loadEnv');
const PGAllSemesters = require('../models/PGAllSemesters');
const { applyCommerceFullNameToSubject, isCommerceDepartment } = require('../utils/commercePaperNames');
const { fromSem2 } = require('../utils/pgSemesterMigrators');
const { applyOverallTotals } = require('../utils/pgOverallMarks');

loadEnv();

const SEM_KEYS = [
  { key: 'sem2', num: 2 },
  { key: 'sem3', num: 3 },
  { key: 'sem4', num: 4 },
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Updating Commerce subject full titles...\n');

  const docs = await PGAllSemesters.find({ department: /comm/i });

  console.log(`Commerce students: ${docs.length}\n`);

  let studentsUpdated = 0;
  let subjectsUpdated = 0;

  for (const doc of docs) {
    if (!isCommerceDepartment(doc.department)) continue;

    const roll = doc.autonomousRollNo?.trim();
    if (roll) {
      const sem2Row = await mongoose.connection.db.collection('pg2ndsem2024').findOne({
        $or: [{ autonomousRollNo: roll }, { 'Autonomous Roll No': roll }],
      });
      if (sem2Row) {
        doc.semesters.sem2 = fromSem2(sem2Row);
        doc.markModified('semesters.sem2');
      }
    }

    let changed = false;
    for (const { key, num } of SEM_KEYS) {
      const block = doc.semesters?.[key];
      if (!block?.subjects?.length) continue;

      block.subjects = block.subjects.map((sub) => {
        const plain = sub.toObject?.() ?? sub;
        const before = JSON.stringify(plain.paper);
        const updated = applyCommerceFullNameToSubject(num, plain);
        if (JSON.stringify(updated.paper) !== before) {
          subjectsUpdated += 1;
          changed = true;
        }
        return updated;
      });
      doc.markModified(`semesters.${key}.subjects`);
    }

    if (changed || doc.isModified()) {
      const withTotals = applyOverallTotals(doc.toObject());
      await PGAllSemesters.updateOne({ _id: doc._id }, { $set: withTotals });
      studentsUpdated += 1;
      console.log(`  ✓ ${doc.rollNo} — ${doc.studentName}`);
    }
  }

  console.log(`\nDone. Students: ${studentsUpdated}, subjects: ${subjectsUpdated}`);

  const sample = await PGAllSemesters.findOne({ rollNo: 'COMM24-001' }).lean();
  if (sample) {
    console.log('\nSample COMM24-001:');
    console.log('  sem2:', sample.semesters?.sem2?.subjects?.[0]?.paper);
    console.log('  sem3:', sample.semesters?.sem3?.subjects?.[0]?.paper);
    console.log('  sem4:', sample.semesters?.sem4?.subjects?.[0]?.paper);
  }

  await mongoose.disconnect();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
