const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const PGSecondSem2024 = require('../models/PGSecondSem2024');
const { loadEnv } = require('../utils/loadEnv');
const { parseCliArgs } = require('../utils/cliArgs');
const { readJsonFile } = require('../utils/jsonFile');

const pickTrimmed = (row, keys) => {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

const normalizeRow = (row) => {
  const autonomousRollNo = pickTrimmed(row, ['autonomousRollNo', 'Autonomous Roll No', 'AutonomousRollNo']);
  const collegeRollNo = pickTrimmed(row, ['collegeRollNo', 'Roll No', 'CollegeRollNo']);
  const applicantName = pickTrimmed(row, ['applicantName', 'Name of the Students', 'Name']);
  const department = pickTrimmed(row, ['department', 'Department']);

  return {
    ...row,
    autonomousRollNo,
    collegeRollNo,
    applicantName,
    department,
    studentType: row?.studentType ?? 'PGStudent',
  };
};

async function uploadPGSecondSem2024() {
  try {
    loadEnv(path.resolve(__dirname, '..'));

    if (!process.env.MONGO_URI) {
      console.error('❌ Error: MONGO_URI is missing. Set it in config.env');
      process.exit(1);
    }

    await connectDB();
    console.log('Connected to database\n');

    const { get, has } = parseCliArgs(process.argv);
    const fileArg = get('file');
    const replaceAll = has('replace-all');
    const replaceRolls = has('replace-rolls');
    const filePath = fileArg
      ? path.resolve(__dirname, '..', fileArg)
      : path.resolve(__dirname, '..', 'JSONS', 'pgmarkwith_rollnumber.json');
    console.log(`Reading data from: ${filePath}\n`);

    const rows = readJsonFile(filePath);

    if (!Array.isArray(rows)) {
      console.error('❌ Error: JSON root must be an array of student rows');
      process.exit(1);
    }

    const collectionName = PGSecondSem2024.collection.name;
    console.log(`📊 Found ${rows.length} rows to upsert into ${collectionName}\n`);

    const collection = mongoose.connection.db.collection(collectionName);

    if (replaceAll) {
      console.log(`🗑️  --replace-all enabled: deleting existing docs in ${collectionName}...\n`);
      const del = await collection.deleteMany({});
      console.log(`🗑️  Removed previous rows from ${collectionName}: ${del.deletedCount}\n`);
    }

    if (replaceRolls) {
      const autonomousRollNos = [];
      const collegeRollNos = [];

      for (const row of rows) {
        const normalized = normalizeRow(row);
        const autonomousRollNo =
          normalized?.autonomousRollNo != null ? String(normalized.autonomousRollNo).trim() : '';
        const collegeRollNo =
          normalized?.collegeRollNo != null ? String(normalized.collegeRollNo).trim() : '';

        if (autonomousRollNo) autonomousRollNos.push(autonomousRollNo);
        else if (collegeRollNo) collegeRollNos.push(collegeRollNo);
      }

      const ors = [];
      if (autonomousRollNos.length) ors.push({ autonomousRollNo: { $in: autonomousRollNos } });
      if (collegeRollNos.length) ors.push({ collegeRollNo: { $in: collegeRollNos } });

      if (ors.length) {
        console.log(
          `🗑️  --replace-rolls enabled: deleting existing docs for ${autonomousRollNos.length + collegeRollNos.length} roll(s) in ${collectionName}...\n`,
        );
        const del = await collection.deleteMany({ $or: ors });
        console.log(`🗑️  Removed previous rows (matching rolls): ${del.deletedCount}\n`);
      } else {
        console.log('⚠️  --replace-rolls enabled but no roll keys found in input; skipping delete.\n');
      }
    }

    const ops = [];
    let skipped = 0;

    for (const row of rows) {
      const normalized = normalizeRow(row);
      const autonomousRollNo =
        normalized?.autonomousRollNo != null ? String(normalized.autonomousRollNo).trim() : '';
      const collegeRollNo =
        normalized?.collegeRollNo != null ? String(normalized.collegeRollNo).trim() : '';

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
          update: { $set: normalized },
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

if (require.main === module) {
  uploadPGSecondSem2024();
}
