const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const UGStudent = require('../models/UGStudent');
const BBAStudent = require('../models/BBAStudent');

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

// Copy all BBA students to UGStudent model
const copyBBAToUG = async () => {
  try {
    await connectDB();

    console.log('🔍 Fetching all BBA students from BBAStudent model...\n');

    // Get all BBA students
    const bbaStudents = await BBAStudent.find({});
    console.log(`📊 Found ${bbaStudents.length} BBA students in BBAStudent model`);

    if (bbaStudents.length === 0) {
      console.log('⚠️  No BBA students found. Nothing to copy.');
      process.exit(0);
    }

    const results = {
      total: bbaStudents.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    console.log('\n🚀 Starting to copy BBA students to UGStudent model...\n');

    // Process each BBA student
    for (let i = 0; i < bbaStudents.length; i++) {
      const bbaStudent = bbaStudents[i];
      
      try {
        const autonomousRollNo = bbaStudent["Autonomous Roll No"];

        if (!autonomousRollNo) {
          results.skipped++;
          results.errors.push({
            index: i,
            reason: 'Missing Autonomous Roll No'
          });
          continue;
        }

        // Check if student already exists in UGStudent
        const existingUG = await UGStudent.findOne({ 
          "Autonomous Roll No": autonomousRollNo 
        });

        // Map BBA student fields to UG student structure
        // Keep all BBA-specific fields and add them to UG model
        const ugStudentData = {
          Department: bbaStudent.Department || "BBA ",
          "Sl.No": bbaStudent["Sl.No"] || null,
          "Autonomous Roll No": autonomousRollNo,
          "Name of the Students": bbaStudent["Name of the Students"] || null,
          "Roll No": bbaStudent["Roll No"] || null,
          dob: bbaStudent.dob || null,
          ABC_ID: bbaStudent.ABC_ID || null,
          profileImage: bbaStudent.profileImage || null,
          // BBA semester 2 fields
          "CC-201": bbaStudent["CC-201"] || null,
          "CC-202": bbaStudent["CC-202"] || null,
          "CC-203": bbaStudent["CC-203"] || null,
          "Multi Disciplinary-201": bbaStudent["Multi Disciplinary-201"] || null,
          "AEC-201": bbaStudent["AEC-201"] || null,
          "SEC-201": bbaStudent["SEC-201"] || null,
          "VAC-201-I.C": bbaStudent["VAC-201-I.C"] || null,
          // BBA semester 3 fields
          "CC-301": bbaStudent["CC-301"] || null,
          "CC-302": bbaStudent["CC-302"] || null,
          "CC-303": bbaStudent["CC-303"] || null,
          "MDE-301": bbaStudent["MDE-301"] || null,
          "SEC-301": bbaStudent["SEC-301"] || null,
          "VAC-301": bbaStudent["VAC-301"] || null,
          examCode: bbaStudent.examCode || null
        };

        // Remove null values to keep the document clean
        Object.keys(ugStudentData).forEach(key => {
          if (ugStudentData[key] === null) {
            delete ugStudentData[key];
          }
        });

        if (existingUG) {
          // Update existing record
          await UGStudent.updateOne(
            { "Autonomous Roll No": autonomousRollNo },
            { $set: ugStudentData }
          );
          results.updated++;
          if ((i + 1) % 10 === 0 || i < 5) {
            console.log(`[${i + 1}/${bbaStudents.length}] ✅ Updated in UG: ${autonomousRollNo}`);
          }
        } else {
          // Insert new record
          await UGStudent.create(ugStudentData);
          results.inserted++;
          if ((i + 1) % 10 === 0 || i < 5) {
            console.log(`[${i + 1}/${bbaStudents.length}] ✅ Inserted to UG: ${autonomousRollNo}`);
          }
        }

      } catch (error) {
        results.errors.push({
          index: i,
          autonomousRollNo: bbaStudent["Autonomous Roll No"] || 'N/A',
          error: error.message
        });
        if ((i + 1) % 10 === 0 || i < 5) {
          console.log(`[${i + 1}/${bbaStudents.length}] ❌ Error: ${error.message}`);
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 BBA TO UG COPY SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total BBA Students: ${results.total}`);
    console.log(`✅ Inserted: ${results.inserted}`);
    console.log(`✅ Updated: ${results.updated}`);
    console.log(`⏭️  Skipped: ${results.skipped}`);
    console.log(`❌ Errors: ${results.errors.length}`);
    console.log('='.repeat(70));

    // Verify the copy
    const bbaRollNos = bbaStudents.map(s => s["Autonomous Roll No"]);
    const ugBBAStudents = await UGStudent.find({
      "Autonomous Roll No": { $in: bbaRollNos }
    });
    console.log(`\n✅ Verification: ${ugBBAStudents.length} BBA students now exist in UGStudent model`);

    if (results.errors.length > 0) {
      console.log('\n❌ Errors (showing first 10):');
      results.errors.slice(0, 10).forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.autonomousRollNo} - ${err.error || err.reason}`);
      });
      if (results.errors.length > 10) {
        console.log(`   ... and ${results.errors.length - 10} more`);
      }
    }

    // Save results to file
    const resultsPath = path.join(__dirname, '../copy-bba-to-ug-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Detailed results saved to: ${resultsPath}`);

    console.log('\n✅ BBA students copy to UGStudent completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  copyBBAToUG();
}

module.exports = { copyBBAToUG };

