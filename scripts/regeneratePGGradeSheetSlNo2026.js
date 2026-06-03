const mongoose = require('mongoose');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const PGAllSemesters = require('../models/PGAllSemesters');

const PREFIX = '2026';
const RAND_DIGITS = 5;
const SL_REGEX = /^2026\d{5}$/;

function randomTail5() {
  // 0..99999 inclusive → pad to 5 digits
  const n = crypto.randomInt(0, 100000);
  return String(n).padStart(RAND_DIGITS, '0');
}

function makeSlNo() {
  const sl = `${PREFIX}${randomTail5()}`;
  if (!SL_REGEX.test(sl)) throw new Error(`Generated invalid SL No: ${sl}`);
  return sl;
}

async function connectDB() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Error: MONGO_URI not found in environment variables');
    process.exit(1);
  }
  const conn = await mongoose.connect(mongoUri);
  console.log(`MongoDB Connected: ${conn.connection.host}`);
  return conn;
}

async function run() {
  await connectDB();

  const docs = await PGAllSemesters.find({}, { _id: 1, gradeSheetSlNo: 1 }).lean();
  console.log(`Found ${docs.length} pgallsemesters documents`);

  // Collect any already-used SL Nos (in case some docs already regenerated).
  const used = new Set(
    docs
      .map((d) => (d.gradeSheetSlNo != null ? String(d.gradeSheetSlNo).trim() : ''))
      .filter((v) => SL_REGEX.test(v))
  );

  const ops = [];
  let regenerated = 0;

  for (const d of docs) {
    let sl = makeSlNo();
    while (used.has(sl)) sl = makeSlNo();
    used.add(sl);

    ops.push({
      updateOne: {
        filter: { _id: d._id },
        update: { $set: { gradeSheetSlNo: sl } },
      },
    });
    regenerated += 1;
  }

  if (ops.length === 0) {
    console.log('No documents to update.');
    await mongoose.disconnect();
    return;
  }

  // Bulk update in chunks to avoid huge payloads.
  const CHUNK = 1000;
  let done = 0;
  for (let i = 0; i < ops.length; i += CHUNK) {
    const chunk = ops.slice(i, i + CHUNK);
    const res = await PGAllSemesters.bulkWrite(chunk, { ordered: false });
    done += chunk.length;
    console.log(`Updated ${done}/${ops.length}...`, {
      matched: res.matchedCount,
      modified: res.modifiedCount,
    });
  }

  console.log(`✅ Regenerated gradeSheetSlNo for ${regenerated} students.`);
  await mongoose.disconnect();
}

if (require.main === module) {
  run().catch((err) => {
    console.error('❌ Failed:', err?.message || err);
    console.error(err?.stack);
    process.exit(1);
  });
}

module.exports = { run };

