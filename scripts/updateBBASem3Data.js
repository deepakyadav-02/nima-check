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

// Update BBA students with semester 3 data from 3rdsem.json
const updateBBASem3Data = async () => {
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

    // Filter only BBA students (those with NACBBA in Autonomous Roll No or BBA in Roll No)
    const bbaRecords = thirdSemData.filter(record => {
      const autoRollNo = record["Autonomous Roll No"] || record.autonomousRollNo || '';
      const rollNo = record["Roll No"] || record.RollNo || '';
      return autoRollNo.includes('BBA') || rollNo.includes('BBA');
    });

    console.log(`📊 Found ${bbaRecords.length} BBA records in 3rdsem.json\n`);

    const results = {
      bbaModelUpdated: 0,
      ugModelUpdated: 0,
      notFoundInBBA: [],
      notFoundInUG: [],
      errors: []
    };

    console.log('🚀 Starting BBA semester 3 data update...\n');

    // Process each BBA record
    for (let i = 0; i < bbaRecords.length; i++) {
      const record = bbaRecords[i];
      
      try {
        const autonomousRollNo = record["Autonomous Roll No"] || record.autonomousRollNo;
        
        if (!autonomousRollNo) {
          results.errors.push({
            index: i,
            reason: 'Missing Autonomous Roll No'
          });
          continue;
        }

        // Prepare semester 3 update data
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
          if (updateData[key] === null || updateData[key] === undefined) {
            delete updateData[key];
          }
        });

        // Update BBAStudent model
        const bbaResult = await BBAStudent.updateOne(
          { "Autonomous Roll No": autonomousRollNo },
          { $set: updateData }
        );

        if (bbaResult.matchedCount > 0) {
          results.bbaModelUpdated++;
        } else {
          results.notFoundInBBA.push({
            autonomousRollNo,
            name: record["Name of the Students"] || 'N/A'
          });
        }

        // Update UGStudent model (for BBA students that are also in UG)
        const ugResult = await UGStudent.updateOne(
          { "Autonomous Roll No": autonomousRollNo },
          { $set: updateData }
        );

        if (ugResult.matchedCount > 0) {
          results.ugModelUpdated++;
        } else {
          results.notFoundInUG.push({
            autonomousRollNo,
            name: record["Name of the Students"] || 'N/A'
          });
        }

        if ((i + 1) % 5 === 0 || i < 3) {
          console.log(`[${i + 1}/${bbaRecords.length}] ✅ Updated: ${autonomousRollNo}`);
        }

      } catch (error) {
        results.errors.push({
          index: i,
          autonomousRollNo: record["Autonomous Roll No"] || 'N/A',
          error: error.message
        });
        if ((i + 1) % 5 === 0 || i < 3) {
          console.log(`[${i + 1}/${bbaRecords.length}] ❌ Error: ${error.message}`);
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 BBA SEMESTER 3 DATA UPDATE SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total BBA Records Processed: ${bbaRecords.length}`);
    console.log(`✅ BBAStudent Model Updated: ${results.bbaModelUpdated}`);
    console.log(`✅ UGStudent Model Updated: ${results.ugModelUpdated}`);
    console.log(`❌ Not Found in BBAStudent: ${results.notFoundInBBA.length}`);
    console.log(`❌ Not Found in UGStudent: ${results.notFoundInUG.length}`);
    console.log(`❌ Errors: ${results.errors.length}`);
    console.log('='.repeat(70));

    if (results.notFoundInBBA.length > 0) {
      console.log('\n❌ Not Found in BBAStudent Model (showing first 10):');
      results.notFoundInBBA.slice(0, 10).forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.autonomousRollNo} - ${item.name}`);
      });
      if (results.notFoundInBBA.length > 10) {
        console.log(`   ... and ${results.notFoundInBBA.length - 10} more`);
      }
    }

    if (results.notFoundInUG.length > 0) {
      console.log('\n⚠️  Not Found in UGStudent Model (showing first 10):');
      results.notFoundInUG.slice(0, 10).forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.autonomousRollNo} - ${item.name}`);
      });
      if (results.notFoundInUG.length > 10) {
        console.log(`   ... and ${results.notFoundInUG.length - 10} more`);
      }
    }

    if (results.errors.length > 0) {
      console.log('\n❌ Errors (showing first 10):');
      results.errors.slice(0, 10).forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.autonomousRollNo} - ${err.error || err.reason}`);
      });
      if (results.errors.length > 10) {
        console.log(`   ... and ${results.errors.length - 10} more`);
      }
    }

    // Show sample of updated data
    console.log('\n📋 Sample of updated data (first BBA student):');
    if (bbaRecords.length > 0) {
      const sample = bbaRecords[0];
      console.log(`   Autonomous Roll No: ${sample["Autonomous Roll No"]}`);
      console.log(`   CC-301: ${sample["CC-301"] || 'N/A'}`);
      console.log(`   CC-302: ${sample["CC-302"] || 'N/A'}`);
      console.log(`   CC-303: ${sample["CC-303"] || 'N/A'}`);
      console.log(`   MDE-301: ${sample["MDE-301"] || 'N/A'}`);
      console.log(`   SEC-301: ${sample["SEC-301"] || 'N/A'}`);
      console.log(`   VAC-301: ${sample["VAC-301"] || 'N/A'}`);
      console.log(`   examCode: ${sample.examCode || 'N/A'}`);
    }

    // Save results to file
    const resultsPath = path.join(__dirname, '../bba-sem3-update-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Detailed results saved to: ${resultsPath}`);

    console.log('\n✅ BBA semester 3 data update completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run the update
if (require.main === module) {
  updateBBASem3Data();
}

module.exports = { updateBBASem3Data };

