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

// Update students from 3rdsem.json
const update3rdSemData = async () => {
  try {
    await connectDB();

    // Read 3rdsem.json
    const thirdSemPath = path.join(__dirname, '../3rdsem.json');
    console.log('📄 Reading 3rd semester data from:', thirdSemPath);
    
    if (!fs.existsSync(thirdSemPath)) {
      console.error('❌ Error: 3rdsem.json not found at', thirdSemPath);
      process.exit(1);
    }

    const thirdSemData = JSON.parse(fs.readFileSync(thirdSemPath, 'utf8'));
    console.log(`📊 Total records in 3rdsem.json: ${thirdSemData.length}`);

    const results = {
      ugUpdated: 0,
      bbaUpdated: 0,
      notFound: [],
      errors: []
    };

    console.log('\n🚀 Starting 3rd semester data update...\n');

    // Process each record
    for (let i = 0; i < thirdSemData.length; i++) {
      const record = thirdSemData[i];
      
      try {
        const autonomousRollNo = record["Autonomous Roll No"] || record.autonomousRollNo;
        
        if (!autonomousRollNo) {
          results.notFound.push({
            index: i,
            record: record["Roll No"] || 'N/A',
            reason: 'Missing Autonomous Roll No'
          });
          continue;
        }

        // Determine if it's UG or BBA based on roll number pattern
        const isBBA = autonomousRollNo.includes('BBA') || 
                     (record["Roll No"] && record["Roll No"].includes('BBA'));
        
        if (isBBA) {
          // Update BBA Student
          const updateData = {
            "CC-301": record["CC-301"] || null,
            "CC-302": record["CC-302"] || null,
            "CC-303": record["CC-303"] || null,
            "MDE-301": record["MDE-301"] || null,
            "SEC-301": record["SEC-301"] || null,
            "VAC-301": record["VAC-301"] || null,
            examCode: record.examCode || null
          };

          // Remove null values
          Object.keys(updateData).forEach(key => {
            if (updateData[key] === null) {
              delete updateData[key];
            }
          });

          const result = await BBAStudent.updateOne(
            { "Autonomous Roll No": autonomousRollNo },
            { $set: updateData }
          );

          if (result.matchedCount > 0) {
            results.bbaUpdated++;
            if ((i + 1) % 50 === 0 || i < 5) {
              console.log(`[${i + 1}/${thirdSemData.length}] ✅ Updated BBA: ${autonomousRollNo}`);
            }
          } else {
            results.notFound.push({
              index: i,
              autonomousRollNo,
              type: 'BBA',
              reason: 'Student not found in database'
            });
          }
        } else {
          // Update UG Student
          const updateData = {
            "Major-CP-5": record["Major-CP-5"] || null,
            "Major-CP-6": record["Major-CP-6"] || null,
            "Major-CP-7": record["Major-CP-7"] || null,
            "MINOR-3": record["MINOR-3"] || null,
            "Multi Disciplinary-3": record["Multi Disciplinary-3"] || null,
            "VAC-2": record["VAC-2"] || null,
            examCode: record.examCode || null
          };

          // Remove null values
          Object.keys(updateData).forEach(key => {
            if (updateData[key] === null) {
              delete updateData[key];
            }
          });

          const result = await UGStudent.updateOne(
            { "Autonomous Roll No": autonomousRollNo },
            { $set: updateData }
          );

          if (result.matchedCount > 0) {
            results.ugUpdated++;
            if ((i + 1) % 50 === 0 || i < 5) {
              console.log(`[${i + 1}/${thirdSemData.length}] ✅ Updated UG: ${autonomousRollNo}`);
            }
          } else {
            results.notFound.push({
              index: i,
              autonomousRollNo,
              type: 'UG',
              reason: 'Student not found in database'
            });
          }
        }

      } catch (error) {
        results.errors.push({
          index: i,
          autonomousRollNo: record["Autonomous Roll No"] || 'N/A',
          error: error.message
        });
        if ((i + 1) % 50 === 0 || i < 5) {
          console.log(`[${i + 1}/${thirdSemData.length}] ❌ Error: ${error.message}`);
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 3RD SEMESTER DATA UPDATE SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Records Processed: ${thirdSemData.length}`);
    console.log(`✅ UG Students Updated: ${results.ugUpdated}`);
    console.log(`✅ BBA Students Updated: ${results.bbaUpdated}`);
    console.log(`❌ Not Found: ${results.notFound.length}`);
    console.log(`❌ Errors: ${results.errors.length}`);
    console.log('='.repeat(70));

    if (results.notFound.length > 0) {
      console.log('\n❌ Not Found Records (showing first 20):');
      results.notFound.slice(0, 20).forEach((fail, idx) => {
        console.log(`   ${idx + 1}. ${fail.autonomousRollNo || fail.record} - ${fail.reason}`);
      });
      if (results.notFound.length > 20) {
        console.log(`   ... and ${results.notFound.length - 20} more`);
      }
    }

    if (results.errors.length > 0) {
      console.log('\n❌ Errors (showing first 10):');
      results.errors.slice(0, 10).forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.autonomousRollNo} - ${err.error}`);
      });
      if (results.errors.length > 10) {
        console.log(`   ... and ${results.errors.length - 10} more`);
      }
    }

    // Save results to file
    const resultsPath = path.join(__dirname, '../3rdsem-update-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Detailed results saved to: ${resultsPath}`);

    console.log('\n✅ 3rd semester data update completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run the update
if (require.main === module) {
  update3rdSemData();
}

module.exports = { update3rdSemData };

