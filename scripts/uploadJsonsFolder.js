const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { loadEnv } = require('../utils/loadEnv');
const { parseCliArgs } = require('../utils/cliArgs');
const { readJsonFile } = require('../utils/jsonFile');
const { buildUpsertFilter } = require('./uploadSemesterJson');
const { JSON_FOLDER_MAPPINGS } = require('../data/jsonCollections');
require('../models/SemesterJsonCollections');

async function ensureIndexes(collectionName) {
  const collection = mongoose.connection.db.collection(collectionName);
  await collection.createIndex({ 'Autonomous Roll No': 1 });
  await collection.createIndex({ 'Roll No': 1 });
  await collection.createIndex({ Department: 1 });
}

async function importJsonFile({ file, collection, label }, jsonDir, clearFirst) {
  const filePath = path.join(jsonDir, file);

  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${label}: file not found (${file})`);
    return null;
  }

  const rows = readJsonFile(filePath);
  if (!Array.isArray(rows)) {
    throw new Error(`${file} must contain a JSON array`);
  }

  const dbCollection = mongoose.connection.db.collection(collection);

  if (clearFirst) {
    const deleted = await dbCollection.deleteMany({});
    console.log(`Cleared ${deleted.deletedCount} documents from ${collection}`);
  }

  await ensureIndexes(collection);

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

  let upserted = 0;
  let matched = 0;
  let modified = 0;
  const batchSize = 500;

  for (let i = 0; i < ops.length; i += batchSize) {
    const batch = ops.slice(i, i + batchSize);
    const result = await dbCollection.bulkWrite(batch, { ordered: false });
    upserted += result.upsertedCount || 0;
    matched += result.matchedCount || 0;
    modified += result.modifiedCount || 0;
  }

  const total = await dbCollection.countDocuments({});

  return {
    label,
    file,
    collection,
    rowsInFile: rows.length,
    prepared: ops.length,
    skipped,
    upserted,
    matched,
    modified,
    total,
  };
}

async function uploadJsonsFolder() {
  try {
    loadEnv(path.resolve(__dirname, '..'));

    if (!process.env.MONGO_URI) {
      console.error('Error: MONGO_URI is missing. Set it in config.env');
      process.exit(1);
    }

    const { has } = parseCliArgs(process.argv);
    const clearFirst = has('clear');
    const jsonDir = path.resolve(__dirname, '..', 'JSONS', 'json');

    await connectDB();
    console.log('Connected to database');
    console.log(`Import folder: ${jsonDir}\n`);

    const results = [];

    for (const mapping of JSON_FOLDER_MAPPINGS) {
      console.log(`Importing ${mapping.label} -> ${mapping.collection}`);
      const result = await importJsonFile(mapping, jsonDir, clearFirst);
      if (result) {
        results.push(result);
        console.log(
          `  ${result.total} documents (${result.upserted} new, ${result.modified} updated, ${result.skipped} skipped)\n`
        );
      }
    }

    console.log('=== IMPORT SUMMARY ===');
    results.forEach((result) => {
      console.log(
        `${result.collection}: ${result.total} docs from ${result.file}`
      );
    });

    process.exit(0);
  } catch (error) {
    console.error('Error importing JSONS/json folder:', error?.message || error);
    process.exit(1);
  }
}

if (require.main === module) {
  uploadJsonsFolder();
}

module.exports = { uploadJsonsFolder, importJsonFile };
