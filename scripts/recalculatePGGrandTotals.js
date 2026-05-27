/**
 * Recompute and save grandTotal (sem1+sem2+sem3+sem4) on all pgallsemesters documents.
 * Does not touch old collections.
 */
const mongoose = require('mongoose');
const path = require('path');
const { loadEnv } = require('../utils/loadEnv');

loadEnv();

const PGAllSemesters = require('../models/PGAllSemesters');
const { applyOverallTotals } = require('../utils/pgOverallMarks');

const run = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected. Updating grand totals...\n');

  const docs = await PGAllSemesters.find({});
  let updated = 0;

  for (const doc of docs) {
    const plain = doc.toObject();
    const withTotals = applyOverallTotals(plain);
    await PGAllSemesters.updateOne(
      { _id: doc._id },
      {
        $set: {
          grandTotal: withTotals.grandTotal,
          semesterTotals: withTotals.semesterTotals,
          maximumMark: withTotals.maximumMark,
          percentage: withTotals.percentage,
        },
      }
    );
    updated += 1;
  }

  const sample = await PGAllSemesters.findOne({ autonomousRollNo: '111NAC24001' }).select(
    'studentName grandTotal maximumMark percentage semesterTotals'
  );

  console.log(`✅ Updated ${updated} documents`);
  console.log('Sample:', sample?.toObject());
  process.exit(0);
};

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
