const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { loadEnv } = require('../utils/loadEnv');
const { parseCliArgs } = require('../utils/cliArgs');
const { readJsonFile } = require('../utils/jsonFile');

const buildUpsertFilter = (row) => {
  const autonomousRollNo = row?.['Autonomous Roll No'];
  const examCode = row?.['Exam Code'] ?? row?.Examcode ?? row?.examCode;
  const rollNo = row?.['Roll No'];

  if (autonomousRollNo) return { 'Autonomous Roll No': autonomousRollNo };
  if (examCode) return { 'Exam Code': examCode };
  if (rollNo) return { 'Roll No': rollNo };
  return null;
};

async function uploadSemesterJson() {
  try {
    loadEnv(path.resolve(__dirname, '..'));

    if (!process.env.MONGO_URI) {
      console.error('Error: MONGO_URI is missing. Set it in config.env');
      process.exit(1);
    }

    const { get, has } = parseCliArgs(process.argv);
    const fileArg = get('file');
    const collectionName = get('collection');
    const clearFirst = has('clear');

    if (!fileArg || !collectionName) {
      console.error('Usage: node scripts/uploadSemesterJson.js --file=<json-path> --collection=<collection-name> [--clear]');
      process.exit(1);
    }

    const filePath = path.isAbsolute(fileArg)
      ? fileArg
      : path.resolve(__dirname, '..', fileArg);

    await connectDB();
    console.log('Connected to database\n');
    console.log(`Reading data from: ${filePath}`);
    console.log(`Target collection: ${collectionName}\n`);

    const rows = readJsonFile(filePath);
    if (!Array.isArray(rows)) {
      console.error('Error: JSON root must be an array of student rows');
      process.exit(1);
    }

    const collection = mongoose.connection.db.collection(collectionName);

    if (clearFirst) {
      const deleted = await collection.deleteMany({});
      console.log(`Cleared ${deleted.deletedCount} existing documents from ${collectionName}\n`);
    }

    const ops = [];
    let skipped = 0;

    for (const row of rows) {
      const filter = buildUpsertFilter(row);
      if (!filter) {
        skipped += 1;
        continue;
      }

      ops.push({
        replaceOne: {
          filter,
          replacement: row,
          upsert: true,
        },
      });
    }

    if (ops.length === 0) {
      console.log('Nothing to upload (all rows skipped).');
      process.exit(0);
    }

    console.log(`Found ${rows.length} rows`);
    console.log(`Prepared ${ops.length} upsert operations (skipped: ${skipped})\n`);

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

      if (i + batchSize >= ops.length || (i + batchSize) % 1000 === 0) {
        console.log(`Progress: ${Math.min(i + batchSize, ops.length)}/${ops.length}`);
      }
    }

    const count = await collection.countDocuments({});

    console.log('\nUpload finished');
    console.log(`Collection: ${collectionName}`);
    console.log(`Upserted (new): ${upserted}`);
    console.log(`Matched (existing): ${matched}`);
    console.log(`Modified: ${modified}`);
    console.log(`Skipped (no key): ${skipped}`);
    console.log(`Total documents in collection: ${count}\n`);

    process.exit(0);
  } catch (error) {
    console.error('Error uploading semester JSON:', error?.message || error);
    if (error?.writeErrors?.length) {
      console.error(`Write errors: ${error.writeErrors.length}`);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  uploadSemesterJson();
}

module.exports = { uploadSemesterJson, buildUpsertFilter };
