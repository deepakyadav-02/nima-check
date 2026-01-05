const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const PGFirstSem2025 = require('../models/PGFirstSem2025');

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

// Update PG First Sem 2025 with Stream field
const updatePGFirstSemStream = async () => {
  try {
    await connectDB();
    
    const jsonFilePath = path.join(__dirname, '../JSONS/pg2025FIRSTSEM_formatted 2.json');
    console.log('📄 Reading updated data from:', jsonFilePath);
    
    if (!fs.existsSync(jsonFilePath)) {
      console.error('❌ Error: pg2025FIRSTSEM_formatted 2.json not found at', jsonFilePath);
      process.exit(1);
    }

    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    const students = jsonData.students || jsonData; // Handle both wrapped and unwrapped formats
    
    if (!Array.isArray(students)) {
      console.error('❌ Error: Data is not an array');
      process.exit(1);
    }
    
    console.log(`📊 Found ${students.length} records`);
    
    let updated = 0;
    let notFound = 0;
    let errors = 0;

    for (let i = 0; i < students.length; i++) {
      const record = students[i];
      const autonomousRollNo = record["Autonomous  Roll No."] || record["Autonomous Roll No"];
      
      if (!autonomousRollNo) {
        console.log(`[${i + 1}/${students.length}] ⚠️  Skipping record without Autonomous Roll No`);
        continue;
      }

      try {
        // Prepare update data
        const updateData = {
          Stream: record.Stream || null,
          // Update PAPER fields if they exist
          "PAPER-1.1": record["PAPER-1.1"] || null,
          "PAPER-1.2": record["PAPER-1.2"] || null,
          "PAPER-1.3": record["PAPER-1.3"] || null,
          "PAPER-1.4": record["PAPER-1.4"] || null,
          "PAPER-1.5": record["PAPER-1.5"] || null,
          "PAPER-1.6": record["PAPER-1.6"] || null,
          "PAPER-1.7": record["PAPER-1.7"] || null,
          "PAPER-1.8": record["PAPER-1.8"] || null,
          "PAPER-MTC-101": record["PAPER-MTC-101"] || null,
          "PAPER-MTC-102": record["PAPER-MTC-102"] || null,
          "PAPER-MTC-103": record["PAPER-MTC-103"] || null,
          "PAPER-MTC-104": record["PAPER-MTC-104"] || null,
          "PAPER-MTC-105": record["PAPER-MTC-105"] || null
        };

        // Remove null values
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === null || updateData[key] === undefined) {
            delete updateData[key];
          }
        });

        const result = await PGFirstSem2025.updateOne(
          { "Autonomous Roll No": autonomousRollNo },
          { $set: updateData }
        );

        if (result.matchedCount > 0) {
          updated++;
          if ((i + 1) % 20 === 0 || i < 5) {
            console.log(`[${i + 1}/${students.length}] ✅ Updated: ${autonomousRollNo} (Stream: ${record.Stream || 'N/A'})`);
          }
        } else {
          notFound++;
          if (i < 10) {
            console.log(`[${i + 1}/${students.length}] ⚠️  Not found: ${autonomousRollNo}`);
          }
        }
      } catch (error) {
        errors++;
        console.error(`[${i + 1}/${students.length}] ❌ Error updating ${autonomousRollNo}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Records: ${students.length}`);
    console.log(`✅ Updated: ${updated}`);
    console.log(`⚠️  Not Found: ${notFound}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(70));

    // Verify Stream field
    const withStream = await PGFirstSem2025.countDocuments({ Stream: { $exists: true, $ne: null } });
    console.log(`\n📊 Verification: ${withStream} records now have Stream field`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run
if (require.main === module) {
  updatePGFirstSemStream();
}

module.exports = { updatePGFirstSemStream };

