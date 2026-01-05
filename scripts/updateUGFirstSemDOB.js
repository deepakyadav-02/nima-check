const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const UGFirstSem2025 = require('../models/PGFirstSem2025');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('Error: MONGO_URI not found in environment variables');
      process.exit(1);
    }
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

// Update UG First Sem 2025 DOB from excel-to-json (10).json
const updateUGFirstSemDOB = async () => {
  try {
    await connectDB();
    
    const jsonFilePath = path.join(__dirname, '../JSONS/first-year/excel-to-json (10).json');
    console.log('📄 Reading DOB data from:', jsonFilePath);
    
    if (!fs.existsSync(jsonFilePath)) {
      console.error(`❌ Error: File not found at ${jsonFilePath}`);
      process.exit(1);
    }

    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    console.log(`📊 Found ${jsonData.length} records in JSON file\n`);

    let updated = 0;
    let notFound = 0;
    let errors = 0;
    const notFoundList = [];
    const errorList = [];

    console.log('🚀 Starting DOB update...\n');

    for (let i = 0; i < jsonData.length; i++) {
      const record = jsonData[i];
      const rollNo = record["College Roll No"];
      const dob = record["DOB"];

      if (!rollNo) {
        console.log(`[${i + 1}/${jsonData.length}] ⚠️  Skipping record without College Roll No`);
        errors++;
        errorList.push({ index: i + 1, reason: 'Missing College Roll No' });
        continue;
      }

      if (!dob) {
        console.log(`[${i + 1}/${jsonData.length}] ⚠️  Skipping record without DOB: ${rollNo}`);
        errors++;
        errorList.push({ index: i + 1, rollNo, reason: 'Missing DOB' });
        continue;
      }

      try {
        const result = await UGFirstSem2025.updateOne(
          { "College Roll No": rollNo },
          { $set: { dob: dob } }
        );

        if (result.matchedCount > 0) {
          updated++;
          if ((i + 1) % 50 === 0 || i < 5) {
            console.log(`[${i + 1}/${jsonData.length}] ✅ Updated: ${rollNo} -> DOB: ${dob}`);
          }
        } else {
          notFound++;
          notFoundList.push({ rollNo, dob });
          if ((i + 1) % 50 === 0 || i < 5) {
            console.log(`[${i + 1}/${jsonData.length}] ❌ Not Found: ${rollNo}`);
          }
        }
      } catch (error) {
        errors++;
        errorList.push({ index: i + 1, rollNo, error: error.message });
        console.log(`[${i + 1}/${jsonData.length}] ❌ Error updating ${rollNo}: ${error.message}`);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 DOB UPDATE SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Records Processed: ${jsonData.length}`);
    console.log(`✅ Successfully Updated: ${updated}`);
    console.log(`❌ Not Found: ${notFound}`);
    console.log(`⚠️  Errors: ${errors}`);

    if (notFoundList.length > 0) {
      console.log('\n📋 Students Not Found (first 20):');
      notFoundList.slice(0, 20).forEach(item => {
        console.log(`   - College Roll No: ${item.rollNo}, Stream: ${item.stream}, DOB: ${item.dob}`);
      });
      if (notFoundList.length > 20) {
        console.log(`   ... and ${notFoundList.length - 20} more`);
      }
    }

    if (errorList.length > 0) {
      console.log('\n⚠️  Errors (first 10):');
      errorList.slice(0, 10).forEach(item => {
        console.log(`   - ${JSON.stringify(item)}`);
      });
      if (errorList.length > 10) {
        console.log(`   ... and ${errorList.length - 10} more errors`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ DOB update process completed!');
    console.log('='.repeat(70) + '\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the update
updateUGFirstSemDOB();

