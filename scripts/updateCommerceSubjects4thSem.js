/**
 * Updates CORE-1 MAJOR-8/9/10 and CORE-2 MINOR-4 for all Commerce
 * department students in:
 *   - JSON file: nima-check/JSONS/json/excel-to-json4thsem(2024).json
 *   - MongoDB collection: 2024-4thsem
 */

require('dotenv').config({ path: require('path').join(__dirname, '../config.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const JSON_FILE = path.join(__dirname, '../JSONS/json/excel-to-json4thsem(2024).json');

const NEW_SUBJECTS = {
  'CORE-1 MAJOR-8': 'FM & RM',
  'CORE-1 MAJOR-9': 'A & CG',
  'CORE-1 MAJOR-10': 'CLF',
  'CORE-2 MINOR-4': 'BRF',
};

// ─── 1. Update JSON file ──────────────────────────────────────────────────────
const updateJson = () => {
  const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));

  let count = 0;
  const updated = data.map((student) => {
    if (String(student.Department || '').trim().toLowerCase() === 'commerce') {
      count++;
      return { ...student, ...NEW_SUBJECTS };
    }
    return student;
  });

  fs.writeFileSync(JSON_FILE, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`✅ JSON updated — ${count} Commerce students modified.`);
  return count;
};

// ─── 2. Update MongoDB ────────────────────────────────────────────────────────
const updateMongo = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  const collection = db.collection('2024-4thsem');

  const result = await collection.updateMany(
    { Department: { $regex: /^commerce$/i } },
    {
      $set: {
        'CORE-1 MAJOR-8': NEW_SUBJECTS['CORE-1 MAJOR-8'],
        'CORE-1 MAJOR-9': NEW_SUBJECTS['CORE-1 MAJOR-9'],
        'CORE-1 MAJOR-10': NEW_SUBJECTS['CORE-1 MAJOR-10'],
        'CORE-2 MINOR-4': NEW_SUBJECTS['CORE-2 MINOR-4'],
      },
    }
  );

  console.log(`✅ MongoDB updated — ${result.modifiedCount} documents modified.`);
  await mongoose.disconnect();
};

// ─── Run ──────────────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log('\n--- Updating Commerce subjects for 4th Sem 2024 ---\n');
    console.log('New subject values:');
    Object.entries(NEW_SUBJECTS).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    console.log('');

    updateJson();
    await updateMongo();

    console.log('\n✅ Done. Both JSON and MongoDB updated successfully.\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
