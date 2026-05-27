const mongoose = require('mongoose');
const { loadEnv } = require('../utils/loadEnv');

loadEnv();

const PGAllSemesters = require('../models/PGAllSemesters');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const rows = await PGAllSemesters.find({
    registrationNumber: { $exists: true, $ne: '' },
  })
    .select('rollNo registrationNumber autonomousRollNo studentName department')
    .sort({ rollNo: 1 })
    .lean();

  console.log(`Students with registrationNumber: ${rows.length}\n`);
  for (const r of rows) {
    console.log(`${r.rollNo} → ${r.registrationNumber} (${r.studentName})`);
  }
  await mongoose.disconnect();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
