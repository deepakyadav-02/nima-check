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

// Update BBA students with semester 2 data from bba_department.json
const updateBBASem2Fields = async () => {
  try {
    await connectDB();

    // Read bba_department.json
    const bbaDeptPath = path.join(__dirname, '../JSONS/bba_department.json');
    console.log('📄 Reading BBA department data from:', bbaDeptPath);
    
    if (!fs.existsSync(bbaDeptPath)) {
      console.error('❌ Error: bba_department.json not found at', bbaDeptPath);
      process.exit(1);
    }

    const bbaData = JSON.parse(fs.readFileSync(bbaDeptPath, 'utf8'));
    console.log(`📊 Total BBA records: ${bbaData.length}\n`);

    const results = {
      bbaModelUpdated: 0,
      ugModelUpdated: 0,
      notFoundInBBA: [],
      notFoundInUG: [],
      errors: []
    };

    console.log('🚀 Starting BBA semester 2 data update...\n');

    // Process each BBA record
    for (let i = 0; i < bbaData.length; i++) {
      const record = bbaData[i];
      
      try {
        const autonomousRollNo = record["Autonomous Roll No"];
        
        if (!autonomousRollNo) {
          results.errors.push({
            index: i,
            reason: 'Missing Autonomous Roll No'
          });
          continue;
        }

        // Prepare semester 2 update data
        const updateData = {
          "CC-201": record["CC-201"] || null,
          "CC-202": record["CC-202"] || null,
          "CC-203": record["CC-203"] || null,
          "Multi Disciplinary-201": record["Multi Disciplinary-201"] || null,
          "AEC-201": record["AEC-201"] || null,
          "SEC-201": record["SEC-201"] || null,
          "VAC-201-I.C": record["VAC-201-I.C"] || null
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
          console.log(`[${i + 1}/${bbaData.length}] ✅ Updated: ${autonomousRollNo}`);
        }

      } catch (error) {
        results.errors.push({
          index: i,
          autonomousRollNo: record["Autonomous Roll No"] || 'N/A',
          error: error.message
        });
        if ((i + 1) % 5 === 0 || i < 3) {
          console.log(`[${i + 1}/${bbaData.length}] ❌ Error: ${error.message}`);
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 BBA SEMESTER 2 DATA UPDATE SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total BBA Records Processed: ${bbaData.length}`);
    console.log(`✅ BBAStudent Model Updated: ${results.bbaModelUpdated}`);
    console.log(`✅ UGStudent Model Updated: ${results.ugModelUpdated}`);
    console.log(`❌ Not Found in BBAStudent: ${results.notFoundInBBA.length}`);
    console.log(`❌ Not Found in UGStudent: ${results.notFoundInUG.length}`);
    console.log(`❌ Errors: ${results.errors.length}`);
    console.log('='.repeat(70));

    // Verify by checking one student
    if (results.bbaModelUpdated > 0) {
      const sampleRollNo = bbaData[0]["Autonomous Roll No"];
      const verifyBBA = await BBAStudent.findOne({ "Autonomous Roll No": sampleRollNo });
      const verifyUG = await UGStudent.findOne({ "Autonomous Roll No": sampleRollNo });
      
      if (verifyBBA) {
        console.log('\n📋 Verification - BBAStudent sample:');
        console.log(`   CC-201: ${verifyBBA["CC-201"] || 'N/A'}`);
        console.log(`   CC-202: ${verifyBBA["CC-202"] || 'N/A'}`);
        console.log(`   CC-203: ${verifyBBA["CC-203"] || 'N/A'}`);
      }
      
      if (verifyUG) {
        console.log('\n📋 Verification - UGStudent sample:');
        console.log(`   CC-201: ${verifyUG["CC-201"] || 'N/A'}`);
        console.log(`   CC-202: ${verifyUG["CC-202"] || 'N/A'}`);
        console.log(`   CC-203: ${verifyUG["CC-203"] || 'N/A'}`);
      }
    }

    // Save results to file
    const resultsPath = path.join(__dirname, '../bba-sem2-update-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Detailed results saved to: ${resultsPath}`);

    console.log('\n✅ BBA semester 2 data update completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run the update
if (require.main === module) {
  updateBBASem2Fields();
}

module.exports = { updateBBASem2Fields };

