/**
 * Imports pg2025-2ndSEM.json into MongoDB collection: pg2025-2ndsem
 *
 * Field normalization applied:
 *   "Autonomous  Roll No."  →  "Autonomous Roll No"
 *   "College  Roll No."     →  "College Roll No"
 *   "Sl. No"                →  "Sl. No"  (kept as-is)
 *
 * Run:  node scripts/importPGSecondSem2025.js
 * Add --clear flag to wipe the collection before inserting.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../config.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const JSON_FILE = path.join(__dirname, '../JSONS/pg2025-2ndSEM.json');
const COLLECTION = 'pg2025-2ndsem';

const normalizeRow = (row) => {
  const normalized = {};
  for (const [key, value] of Object.entries(row)) {
    // Collapse multiple spaces and strip trailing period from roll-number keys
    const cleanKey = key.replace(/\s+/g, ' ').replace(/\.$/, '').trim();
    normalized[cleanKey] = value;
  }
  return normalized;
};

const buildFilter = (row) => {
  if (row['Autonomous Roll No']) return { 'Autonomous Roll No': row['Autonomous Roll No'] };
  if (row['College Roll No'])    return { 'College Roll No': row['College Roll No'] };
  return null;
};

(async () => {
  try {
    const clearFirst = process.argv.includes('--clear');

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const raw = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    const rows = raw.map(normalizeRow);

    // Quick summary of departments
    const deptCount = {};
    rows.forEach((r) => {
      const dept = r.Department || `(no dept / Stream=${r.Stream || '?'})`;
      deptCount[dept] = (deptCount[dept] || 0) + 1;
    });
    console.log('Department breakdown:');
    Object.entries(deptCount).forEach(([d, c]) => console.log(`  ${d}: ${c}`));
    console.log(`  TOTAL: ${rows.length}\n`);

    const collection = mongoose.connection.db.collection(COLLECTION);

    if (clearFirst) {
      const del = await collection.deleteMany({});
      console.log(`🗑  Cleared ${del.deletedCount} existing documents\n`);
    }

    const ops = [];
    let skipped = 0;

    for (const row of rows) {
      const filter = buildFilter(row);
      if (!filter) { skipped++; continue; }
      ops.push({ replaceOne: { filter, replacement: row, upsert: true } });
    }

    if (ops.length === 0) {
      console.log('Nothing to upload (all rows skipped).');
      process.exit(0);
    }

    const result = await collection.bulkWrite(ops, { ordered: false });
    const total = await collection.countDocuments({});

    console.log('✅ Import complete');
    console.log(`   Upserted (new)     : ${result.upsertedCount}`);
    console.log(`   Matched (existing) : ${result.matchedCount}`);
    console.log(`   Modified           : ${result.modifiedCount}`);
    console.log(`   Skipped (no key)   : ${skipped}`);
    console.log(`   Total in collection: ${total}\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
