require('dotenv').config({ path: require('path').join(__dirname, '../config.env') });
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const col = mongoose.connection.db.collection('pg2025-2ndsem');

  const chem = await col.findOne({ Department: 'CHEMISTRY' });
  console.log('Chemistry sample:');
  console.log('  Autonomous Roll No:', chem['Autonomous Roll No']);
  console.log('  College Roll No   :', chem['College Roll No']);
  console.log('  CH-408:', chem['CH-408'], '| CH-409:', chem['CH-409']);

  const mfc = await col.findOne({ Stream: 'COMMERCE', Department: { $exists: false } });
  console.log('\nMFC sample:');
  console.log('  Autonomous Roll No:', mfc ? mfc['Autonomous Roll No'] : 'NOT FOUND');
  console.log('  PAPER-1.1:', mfc ? mfc['PAPER-1.1'] : '-');

  const odia = await col.findOne({ Department: 'ODIA' });
  console.log('\nOdia sample:');
  console.log('  Autonomous Roll No:', odia['Autonomous Roll No']);
  console.log('  PAPER-2.1:', odia['PAPER-2.1']);

  const math = await col.findOne({ Department: 'MATH' });
  console.log('\nMath sample:');
  console.log('  Autonomous Roll No:', math['Autonomous Roll No']);
  console.log('  MTC-201:', math['MTC-201'], '| MTC-202:', math['MTC-202']);

  // Test rollNumberQuery search
  const byRoll = await col.findOne({ 'Autonomous Roll No': chem['Autonomous Roll No'] });
  console.log('\nRoll number search test:', byRoll ? '✅ FOUND' : '❌ NOT FOUND');

  await mongoose.disconnect();
  console.log('\n✅ Verification complete');
})();
