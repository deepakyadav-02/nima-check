require('dotenv').config({ path: require('path').join(__dirname, '../config.env') });
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const col = mongoose.connection.db.collection('pgfirstsem2025');

  const total = await col.countDocuments();
  console.log('Total PG 1st sem docs:', total);

  // get one of each type
  const withMTC = await col.findOne({ 'PAPER-MTC-101': { $exists: true } });
  const withPaper = await col.findOne({ 'PAPER-1.1': { $exists: true } });

  if (withMTC) {
    console.log('\nSample with PAPER-MTC-101:');
    console.log('  Autonomous Roll No:', withMTC['Autonomous Roll No']);
    console.log('  Department:', withMTC.Department);
    console.log('  Stream:', withMTC.Stream);
    console.log('  Keys:', Object.keys(withMTC).filter(k => k !== '_id').join(', '));
  }

  if (withPaper) {
    console.log('\nSample with PAPER-1.1:');
    console.log('  Autonomous Roll No:', withPaper['Autonomous Roll No']);
    console.log('  Department:', withPaper.Department);
    console.log('  Stream:', withPaper.Stream);
    console.log('  Keys:', Object.keys(withPaper).filter(k => k !== '_id').join(', '));
  }

  // Check if a PG 2nd sem student's roll also exists in 1st sem
  const pg2ndSem = mongoose.connection.db.collection('pg2025-2ndsem');
  const chemStudent = await pg2ndSem.findOne({ Department: 'CHEMISTRY' });
  if (chemStudent) {
    const roll = chemStudent['Autonomous Roll No'];
    console.log('\nChecking if PG 2nd sem Chemistry student exists in 1st sem...');
    console.log('  Roll:', roll);
    const inFirstSem = await col.findOne({ 'Autonomous Roll No': roll });
    console.log('  Found in pgfirstsem2025:', inFirstSem ? 'YES' : 'NO');
  }

  await mongoose.disconnect();
})();
