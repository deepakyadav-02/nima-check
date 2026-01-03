const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const UGStudent = require('../models/UGStudent');

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
    return conn.connection.db;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

// Check UG student data
const checkUGData = async () => {
  try {
    await connectDB();
    
    console.log('\n🔍 Checking UG Student data...\n');
    
    const totalCount = await UGStudent.countDocuments();
    console.log(`📊 Total UG Students: ${totalCount}`);
    
    if (totalCount > 0) {
      const sample = await UGStudent.findOne({});
      console.log('\n📋 Sample UG Student:');
      console.log(`   Autonomous Roll No: ${sample["Autonomous Roll No"]}`);
      console.log(`   Name: ${sample["Name of the Students"]}`);
      console.log(`   Department: ${sample.Department}`);
      
      // Count by department
      const byDept = await UGStudent.aggregate([
        { $group: { _id: "$Department", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      console.log('\n📊 Count by Department:');
      byDept.forEach(dept => {
        console.log(`   ${dept._id || 'N/A'}: ${dept.count}`);
      });
    } else {
      console.log('❌ No UG students found in database!');
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
  checkUGData();
}

module.exports = { checkUGData };

