const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const connectDB = require('../config/db');
const PGSecondSem2024 = require('../models/PGSecondSem2024');

async function uploadPGSecondSem2024() {
  try {
    dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
    dotenv.config({ path: path.resolve(__dirname, '..', 'config.env') });

    if (!process.env.MONGO_URI) {
      console.error('❌ Error: MONGO_URI is missing. Set it in config.env');
      process.exit(1);
    }

    await connectDB();
    console.log('Connected to database\n');

    const args = process.argv.slice(2);
    const fileFlagIndex = args.indexOf('--file');
    const fileArg = fileFlagIndex !== -1 ? args[fileFlagIndex + 1] : null;
    const filePath = fileArg
      ? path.resolve(__dirname, '..', fileArg)
      : path.resolve(__dirname, '..', 'JSONS', 'pgmarkwith_rollnumber.json');
    console.log(`Reading data from: ${filePath}\n`);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Error: File not found at ${filePath}`);
      process.exit(1);
    }

    let raw = fs.readFileSync(filePath, 'utf8');
    if (raw.charCodeAt(0) === 0xfeff) {
      raw = raw.slice(1);
    }
    const rows = JSON.parse(raw);

    if (!Array.isArray(rows)) {
      console.error('❌ Error: JSON root must be an array of student rows');
      process.exit(1);
    }

    const collectionName = PGSecondSem2024.collection.name;
    console.log(`📊 Found ${rows.length} rows to upsert into ${collectionName}\n`);

    const collection = mongoose.connection.db.collection(collectionName);

    const ops = [];
    let skipped = 0;

    for (const row of rows) {
      const autonomousRollNo =
        row?.autonomousRollNo != null ? String(row.autonomousRollNo).trim() : '';
      const collegeRollNo =
        row?.collegeRollNo != null ? String(row.collegeRollNo).trim() : '';

      const filter = autonomousRollNo
        ? { autonomousRollNo }
        : collegeRollNo
          ? { collegeRollNo }
          : null;

      if (!filter) {
        skipped += 1;
        continue;
      }

      ops.push({
        updateOne: {
          filter,
          update: { $set: row },
          upsert: true,
        },
      });
    }

    if (ops.length === 0) {
      console.log('⚠️ Nothing to upload (all rows skipped).');
      process.exit(0);
    }

    console.log(`📝 Prepared ${ops.length} upsert operations (skipped: ${skipped})\n`);

    const batchSize = 500;
    let matched = 0;
    let modified = 0;
    let upserted = 0;

    for (let i = 0; i < ops.length; i += batchSize) {
      const batch = ops.slice(i, i + batchSize);
      const result = await collection.bulkWrite(batch, { ordered: false });
      matched += result.matchedCount || 0;
      modified += result.modifiedCount || 0;
      upserted += result.upsertedCount || 0;

      if (i + batchSize >= ops.length || (i + batchSize) % 2000 === 0) {
        console.log(`   Progress: ${Math.min(i + batchSize, ops.length)}/${ops.length} ops`);
      }
    }

    console.log('\n✅ Upload finished');
    console.log(`   Upserted (new): ${upserted}`);
    console.log(`   Matched (existing): ${matched}`);
    console.log(`   Modified: ${modified}`);
    console.log(`   Skipped (no key): ${skipped}\n`);

    const count = await collection.countDocuments({});
    console.log(`✅ Verification: ${count} documents in collection: ${collectionName}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error uploading PG 2nd sem JSON:', error?.message || error);
    if (error?.writeErrors?.length) {
      console.error(`   Write errors: ${error.writeErrors.length}`);
    }
    process.exit(1);
  }
}

uploadPGSecondSem2024();
