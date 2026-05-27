/**
 * Set full ODIA paper titles on pgallsemesters (sem2, sem3, sem4).
 * Run: node scripts/updateOdiaSubjectFullNames.js
 */
const mongoose = require('mongoose');
const { loadEnv } = require('../utils/loadEnv');
const PGAllSemesters = require('../models/PGAllSemesters');
const {
  isOdiaDepartment,
  applyOdiaFullNameToSubject,
  resolveOdiaFullName,
} = require('../utils/odiaPaperNames');

loadEnv();

const SEM_KEYS = [
  { key: 'sem2', num: 2 },
  { key: 'sem3', num: 3 },
  { key: 'sem4', num: 4 },
];

const run = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected. Updating ODIA subject full names...\n');

  const docs = await PGAllSemesters.find({
    $or: [{ department: /^odia$/i }, { department: /odia/i }],
  });

  console.log(`ODIA students found: ${docs.length}\n`);

  let studentsUpdated = 0;
  let subjectsUpdated = 0;

  for (const doc of docs) {
    if (!isOdiaDepartment(doc.department)) continue;

    let changed = false;

    for (const { key, num } of SEM_KEYS) {
      const block = doc.semesters?.[key];
      if (!block?.subjects?.length) continue;

      block.subjects = block.subjects.map((sub) => {
        const plain = sub.toObject?.() ?? sub;
        const before = JSON.stringify(plain.paper || {
          code: plain.paperCode,
          title: plain.paperName,
        });
        const updated = applyOdiaFullNameToSubject(num, plain);
        const after = JSON.stringify(updated.paper);
        if (after !== before) {
          subjectsUpdated += 1;
          changed = true;
        }
        return updated;
      });

      doc.markModified(`semesters.${key}.subjects`);
    }

    if (changed) {
      await doc.save();
      studentsUpdated += 1;
      console.log(`  ✓ ${doc.rollNo} — ${doc.studentName}`);
    }
  }

  console.log(`\nDone. Students updated: ${studentsUpdated}, subjects renamed: ${subjectsUpdated}`);

  const sample = await PGAllSemesters.findOne({ rollNo: 'ODIA24-001' }).lean();
  if (sample) {
    console.log('\nSample ODIA24-001 sem2 paper names:');
    (sample.semesters?.sem2?.subjects || []).forEach((s) => {
      console.log(`  ${s.paper?.code}: ${s.paper?.title}`);
    });
    console.log('sem3:');
    (sample.semesters?.sem3?.subjects || []).forEach((s) => {
      console.log(`  ${s.paper?.code}: ${s.paper?.title}`);
    });
    console.log('sem4 (Paper → full title):');
    (sample.semesters?.sem4?.subjects || []).forEach((s) => {
      console.log(`  "${s.paper?.code}": "${s.paper?.title}"`);
    });
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
