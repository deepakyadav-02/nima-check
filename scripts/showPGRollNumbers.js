require('dotenv').config({ path: require('path').join(__dirname, '../config.env') });
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const col = mongoose.connection.db.collection('pg2025-2ndsem');
  const depts = ['CHEMISTRY', 'COMMERCE', 'GEOLOGY', 'MATH', 'ODIA'];

  for (const dept of depts) {
    const s = await col.findOne({ Department: dept });
    console.log(dept + ':');
    console.log('  EXAM ROLL NUMBER   (College Roll No)  :', s['College Roll No']);
    console.log('  COLLEGE NUMBER     (Autonomous Roll No):', s['Autonomous Roll No']);
  }

  const mfc = await col.findOne({ 'College Roll No': /^MFC/ });
  if (mfc) {
    console.log('MFC:');
    console.log('  EXAM ROLL NUMBER   (College Roll No)  :', mfc['College Roll No']);
    console.log('  COLLEGE NUMBER     (Autonomous Roll No):', mfc['Autonomous Roll No']);
  }

  await mongoose.disconnect();
})();
