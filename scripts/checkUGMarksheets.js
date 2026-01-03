const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const UGMarksheet = require('../models/UGMarksheet');

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

// Check UG marksheet data
const checkUGMarksheets = async () => {
  try {
    await connectDB();
    
    console.log('\n🔍 Checking UG Marksheet data...\n');
    
    const totalCount = await UGMarksheet.countDocuments();
    console.log(`📊 Total Marksheets: ${totalCount}`);
    
    const ugCount = await UGMarksheet.countDocuments({ studentType: 'UGStudent' });
    const bbaCount = await UGMarksheet.countDocuments({ studentType: 'BBAStudent' });
    const pgCount = await UGMarksheet.countDocuments({ studentType: 'PGStudent' });
    
    console.log(`\n📊 By Student Type:`);
    console.log(`   UG Student: ${ugCount}`);
    console.log(`   BBA Student: ${bbaCount}`);
    console.log(`   PG Student: ${pgCount}`);
    
    if (ugCount === 0) {
      console.log('\n❌ No UG marksheets found!');
      console.log('💡 You can restore them by running: node scripts/uploadFinalJson.js');
    } else {
      const sample = await UGMarksheet.findOne({ studentType: 'UGStudent' });
      if (sample) {
        console.log('\n📋 Sample UG Marksheet:');
        console.log(`   Student ID: ${sample.student}`);
        console.log(`   Semester: ${sample.semester}`);
        console.log(`   Courses: ${sample.courses?.length || 0}`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run
if (require.main === module) {
  checkUGMarksheets();
}

module.exports = { checkUGMarksheets };

