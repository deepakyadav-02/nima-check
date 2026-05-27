/**
 * Migrate subjects to paper: { code, title } — remove paperCode, paperName, subjectName, courseType.
 * Run: node scripts/migratePGSubjectPaperField.js
 */
const mongoose = require('mongoose');
const { loadEnv } = require('../utils/loadEnv');
const { migrateSubjectToPaperShape } = require('../utils/pgSubjectPaper');

loadEnv();

const PGAllSemesters = require('../models/PGAllSemesters');
const PGSem3Result = require('../models/PGSem3Result');
const PGSem4Result = require('../models/PGSem4Result');

const migrateSubjectsArray = (subjects) =>
  (subjects || []).map((s) => migrateSubjectToPaperShape(s.toObject?.() ?? s));

const migrateAllSemestersDoc = (doc) => {
  let changed = false;
  for (const key of ['sem1', 'sem2', 'sem3', 'sem4']) {
    const block = doc.semesters?.[key];
    if (!block?.subjects?.length) continue;
    const next = migrateSubjectsArray(block.subjects);
    if (JSON.stringify(next) !== JSON.stringify(block.subjects)) {
      block.subjects = next;
      doc.markModified(`semesters.${key}.subjects`);
      changed = true;
    }
  }
  return changed;
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Migrating to paper: { code, title }...\n');

  let n = 0;
  for await (const doc of PGAllSemesters.find({})) {
    if (migrateAllSemestersDoc(doc)) {
      await doc.save();
      n += 1;
    }
  }
  console.log(`pgallsemesters: ${n} documents updated`);

  n = 0;
  for await (const doc of PGSem3Result.find({})) {
    const next = migrateSubjectsArray(doc.subjects);
    doc.subjects = next;
    await doc.save();
    n += 1;
  }
  console.log(`pgsem3results: ${n} documents updated`);

  n = 0;
  for await (const doc of PGSem4Result.find({})) {
    const next = migrateSubjectsArray(doc.subjects);
    doc.subjects = next;
    await doc.save();
    n += 1;
  }
  console.log(`pgsem4results: ${n} documents updated`);

  const sample = await PGAllSemesters.findOne({ rollNo: 'ODIA24-001' }).lean();
  const s = sample?.semesters?.sem3?.subjects?.[0];
  console.log('\nSample sem3 subject:', JSON.stringify(s, null, 2));

  await mongoose.disconnect();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
