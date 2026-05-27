/**
 * Refresh only sem3 + sem4 in pgallsemesters from pgsem3results / pgsem4results.
 * Keeps sem1, sem2, registrationNumber, and other existing fields.
 *
 * Run after:
 *   node scripts/importPGSem3Results.js
 *   node scripts/importPGSem4Results.js
 *
 * Then:
 *   node scripts/refreshPGSem3Sem4InAllSemesters.js
 *   node scripts/updateOdiaSubjectFullNames.js
 *   node scripts/recalculatePGGrandTotals.js
 */
const mongoose = require('mongoose');
const { loadEnv } = require('../utils/loadEnv');

loadEnv();

const PGSem3Result = require('../models/PGSem3Result');
const PGSem4Result = require('../models/PGSem4Result');
const PGAllSemesters = require('../models/PGAllSemesters');
const { fromSem3Or4, studentMetaFromSem3Or4 } = require('../utils/pgSemesterMigrators');
const { applyOverallTotals } = require('../utils/pgOverallMarks');

const mergeMeta = (target, meta) => {
  if (!meta) return;
  if (meta.rollNo) target.rollNo = meta.rollNo;
  if (meta.studentName) target.studentName = meta.studentName;
  if (meta.department) target.department = meta.department;
  if (meta.course) target.course = meta.course;
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Refreshing pgallsemesters sem3 + sem4...\n');

  const stats = { sem3: 0, sem4: 0, created: 0, failed: [] };

  const sem3Docs = await PGSem3Result.find({});
  for (const row of sem3Docs) {
    try {
      const roll = row.autonomousRollNo?.trim();
      if (!roll) continue;

      let doc = await PGAllSemesters.findOne({ autonomousRollNo: roll });
      if (!doc) {
        doc = new PGAllSemesters({
          autonomousRollNo: roll,
          semesters: { sem1: null, sem2: null, sem3: null, sem4: null },
        });
        stats.created += 1;
      }

      mergeMeta(doc, studentMetaFromSem3Or4(row.toObject()));
      if (!doc.semesters) doc.semesters = {};
      doc.semesters.sem3 = fromSem3Or4(row.toObject(), 'pgsem3results', 3);

      const withTotals = applyOverallTotals(doc.toObject());
      await PGAllSemesters.findOneAndUpdate(
        { autonomousRollNo: roll },
        { $set: withTotals },
        { upsert: true }
      );
      stats.sem3 += 1;
    } catch (e) {
      stats.failed.push({ sem: 3, roll: row.autonomousRollNo, error: e.message });
    }
  }

  const sem4Docs = await PGSem4Result.find({});
  for (const row of sem4Docs) {
    try {
      const roll = row.autonomousRollNo?.trim();
      if (!roll) continue;

      let doc = await PGAllSemesters.findOne({ autonomousRollNo: roll });
      if (!doc) {
        doc = new PGAllSemesters({
          autonomousRollNo: roll,
          semesters: { sem1: null, sem2: null, sem3: null, sem4: null },
        });
        stats.created += 1;
      }

      mergeMeta(doc, studentMetaFromSem3Or4(row.toObject()));
      if (!doc.semesters) doc.semesters = {};
      doc.semesters.sem4 = fromSem3Or4(row.toObject(), 'pgsem4results', 4);

      const withTotals = applyOverallTotals(doc.toObject());
      await PGAllSemesters.findOneAndUpdate(
        { autonomousRollNo: roll },
        { $set: withTotals },
        { upsert: true }
      );
      stats.sem4 += 1;
    } catch (e) {
      stats.failed.push({ sem: 4, roll: row.autonomousRollNo, error: e.message });
    }
  }

  console.log(`Sem3 updated: ${stats.sem3}`);
  console.log(`Sem4 updated: ${stats.sem4}`);
  console.log(`New pgallsemesters docs: ${stats.created}`);
  console.log(`Failed: ${stats.failed.length}`);
  if (stats.failed.length) console.log(stats.failed.slice(0, 5));

  const total = await PGAllSemesters.countDocuments();
  const sample = await PGAllSemesters.findOne({ rollNo: 'ODIA24-001' })
    .select('rollNo studentName registrationNumber semesters.sem3 semesters.sem4 grandTotal')
    .lean();
  console.log(`\nTotal pgallsemesters: ${total}`);
  if (sample) {
    const s3 = sample.semesters?.sem3?.subjects?.[0];
    const s4 = sample.semesters?.sem4?.subjects?.[0];
    console.log('Sample ODIA24-001:', {
      reg: sample.registrationNumber,
      grandTotal: sample.grandTotal,
      sem3paper: s3?.paper,
      sem3credit: s3?.credit,
      sem4paper: s4?.paper,
      sem4credit: s4?.credit,
    });
  }

  await mongoose.disconnect();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
