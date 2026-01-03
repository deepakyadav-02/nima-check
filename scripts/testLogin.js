const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const UGFirstSem2025 = require('../models/UGFirstSem2025');
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
    return conn.connection.db;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

// Test login query
const testLogin = async () => {
  try {
    await connectDB();
    
    console.log('\n🔍 Testing login queries...\n');
    
    // Get sample students
    const ugSample = await UGFirstSem2025.findOne({});
    const pgSample = await PGFirstSem2025.findOne({});
    
    if (ugSample) {
      console.log('📋 Sample UG First Sem 2025 student:');
      console.log(`   Autonomous Roll No: "${ugSample["Autonomous Roll No"]}"`);
      console.log(`   dob: "${ugSample.dob}"`);
      console.log(`   dob type: ${typeof ugSample.dob}`);
      console.log(`   dob === null: ${ugSample.dob === null}`);
      console.log(`   dob === undefined: ${ugSample.dob === undefined}`);
      
      // Test query
      const testQuery = {
        "Autonomous Roll No": ugSample["Autonomous Roll No"],
        dob: ugSample.dob
      };
      console.log(`\n   Testing query:`, JSON.stringify(testQuery, null, 2));
      
      const found = await UGFirstSem2025.findOne(testQuery);
      console.log(`   Found: ${found ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log('❌ No UG First Sem 2025 students found');
    }
    
    if (pgSample) {
      console.log('\n📋 Sample PG First Sem 2025 student:');
      console.log(`   Autonomous Roll No: "${pgSample["Autonomous Roll No"]}"`);
      console.log(`   dob: "${pgSample.dob}"`);
      console.log(`   dob type: ${typeof pgSample.dob}`);
      console.log(`   dob === null: ${pgSample.dob === null}`);
      console.log(`   dob === undefined: ${pgSample.dob === undefined}`);
      
      // Test query
      const testQuery = {
        "Autonomous Roll No": pgSample["Autonomous Roll No"],
        dob: pgSample.dob
      };
      console.log(`\n   Testing query:`, JSON.stringify(testQuery, null, 2));
      
      const found = await PGFirstSem2025.findOne(testQuery);
      console.log(`   Found: ${found ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log('❌ No PG First Sem 2025 students found');
    }
    
    // Check for students with null/undefined dob
    const ugWithNullDob = await UGFirstSem2025.countDocuments({ dob: null });
    const ugWithUndefinedDob = await UGFirstSem2025.countDocuments({ dob: { $exists: false } });
    const pgWithNullDob = await PGFirstSem2025.countDocuments({ dob: null });
    const pgWithUndefinedDob = await PGFirstSem2025.countDocuments({ dob: { $exists: false } });
    
    console.log('\n📊 DOB Statistics:');
    console.log(`   UG with null dob: ${ugWithNullDob}`);
    console.log(`   UG with undefined dob: ${ugWithUndefinedDob}`);
    console.log(`   PG with null dob: ${pgWithNullDob}`);
    console.log(`   PG with undefined dob: ${pgWithUndefinedDob}`);
    
    // Check total counts
    const ugTotal = await UGFirstSem2025.countDocuments();
    const pgTotal = await PGFirstSem2025.countDocuments();
    console.log(`\n📊 Total counts:`);
    console.log(`   UG First Sem 2025: ${ugTotal}`);
    console.log(`   PG First Sem 2025: ${pgTotal}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run
if (require.main === module) {
  testLogin();
}

module.exports = { testLogin };

