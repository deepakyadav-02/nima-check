const axios = require('axios');

const API = 'http://localhost:5001/api';

async function test(roll, dob, semester, studentType) {
  const login = await axios.post(`${API}/auth/login`, {
    autonomousRollNo: roll,
    dob,
  });

  const card = await axios.get(`${API}/students/admit-card`, {
    params: { autonomousRollNo: roll, semester, studentType },
    headers: { Authorization: `Bearer ${login.data.token}` },
  });

  console.log('\n===', roll, '===');
  console.log('loginType:', login.data.user.studentType);
  console.log('semesterKey:', card.data.semesterKey);
  console.log('name:', card.data.name);
  console.log('subjects:', card.data.subjects?.map((s) => `${s.label}=${s.value}`).join(' | '));
  console.log('availableSemesters:', card.data.availableSemesters?.map((s) => s.key).join(', '));
}

(async () => {
  await test('03NAC25001', '17-01-2006', '2ndsem2025', 'UG2ND2025');
  await test('03NAC24001', '24-10-2006', '4thsem2024', 'UG4TH2024');
})().catch((err) => {
  console.error(err.response?.data || err.message);
  process.exit(1);
});
