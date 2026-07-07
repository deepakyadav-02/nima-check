require('dotenv').config({ path: './config.env' });
const connectDB = require('../config/db');
const { getAdmitCardData } = require('../utils/admitCardService');

async function main() {
  await connectDB();
  const roll = process.argv[2] || '03NAC24001';

  const initial = await getAdmitCardData(roll, { studentType: 'UG4TH2024' });
  console.log('Default:', initial.semesterKey, initial.semesterLabel);
  console.log('Available:', initial.availableSemesters);
  console.log('Subjects:', initial.subjects?.map((s) => s.value).join(', '));

  if (initial.availableSemesters.length > 1) {
    const other = initial.availableSemesters.find((s) => s.key !== initial.semesterKey);
    if (other) {
      const switched = await getAdmitCardData(roll, { semesterKey: other.key });
      console.log('\nSwitched to:', switched.semesterKey, switched.semesterLabel);
      console.log('Subjects:', switched.subjects?.map((s) => s.value).join(', '));
    }
  }

  const roll25 = '03NAC25001';
  const sem25 = await getAdmitCardData(roll25, { studentType: 'UG2ND2025' });
  console.log('\n2025 student:', sem25.semesterKey, sem25.availableSemesters);
  console.log('Subjects:', sem25.subjects?.map((s) => `${s.label}=${s.value}`).join(' | '));

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
