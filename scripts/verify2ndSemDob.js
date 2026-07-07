require('dotenv').config({ path: './config.env' });
const connectDB = require('../config/db');
const { UGSecondSem2025 } = require('../models/SemesterJsonCollections');
const { getAdmitCardData } = require('../utils/admitCardService');
const { findStudentByRoll, enrichStudentRecord } = require('../utils/studentLookup');

(async () => {
  await connectDB();

  const all = await UGSecondSem2025.find({}).lean();
  const missing = all.filter((s) => !(s.dob || s.DOB));
  console.log('Missing DOB:', missing.length);
  if (missing[0]) {
    console.log('Student without DOB:', missing[0]['Autonomous Roll No'], missing[0]['Name of the Students']);
  }

  const card = await getAdmitCardData('03NAC25001', { semesterKey: '2ndsem2025' });
  console.log('Admit card DOB (03NAC25001):', card.dob);

  const { student } = await findStudentByRoll('03NAC25001');
  const enriched = await enrichStudentRecord(student);
  console.log('Login DOB (03NAC25001):', enriched.dob);

  process.exit(0);
})();
