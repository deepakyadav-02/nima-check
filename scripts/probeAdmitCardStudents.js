require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const rolls = ['03NAC25001', '03NAC24001'];
  const collections = ['ugstudents', 'ugfirstsem2025', '2025-2ndsem', '2024-4thsem'];

  for (const roll of rolls) {
    console.log(`\nRoll: ${roll}`);
    for (const coll of collections) {
      const doc = await db.collection(coll).findOne({ 'Autonomous Roll No': roll });
      console.log(`  ${coll}:`, doc ? doc['Name of the Students'] : 'NOT FOUND');
    }
  }

  await mongoose.disconnect();
}

main();
