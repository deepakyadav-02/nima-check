const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { loadEnv } = require('../utils/loadEnv');

loadEnv();

const PGSem4Result = require('../models/PGSem4Result');
const { mapFormattedRecord } = require('../utils/pgFormattedMapper');

const connectDB = async () => {
  const args = process.argv.slice(2);
  const mongoUriArg = args.find((arg) => arg.startsWith('--mongo-uri='))?.split('=')[1]
    || (args.indexOf('--mongo-uri') !== -1 ? args[args.indexOf('--mongo-uri') + 1] : null);

  const mongoUri = mongoUriArg || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Error: MONGO_URI not found');
    process.exit(1);
  }

  const conn = await mongoose.connect(mongoUri);
  console.log(`MongoDB Connected: ${conn.connection.host}`);
};

const getArgValue = (flag) => {
  const args = process.argv.slice(2);
  const prefixed = args.find((arg) => arg.startsWith(`${flag}=`));
  if (prefixed) return prefixed.split('=').slice(1).join('=');
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) return args[index + 1];
  return undefined;
};

const importPGSem4Results = async () => {
  try {
    await connectDB();

    const fileArg = getArgValue('--file');
    const jsonPath = path.resolve(
      fileArg || path.join(__dirname, '../JSONS/4thsem-pg-formatted.json')
    );
    const skipClear = process.argv.slice(2).includes('--skip-clear');

    if (!fs.existsSync(jsonPath)) {
      console.error('❌ File not found:', jsonPath);
      process.exit(1);
    }

    const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log('📄 Import file:', jsonPath);
    console.log(`📊 Records to import: ${rawData.length}\n`);

    const existingCount = await PGSem4Result.countDocuments();
    if (existingCount > 0 && !skipClear) {
      console.log(`🧹 Clearing ${existingCount} existing pgsem4results documents...`);
      const deleted = await PGSem4Result.deleteMany({});
      console.log(`✅ Deleted ${deleted.deletedCount} documents\n`);
    } else if (existingCount > 0) {
      console.log(`⏭️  ${existingCount} existing records found (--skip-clear)\n`);
    }

    const results = { created: 0, updated: 0, failed: [] };

    for (let i = 0; i < rawData.length; i += 1) {
      const record = rawData[i];
      try {
        const doc = { ...mapFormattedRecord(record, 4), semester: 4 };
        if (!doc.autonomousRollNo) {
          results.failed.push({ index: i, error: 'Missing Autonomous Roll No' });
          continue;
        }

        const existing = await PGSem4Result.findOne({
          autonomousRollNo: doc.autonomousRollNo,
        });

        if (existing) {
          await PGSem4Result.updateOne({ _id: existing._id }, { $set: doc });
          results.updated += 1;
        } else {
          await PGSem4Result.create(doc);
          results.created += 1;
        }

        if ((i + 1) % 25 === 0 || i < 3) {
          console.log(`[${i + 1}/${rawData.length}] ✅ ${doc.studentName} (${doc.autonomousRollNo})`);
        }
      } catch (error) {
        results.failed.push({
          index: i,
          rollNo: record['Roll No'],
          error: error.message,
        });
      }
    }

    const totalInDb = await PGSem4Result.countDocuments();

    console.log('\n' + '='.repeat(60));
    console.log('PG 4TH SEM IMPORT SUMMARY (collection: pgsem4results)');
    console.log('='.repeat(60));
    console.log(`Created: ${results.created}`);
    console.log(`Updated: ${results.updated}`);
    console.log(`Failed:  ${results.failed.length}`);
    console.log(`Total in DB: ${totalInDb}`);

    if (results.failed.length > 0) {
      console.log('\nFailures (first 10):');
      results.failed.slice(0, 10).forEach((f, idx) => {
        console.log(`  ${idx + 1}. index ${f.index}: ${f.error}`);
      });
    }

    const resultsPath = path.join(__dirname, '../pgsem4-import-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Log saved to: ${resultsPath}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  importPGSem4Results();
}

module.exports = { importPGSem4Results };
