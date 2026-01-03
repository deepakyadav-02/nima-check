const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const UGFirstSem2025 = require('../models/UGFirstSem2025');

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

// Update UG First Sem 2025 subjects
const updateUGFirstSemSubjects = async () => {
  try {
    await connectDB();
    
    const jsonFilePath = path.join(__dirname, '../JSONS/first-year/fst-Sem(2025)_formatted_with_stream.json');
    console.log('📄 Reading updated data from:', jsonFilePath);
    
    if (!fs.existsSync(jsonFilePath)) {
      console.error('❌ Error: fst-Sem(2025)_formatted_with_stream.json not found at', jsonFilePath);
      process.exit(1);
    }

    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    console.log(`📊 Found ${jsonData.length} records`);
    
    let updated = 0;
    let notFound = 0;
    let errors = 0;

    for (let i = 0; i < jsonData.length; i++) {
      const record = jsonData[i];
      const autonomousRollNo = record["Autonomous Roll No"];
      
      if (!autonomousRollNo) {
        console.log(`[${i + 1}/${jsonData.length}] ⚠️  Skipping record without Autonomous Roll No`);
        continue;
      }

      try {
        // Prepare update data - remove old subject fields and add new ones
        const updateData = {
          // Basic fields
          "Sl.No": record["Sl. No."] || record["Sl.No"] || null,
          "Roll No": record["Roll No"] || null,
          "Autonomous Roll No": autonomousRollNo,
          "Applicant Name": record["Applicant Name"] || null,
          "Name of the Students": record["Name of the Students"] || null,
          Stream: record.Stream || null,
          
          // Regular UG subjects
          "Core-1-Major-1": record["Core-1-Major-1"] || null,
          "Core-1-Major-2": record["Core-1-Major-2"] || null,
          "Core-2-Minor-1": record["Core-2-Minor-1"] || null,
          "Multidisciplinary-1": record["Multidisciplinary-1"] || null,
          "AEC-I": record["AEC-I"] || null,
          "VAC-I": record["VAC-I"] || null,
          
          // BBA subjects
          "CC-101": record["CC-101"] || null,
          "CC-102": record["CC-102"] || null,
          "CC-103": record["CC-103"] || null,
          "MDE-101": record["MDE-101"] || null,
          "AEC-101": record["AEC-101"] || null,
          "AEC-102": record["AEC-102"] || null,
          "VAC-101": record["VAC-101"] || null
        };

        // Remove null values
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === null || updateData[key] === undefined) {
            delete updateData[key];
          }
        });

        // Unset old subject fields that are no longer used
        const unsetFields = {};
        const oldFields = ["CC-101", "CC-102", "CC-103", "MDE-101", "AEC-101", "VAC-101"];
        oldFields.forEach(field => {
          // Only unset if not in the new data
          if (!updateData[field]) {
            unsetFields[field] = "";
          }
        });

        const updateQuery = { $set: updateData };
        if (Object.keys(unsetFields).length > 0) {
          updateQuery.$unset = unsetFields;
        }

        const result = await UGFirstSem2025.updateOne(
          { "Autonomous Roll No": autonomousRollNo },
          updateQuery
        );

        if (result.matchedCount > 0) {
          updated++;
          if ((i + 1) % 100 === 0 || i < 5) {
            console.log(`[${i + 1}/${jsonData.length}] ✅ Updated: ${autonomousRollNo}`);
          }
        } else {
          notFound++;
          if (i < 10) {
            console.log(`[${i + 1}/${jsonData.length}] ⚠️  Not found: ${autonomousRollNo}`);
          }
        }
      } catch (error) {
        errors++;
        console.error(`[${i + 1}/${jsonData.length}] ❌ Error updating ${autonomousRollNo}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Records: ${jsonData.length}`);
    console.log(`✅ Updated: ${updated}`);
    console.log(`⚠️  Not Found: ${notFound}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(70));

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run
if (require.main === module) {
  updateUGFirstSemSubjects();
}

module.exports = { updateUGFirstSemSubjects };

