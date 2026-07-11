require('dotenv').config({ path: require('path').join(__dirname, '../config.env') });
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const col = mongoose.connection.db.collection('pgfirstsem2025');

  // Check PAPER-1.8 sample
  const with18 = await col.findOne({ 'PAPER-1.8': { $exists: true } });
  if (with18) {
    const paperKeys = Object.keys(with18).filter(k => k.startsWith('PAPER'));
    console.log('PAPER-1.8 sample:');
    console.log('  Roll:', with18['Autonomous Roll No'], '| Stream:', with18.Stream);
    console.log('  Paper fields:', paperKeys.join(', '));
    console.log('  Values:', paperKeys.map(k => `${k}=${JSON.stringify(with18[k])}`).join(', '));
  }

  // Check what PAPER-1 (without dot) is
  const withP1 = await col.findOne({ 'PAPER-1': { $exists: true } });
  if (withP1) {
    console.log('\nPAPER-1 field value:', JSON.stringify(withP1['PAPER-1']));
  }

  await mongoose.disconnect();
})();
